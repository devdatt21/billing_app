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
        lot: { select: { id: true, currentStage: true, accumulatedCost: true, inventoryState: true, status: true, createdBy: true, isDeleted: true } },
      },
    });

    if (!existing || existing.isDeleted || existing.lotId !== lotId || existing.lot.isDeleted || existing.lot.createdBy !== user.userId) {
      return NextResponse.json({ error: 'Process record not found' }, { status: 404 });
    }

    const existingDates = existing as { processStartDate?: Date | null; processEndDate?: Date | null };

    if (existing.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Only IN_PROGRESS process can be edited' }, { status: 422 });
    }

    const latest = await prisma.lotProcess.findFirst({
      where: {
        lotId,
        status: { not: 'CANCELLED' },
        isDeleted: false,
      },
      orderBy: [{ processDate: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });

    if (!latest || latest.id !== processId) {
      return NextResponse.json({ error: 'Only latest process can be edited' }, { status: 422 });
    }

    const body = await request.json();

    const nextProcessTypeId = body.processTypeId ? parseId(String(body.processTypeId)) : existing.processTypeId;
    if (!nextProcessTypeId) {
      return NextResponse.json({ error: 'Process Type is required.' }, { status: 400 });
    }

    const nextProcessType = await prisma.processType.findFirst({
      where: { id: nextProcessTypeId, createdBy: user.userId, isDeleted: false },
      select: { id: true, name: true, stage: true, sequence: true, isActive: true },
    });
    if (!nextProcessType || !nextProcessType.isActive) {
      return NextResponse.json({ error: 'Process type not found or inactive' }, { status: 400 });
    }

    const stageRows = await prisma.processType.findMany({
      where: { createdBy: user.userId, isActive: true, isDeleted: false },
      select: { stage: true, sequence: true },
      orderBy: { sequence: 'asc' },
    });
    const stageSequenceMap = stageRows.reduce<Record<string, number>>((acc, row) => {
      if (acc[row.stage] == null || row.sequence < acc[row.stage]) acc[row.stage] = row.sequence;
      return acc;
    }, {});

    const previousProcess = await prisma.lotProcess.findFirst({
      where: {
        lotId,
        id: { not: processId },
        status: { not: 'CANCELLED' },
        isDeleted: false,
      },
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
      return NextResponse.json({ error: 'Input Weight must be greater than 0.' }, { status: 400 });
    }

    const outputWeight = new Decimal(String(body.outputWeight ?? existing.outputWeight));
    if (outputWeight.lt(0)) {
      return NextResponse.json({ error: 'Output Weight cannot be negative.' }, { status: 400 });
    }
    if (outputWeight.gt(inputWeight)) {
      return NextResponse.json({ error: 'Output Weight cannot exceed Input Weight.' }, { status: 400 });
    }

    const costAmount = new Decimal(String(body.costAmount ?? existing.costAmount));
    if (costAmount.lt(0)) {
      return NextResponse.json({ error: 'Cost Amount cannot be negative.' }, { status: 400 });
    }

    const vendorId = body.vendorId ? parseId(String(body.vendorId)) : null;
    if (body.vendorId && !vendorId) {
      return NextResponse.json({ error: 'Vendor is invalid.' }, { status: 400 });
    }
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
      if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 400 });
    }

    const processStartDate = body.processStartDate ? new Date(body.processStartDate) : (existingDates.processStartDate ?? existing.processDate);
    if (!processStartDate || isNaN(processStartDate.getTime())) {
      return NextResponse.json({ error: 'Start Date is required and must be valid.' }, { status: 400 });
    }

    const processDate = processStartDate;

    const processEndDate = body.processEndDate ? new Date(body.processEndDate) : (existingDates.processEndDate ?? null);
    if (body.processEndDate && (!processEndDate || isNaN(processEndDate.getTime()))) {
      return NextResponse.json({ error: 'End Date is invalid.' }, { status: 400 });
    }
    if (processEndDate && processEndDate < processStartDate) {
      return NextResponse.json({ error: 'End Date cannot be earlier than Start Date.' }, { status: 400 });
    }

    // Auto-complete if processEndDate is in past or today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const processStatus = processEndDate && new Date(processEndDate) <= today ? 'COMPLETED' : existing.status;

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
          processStartDate,
          processEndDate,
          status: processStatus,
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

      await tx.lotCost.updateMany({
        where: { lotId, sourceType: 'LOT_PROCESS', sourceRefId: processId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
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
  } catch {
    return NextResponse.json(
      { error: 'Unable to update process. Please review the entered values and try again.' },
      { status: 400 }
    );
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
      include: { processType: { select: { stage: true } }, lot: { select: { createdBy: true, isDeleted: true } } },
    });

    if (!existing || existing.isDeleted || existing.lotId !== lotId || existing.lot.isDeleted || existing.lot.createdBy !== user.userId) {
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
  } catch {
    return NextResponse.json(
      { error: 'Unable to update process status. Please try again.' },
      { status: 400 }
    );
  }
}

export async function DELETE(
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
        processType: { select: { stage: true } },
        lot: {
          select: {
            id: true,
            initialWeight: true,
            accumulatedCost: true,
          },
        },
      },
    });

    if (!existing || existing.lotId !== lotId) {
      return NextResponse.json({ error: 'Process record not found' }, { status: 404 });
    }

    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Process is already deleted.' }, { status: 422 });
    }

    const latest = await prisma.lotProcess.findFirst({
      where: {
        lotId,
        status: { not: 'CANCELLED' },
      },
      orderBy: [{ processDate: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });

    if (!latest || latest.id !== processId) {
      return NextResponse.json({ error: 'Only latest process can be deleted.' }, { status: 422 });
    }

    const previousProcess = await prisma.lotProcess.findFirst({
      where: {
        lotId,
        id: { not: processId },
        status: { not: 'CANCELLED' },
      },
      include: { processType: { select: { stage: true } } },
      orderBy: [{ processDate: 'desc' }, { id: 'desc' }],
    });

    const restoredWeight = previousProcess
      ? new Decimal(previousProcess.outputWeight).eq(0)
        ? new Decimal(previousProcess.inputWeight)
        : new Decimal(previousProcess.outputWeight)
      : new Decimal(existing.lot.initialWeight);

    const restoredStage = previousProcess?.processType.stage ?? 'CUTTING';
    const restoredInventoryState = previousProcess
      ? previousProcess.processType.stage === 'POLISHING'
        ? 'READY_POLISHED'
        : 'WIP'
      : 'ROUGH';
    const restoredStatus = previousProcess ? 'IN_PROCESS' : 'PURCHASED';

    const nextAccumulatedCost = new Decimal(existing.lot.accumulatedCost)
      .minus(existing.costAmount);

    const result = await prisma.$transaction(async (tx) => {
      await tx.lotCost.updateMany({
        where: { lotId, sourceType: 'LOT_PROCESS', sourceRefId: processId },
        data: {
          amount: new Decimal(0),
          remarks: 'Soft-deleted with process cancellation',
        },
      });

      await tx.lotProcess.update({
        where: { id: processId },
        data: {
          status: 'CANCELLED',
          remarks: existing.remarks
            ? `${existing.remarks} | Soft-deleted on ${new Date().toISOString()}`
            : `Soft-deleted on ${new Date().toISOString()}`,
          updatedBy: user.userId || null,
        },
      });

      await tx.lot.update({
        where: { id: lotId },
        data: {
          currentWeight: restoredWeight,
          currentStage: restoredStage,
          inventoryState: restoredInventoryState,
          status: restoredStatus,
          accumulatedCost: nextAccumulatedCost.lt(0) ? new Decimal(0) : nextAccumulatedCost,
          updatedBy: user.userId || null,
        },
      });

      return { deletedProcessId: processId, softDeleted: true };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Unable to delete process. Please try again.' },
      { status: 400 }
    );
  }
}
