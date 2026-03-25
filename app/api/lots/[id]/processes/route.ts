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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const lotId = parseId(params.id);
  if (!lotId) return NextResponse.json({ error: 'Invalid lot ID' }, { status: 400 });

  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const lot = await prisma.lot.findFirst({ where: { id: lotId, createdBy: user.userId, isDeleted: false }, select: { id: true } });
  if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });

  const processes = await prisma.lotProcess.findMany({
    where: {
      lotId,
      status: { not: 'CANCELLED' },
      isDeleted: false,
    },
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

    const lot = await prisma.lot.findFirst({ where: { id: lotId, createdBy: user.userId, isDeleted: false } });
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

    const latestProcess = await prisma.lotProcess.findFirst({
      where: {
        lotId,
        status: { not: 'CANCELLED' },
        isDeleted: false,
      },
      orderBy: [{ processDate: 'desc' }, { id: 'desc' }],
      select: { inputWeight: true, outputWeight: true, status: true },
    });

    const effectiveCurrentWeight = latestProcess
      && latestProcess.status === 'IN_PROGRESS'
      && new Decimal(latestProcess.outputWeight).eq(0)
      ? new Decimal(latestProcess.inputWeight)
      : currentWeight;

    const body = await request.json();
    const hasProvidedOutputWeight = body.outputWeight !== undefined
      && body.outputWeight !== null
      && String(body.outputWeight).trim() !== '';

    const processTypeId = parseId(String(body.processTypeId ?? ''));
    if (!processTypeId) {
      return NextResponse.json({ error: 'Process Type is required.' }, { status: 400 });
    }

    const ownedProcessType = await prisma.processType.findFirst({
      where: {
        id: processTypeId,
        createdBy: user.userId,
        isActive: true,
        isDeleted: false,
      },
      select: { id: true, stage: true, sequence: true, isActive: true },
    });
    if (!ownedProcessType || !ownedProcessType.isActive) {
      return NextResponse.json({ error: 'Process type not found or inactive' }, { status: 400 });
    }

    // Prevent backward stage movement (e.g., Sarin after Polishing)
    const stageSequenceRows = await prisma.processType.findMany({
      where: { createdBy: user.userId, isActive: true, isDeleted: false },
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
    const selectedStageSeq = stageSequenceMap[ownedProcessType.stage] ?? ownedProcessType.sequence;
    if (currentStageSeq != null && selectedStageSeq < currentStageSeq) {
      return NextResponse.json(
        {
          error: `Cannot move process backward from ${lot.currentStage} to ${ownedProcessType.stage}`,
        },
        { status: 422 }
      );
    }

    const inputWeight = new Decimal(String(body.inputWeight ?? '0'));
    if (inputWeight.lte(0)) {
      return NextResponse.json({ error: 'Input Weight must be greater than 0.' }, { status: 400 });
    }
    if (inputWeight.gt(effectiveCurrentWeight)) {
      return NextResponse.json(
        {
          error: 'Input Weight cannot exceed Current Lot Weight.',
          details: {
            lotCurrentWeight: effectiveCurrentWeight.toString(),
            inputWeight: inputWeight.toString(),
          },
        },
        { status: 400 }
      );
    }

    const outputWeight = new Decimal(String(hasProvidedOutputWeight ? body.outputWeight : '0'));
    if (outputWeight.lt(0)) {
      return NextResponse.json({ error: 'Output Weight cannot be negative.' }, { status: 400 });
    }
    if (outputWeight.gt(inputWeight)) {
      return NextResponse.json({ error: 'Output Weight cannot exceed Input Weight.' }, { status: 400 });
    }

    const lossWeight = inputWeight.minus(outputWeight);

    const vendorId = body.vendorId ? parseId(String(body.vendorId)) : null;
    if (body.vendorId && !vendorId) {
      return NextResponse.json({ error: 'Vendor is invalid.' }, { status: 400 });
    }

    // Validate vendor exists if provided
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
      if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 400 });
    }

    const processStartDate = body.processStartDate ? new Date(body.processStartDate) : null;
    if (!processStartDate || isNaN(processStartDate.getTime())) {
      return NextResponse.json({ error: 'Start Date is required and must be valid.' }, { status: 400 });
    }

    const processDate = processStartDate;

    // Do not allow process date before latest lot activity date (process/split timeline consistency)
    const [lastProcess, lastSplitOut, lastSplitIn] = await Promise.all([
      prisma.lotProcess.findFirst({
        where: {
          lotId,
          status: { not: 'CANCELLED' },
          isDeleted: false,
        },
        orderBy: { processDate: 'desc' },
        select: { processDate: true },
      }),
      prisma.lotSplit.findFirst({
        where: { sourceLotId: lotId, isDeleted: false },
        orderBy: { splitDate: 'desc' },
        select: { splitDate: true },
      }),
      prisma.lotSplit.findFirst({
        where: { childLotId: lotId, isDeleted: false },
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
          error: `Start date cannot be earlier than last activity date (${latestActivityDate.toISOString().slice(0, 10)})`,
        },
        { status: 422 }
      );
    }

    const costAmount = new Decimal(String(body.costAmount ?? '0'));
    if (costAmount.lt(0)) {
      return NextResponse.json({ error: 'Cost Amount cannot be negative.' }, { status: 400 });
    }

    const processEndDate = body.processEndDate ? new Date(body.processEndDate) : null;
    if (body.processEndDate && isNaN((processEndDate as Date).getTime())) {
      return NextResponse.json({ error: 'End Date is invalid.' }, { status: 400 });
    }
    if (processEndDate && processEndDate < processStartDate) {
      return NextResponse.json({ error: 'End Date cannot be earlier than Start Date.' }, { status: 400 });
    }

    const isExternalVendor = vendorId !== null;

    // Auto-complete if processEndDate is in past or today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const processStatus = processEndDate && new Date(processEndDate) <= today ? 'COMPLETED' : 'IN_PROGRESS';

    if (processStatus === 'COMPLETED' && !hasProvidedOutputWeight) {
      return NextResponse.json(
        { error: 'Output Weight is required when End Date is today or earlier.' },
        { status: 400 }
      );
    }

    if (processStatus === 'COMPLETED' && !inputWeight.equals(effectiveCurrentWeight)) {
      return NextResponse.json(
        { error: `Input Weight must match Current Lot Weight (${effectiveCurrentWeight.toString()}) for same-day completion.` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const process = await tx.lotProcess.create({
        data: {
          lotId,
          processTypeId,
          vendorId,
          status: processStatus,
          inputWeight,
          outputWeight,
          lossWeight,
          processDate,
          processStartDate,
          processEndDate,
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
          currentWeight: hasProvidedOutputWeight ? outputWeight : inputWeight,
          currentStage: ownedProcessType.stage,
          inventoryState: ownedProcessType.stage === 'POLISHING'
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
            category: stageToCostCategory(ownedProcessType.stage),
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
  } catch {
    return NextResponse.json(
      { error: 'Unable to save process. Please review the entered values and try again.' },
      { status: 400 }
    );
  }
}
