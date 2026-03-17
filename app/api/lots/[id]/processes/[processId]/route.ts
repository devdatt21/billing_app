export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

type CostCategory = 'PURCHASE' | 'CUTTING' | 'SARIN' | 'POLISHING' | 'CERTIFICATION' | 'MISC';

function stageToCostCategory(stage: string): CostCategory {
  const map: Record<string, CostCategory> = {
    CUTTING: 'CUTTING',
    SARIN_MEASUREMENT: 'SARIN',
    POLISHING: 'POLISHING',
  };
  return map[stage] ?? 'MISC';
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; processId: string } }
) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const lotId = parseId(params.id);
    const processId = parseId(params.processId);
    if (!lotId || !processId) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const existing = await prisma.lotProcess.findUnique({
      where: { id: processId },
      include: {
        processType: { select: { id: true, stage: true, sequence: true } },
        lot: { select: { id: true, currentStage: true, accumulatedCost: true, inventoryState: true, status: true } },
      },
    });

    if (!existing || existing.lotId !== lotId) {
      return NextResponse.json({ error: 'Process record not found' }, { status: 404 });
    }

    if (existing.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Only IN_PROGRESS process can be edited' }, { status: 422 });
    }

    const latest = await prisma.lotProcess.findFirst({
      where: { lotId },
      orderBy: [{ processDate: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });

    if (!latest || latest.id !== processId) {
      return NextResponse.json({ error: 'Only latest process can be edited' }, { status: 422 });
    }

    const body = await request.json();

    const nextProcessTypeId = body.processTypeId ? parseId(String(body.processTypeId)) : existing.processTypeId;
    if (!nextProcessTypeId) {
      return NextResponse.json({ error: 'processTypeId is required' }, { status: 400 });
    }

    const nextProcessType = await prisma.processType.findUnique({
      where: { id: nextProcessTypeId },
      select: { id: true, name: true, stage: true, sequence: true, isActive: true },
    });
    if (!nextProcessType || !nextProcessType.isActive) {
      return NextResponse.json({ error: 'Process type not found or inactive' }, { status: 400 });
    }

    const stageRows = await prisma.processType.findMany({
      where: { isActive: true },
      select: { stage: true, sequence: true },
      orderBy: { sequence: 'asc' },
    });
    const stageSequenceMap = stageRows.reduce<Record<string, number>>((acc, row) => {
      if (acc[row.stage] == null || row.sequence < acc[row.stage]) acc[row.stage] = row.sequence;
      return acc;
    }, {});

    const previousProcess = await prisma.lotProcess.findFirst({
      where: { lotId, id: { not: processId } },
      include: { processType: { select: { stage: true } } },
      orderBy: [{ processDate: 'desc' }, { id: 'desc' }],
    });

    const previousStage = previousProcess?.processType.stage;
    const previousStageSeq = previousStage ? stageSequenceMap[previousStage] : undefined;
    const selectedStageSeq = stageSequenceMap[nextProcessType.stage] ?? nextProcessType.sequence;
    if (previousStageSeq != null && selectedStageSeq < previousStageSeq) {
      return NextResponse.json(
        { error: `Cannot move process backward from ${previousStage} to ${nextProcessType.stage}` },
        { status: 422 }
      );
    }

    const inputWeight = new Decimal(String(body.inputWeight ?? existing.inputWeight));
    if (inputWeight.lte(0)) {
      return NextResponse.json({ error: 'inputWeight must be greater than 0' }, { status: 400 });
    }

    const outputWeight = new Decimal(String(body.outputWeight ?? existing.outputWeight));
    if (outputWeight.lt(0)) {
      return NextResponse.json({ error: 'outputWeight cannot be negative' }, { status: 400 });
    }
    if (outputWeight.gt(inputWeight)) {
      return NextResponse.json({ error: 'outputWeight cannot exceed inputWeight' }, { status: 400 });
    }

    const costAmount = new Decimal(String(body.costAmount ?? existing.costAmount));
    if (costAmount.lt(0)) {
      return NextResponse.json({ error: 'costAmount cannot be negative' }, { status: 400 });
    }

    const vendorId = body.vendorId ? parseId(String(body.vendorId)) : null;
    if (body.vendorId && !vendorId) {
      return NextResponse.json({ error: 'Invalid vendorId' }, { status: 400 });
    }
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
      if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 400 });
    }

    const processDate = body.processDate ? new Date(body.processDate) : existing.processDate;
    if (isNaN(processDate.getTime())) {
      return NextResponse.json({ error: 'Invalid processDate' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedProcess = await tx.lotProcess.update({
        where: { id: processId },
        data: {
          processTypeId: nextProcessTypeId,
          vendorId,
          inputWeight,
          outputWeight,
          lossWeight: inputWeight.minus(outputWeight),
          costAmount,
          processDate,
          remarks: body.remarks?.trim() ?? existing.remarks,
          updatedBy: user?.userId || null,
        },
        include: {
          processType: { select: { id: true, name: true, stage: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      const updatedAccumulatedCost = new Decimal(existing.lot.accumulatedCost)
        .minus(existing.costAmount)
        .plus(costAmount);

      await tx.lot.update({
        where: { id: lotId },
        data: {
          currentWeight: outputWeight,
          currentStage: nextProcessType.stage,
          inventoryState: nextProcessType.stage === 'POLISHING'
            ? 'READY_POLISHED'
            : vendorId
              ? 'WIP'
              : existing.lot.inventoryState,
          accumulatedCost: updatedAccumulatedCost,
          updatedBy: user?.userId || null,
        },
      });

      await tx.lotCost.deleteMany({
        where: { lotId, sourceType: 'LOT_PROCESS', sourceRefId: processId },
      });

      if (costAmount.gt(0)) {
        await tx.lotCost.create({
          data: {
            lotId,
            category: stageToCostCategory(nextProcessType.stage),
            amount: costAmount,
            costDate: processDate,
            sourceType: 'LOT_PROCESS',
            sourceRefId: processId,
            remarks: `Process: ${nextProcessType.name}`,
            createdBy: user?.userId || null,
          },
        });
      }

      return updatedProcess;
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to edit process';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// PATCH /api/lots/[id]/processes/[processId]
// Body: { action: 'complete' | 'cancel', outputWeight?, returnedAt?, remarks? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; processId: string } }
) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const lotId = parseId(params.id);
    const processId = parseId(params.processId);
    if (!lotId || !processId) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const existing = await prisma.lotProcess.findUnique({
      where: { id: processId },
      include: { processType: { select: { stage: true } } },
    });

    if (!existing || existing.lotId !== lotId) {
      return NextResponse.json({ error: 'Process record not found' }, { status: 404 });
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      return NextResponse.json(
        { error: `Process is already ${existing.status.toLowerCase()}` },
        { status: 422 }
      );
    }

    const body = await request.json();
    const action: string = body.action ?? 'complete';

    if (action === 'cancel') {
      const updated = await prisma.lotProcess.update({
        where: { id: processId },
        data: {
          status: 'CANCELLED',
          remarks: body.remarks?.trim() || existing.remarks,
          updatedBy: user?.userId || null,
        },
        include: {
          processType: { select: { id: true, name: true, stage: true } },
          vendor: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json(updated);
    }

    // action === 'complete'
    const returnedAt = body.returnedAt ? new Date(body.returnedAt) : new Date();
    if (isNaN(returnedAt.getTime())) {
      return NextResponse.json({ error: 'Invalid returnedAt date' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.lotProcess.update({
        where: { id: processId },
        data: {
          status: 'COMPLETED',
          returnedAt,
          remarks: body.remarks?.trim() || existing.remarks,
          updatedBy: user?.userId || null,
        },
        include: {
          processType: { select: { id: true, name: true, stage: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      // Return lot to IN_HOUSE inventory state if it was with vendor
      const lot = await tx.lot.findUnique({ where: { id: lotId }, select: { inventoryState: true } });
      if (lot) {
        await tx.lot.update({
          where: { id: lotId },
          data: {
            inventoryState: 'WIP',
            updatedBy: user?.userId || null,
          },
        });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update process';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
