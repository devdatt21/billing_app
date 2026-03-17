export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function dateOnlyValue(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const lotId = parseId(params.id);
  if (!lotId) return NextResponse.json({ error: 'Invalid lot ID' }, { status: 400 });

  const lot = await prisma.lot.findUnique({ where: { id: lotId }, select: { id: true } });
  if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });

  const processes = await prisma.lotProcess.findMany({
    where: { lotId },
    include: {
      processType: { select: { id: true, name: true, stage: true } },
      vendor: { select: { id: true, name: true } },
    },
    orderBy: { processDate: 'desc' },
  });

  return NextResponse.json(processes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const lotId = parseId(params.id);
    if (!lotId) return NextResponse.json({ error: 'Invalid lot ID' }, { status: 400 });

    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });

    if (lot.status === 'SOLD' || lot.status === 'CLOSED') {
      return NextResponse.json(
        { error: `Cannot record process on a ${lot.status.toLowerCase()} lot` },
        { status: 422 }
      );
    }

    const currentWeight = new Decimal(lot.currentWeight);
    if (currentWeight.lte(0)) {
      return NextResponse.json(
        { error: 'Lot has no available weight; cannot start a process' },
        { status: 422 }
      );
    }

    const body = await request.json();

    const processTypeId = parseId(String(body.processTypeId ?? ''));
    if (!processTypeId) {
      return NextResponse.json({ error: 'processTypeId is required' }, { status: 400 });
    }

    const processType = await prisma.processType.findUnique({
      where: { id: processTypeId },
      select: { id: true, stage: true, sequence: true, isActive: true },
    });
    if (!processType || !processType.isActive) {
      return NextResponse.json({ error: 'Process type not found or inactive' }, { status: 400 });
    }

    // Prevent backward stage movement (e.g., Sarin after Polishing)
    const stageSequenceRows = await prisma.processType.findMany({
      where: { isActive: true },
      select: { stage: true, sequence: true },
      orderBy: { sequence: 'asc' },
    });
    const stageSequenceMap = stageSequenceRows.reduce<Record<string, number>>((acc, row) => {
      if (acc[row.stage] == null || row.sequence < acc[row.stage]) {
        acc[row.stage] = row.sequence;
      }
      return acc;
    }, {});

    const currentStageSeq = stageSequenceMap[lot.currentStage];
    const selectedStageSeq = stageSequenceMap[processType.stage] ?? processType.sequence;
    if (currentStageSeq != null && selectedStageSeq < currentStageSeq) {
      return NextResponse.json(
        {
          error: `Cannot move process backward from ${lot.currentStage} to ${processType.stage}`,
        },
        { status: 422 }
      );
    }

    const inputWeight = new Decimal(String(body.inputWeight ?? '0'));
    if (inputWeight.lte(0)) {
      return NextResponse.json({ error: 'inputWeight must be greater than 0' }, { status: 400 });
    }
    if (inputWeight.gt(currentWeight)) {
      return NextResponse.json(
        {
          error: 'inputWeight cannot exceed lot current weight',
          details: {
            lotCurrentWeight: currentWeight.toString(),
            inputWeight: inputWeight.toString(),
          },
        },
        { status: 400 }
      );
    }

    const outputWeight = new Decimal(String(body.outputWeight ?? '0'));
    if (outputWeight.lt(0)) {
      return NextResponse.json({ error: 'outputWeight cannot be negative' }, { status: 400 });
    }
    if (outputWeight.gt(inputWeight)) {
      return NextResponse.json({ error: 'outputWeight cannot exceed inputWeight' }, { status: 400 });
    }

    const lossWeight = inputWeight.minus(outputWeight);

    const vendorId = body.vendorId ? parseId(String(body.vendorId)) : null;
    if (body.vendorId && !vendorId) {
      return NextResponse.json({ error: 'Invalid vendorId' }, { status: 400 });
    }

    // Validate vendor exists if provided
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
      if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 400 });
    }

    const processDate = body.processDate ? new Date(body.processDate) : new Date();
    if (isNaN(processDate.getTime())) {
      return NextResponse.json({ error: 'Invalid processDate' }, { status: 400 });
    }

    // Do not allow process date before latest lot activity date (process/split timeline consistency)
    const [lastProcess, lastSplitOut, lastSplitIn] = await Promise.all([
      prisma.lotProcess.findFirst({
        where: { lotId },
        orderBy: { processDate: 'desc' },
        select: { processDate: true },
      }),
      prisma.lotSplit.findFirst({
        where: { sourceLotId: lotId },
        orderBy: { splitDate: 'desc' },
        select: { splitDate: true },
      }),
      prisma.lotSplit.findFirst({
        where: { childLotId: lotId },
        orderBy: { splitDate: 'desc' },
        select: { splitDate: true },
      }),
    ]);

    const latestActivityDate = [
      lastProcess?.processDate,
      lastSplitOut?.splitDate,
      lastSplitIn?.splitDate,
    ]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (latestActivityDate && dateOnlyValue(processDate) < dateOnlyValue(latestActivityDate)) {
      return NextResponse.json(
        {
          error: `Process date cannot be earlier than last activity date (${latestActivityDate.toISOString().slice(0, 10)})`,
        },
        { status: 422 }
      );
    }

    const costAmount = new Decimal(String(body.costAmount ?? '0'));
    if (costAmount.lt(0)) {
      return NextResponse.json({ error: 'costAmount cannot be negative' }, { status: 400 });
    }

    const isExternalVendor = vendorId !== null;

    const result = await prisma.$transaction(async (tx) => {
      const process = await tx.lotProcess.create({
        data: {
          lotId,
          processTypeId,
          vendorId,
          status: 'IN_PROGRESS',
          inputWeight,
          outputWeight,
          lossWeight,
          processDate,
          costAmount,
          sentToVendorAt: isExternalVendor ? new Date() : null,
          remarks: body.remarks?.trim() || null,
          createdBy: user?.userId || null,
        },
        include: {
          processType: { select: { id: true, name: true, stage: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      // Update lot: currentWeight → outputWeight, stage → processType stage,
      // inventoryState → AT_VENDOR if external, else WIP; status → IN_PROCESS
      const updatedLot = await tx.lot.update({
        where: { id: lotId },
        data: {
          currentWeight: outputWeight,
          currentStage: processType.stage,
          inventoryState: processType.stage === 'POLISHING'
            ? 'READY_POLISHED'
            : isExternalVendor
              ? 'WIP'
              : lot.inventoryState,
          status: 'IN_PROCESS',
          accumulatedCost: new Decimal(lot.accumulatedCost).plus(costAmount),
          updatedBy: user?.userId || null,
        },
      });

      // Add cost entry to lot cost ledger
      if (costAmount.gt(0)) {
        await tx.lotCost.create({
          data: {
            lotId,
            category: stageToCostCategory(processType.stage),
            amount: costAmount,
            costDate: processDate,
            sourceType: 'LOT_PROCESS',
            sourceRefId: process.id,
            remarks: `Process: ${process.processType.name}`,
            createdBy: user?.userId || null,
          },
        });
      }

      return { process, updatedLot };
    });

    return NextResponse.json(result.process, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record process';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
