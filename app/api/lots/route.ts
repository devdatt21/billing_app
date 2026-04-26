export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { CreateManufacturingLotSchema } from '@/lib/validations';
import { makeLotNumber, toDecimal } from '@/lib/manufacturing';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const lots = await prisma.lot.findMany({
      where: { createdBy: user.userId, isDeleted: false },
      include: {
        processes: {
          where: { isDeleted: false },
          include: { vendor: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = lots.map((lot) => {
      const inProcessWeight = lot.processes.reduce((acc, process) => {
        const issued = Number(process.inputWeight);
        const returned = Number(process.outputWeight) + Number(process.lossWeight);
        return acc + Math.max(issued - returned, 0);
      }, 0);

      const totalLaborCost = lot.processes.reduce((acc, process) => {
        return acc + Number(process.costAmount);
      }, 0);

      return {
        id: lot.id,
        lotNumber: lot.lotNo,
        name: lot.notes || lot.lotNo,
        purchaseId: lot.sourcePurchaseId,
        initialWeight: lot.initialWeight.toString(),
        availableWeight: lot.currentWeight.toString(),
        inProcessWeight: inProcessWeight.toFixed(3),
        finishedWeight: '0',
        lostWeight: lot.processes
          .reduce((acc, process) => acc + Number(process.lossWeight), 0)
          .toFixed(3),
        purchaseCost: lot.accumulatedCost.toString(),
        totalLaborCost: totalLaborCost.toFixed(2),
        createdAt: lot.createdAt,
        updatedAt: lot.updatedAt,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/lots error:', error);
    return NextResponse.json({ error: 'Failed to fetch lots' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateManufacturingLotSchema.parse(body);

    const initialWeight = toDecimal(validated.initialWeight, 'initial weight');
    const purchaseCost = toDecimal(validated.purchaseCost, 'purchase cost');

    if (initialWeight.lte(0)) {
      return NextResponse.json({ error: 'Initial weight must be greater than 0' }, { status: 400 });
    }

    if (purchaseCost.lt(0)) {
      return NextResponse.json({ error: 'Purchase cost cannot be negative' }, { status: 400 });
    }

    const lot = await prisma.$transaction(async (tx) => {
      const created = await tx.lot.create({
        data: {
          lotNo: makeLotNumber(validated.lotNumber),
          sourceType: validated.purchaseId ? 'PURCHASE' : 'ADJUSTMENT',
          sourcePurchaseId: validated.purchaseId ?? null,
          initialWeight: new Prisma.Decimal(initialWeight.toString()),
          currentWeight: new Prisma.Decimal(initialWeight.toString()),
          status: 'PURCHASED',
          inventoryState: 'ROUGH',
          currentStage: 'CUTTING',
          accumulatedCost: new Prisma.Decimal(purchaseCost.toString()),
          notes: validated.name,
          createdBy: user.userId,
          updatedBy: user.userId,
        },
      });

      await tx.lotCost.create({
        data: {
          lotId: created.id,
          category: 'PURCHASE',
          sourceType: 'LOT_CREATE',
          amount: new Prisma.Decimal(purchaseCost.toString()),
          costDate: new Date(),
          remarks: 'Initial purchase cost',
          createdBy: user.userId,
        },
      });

      return created;
    });

    return NextResponse.json(
      {
        data: {
          id: lot.id,
          lotNumber: lot.lotNo,
          name: lot.notes || lot.lotNo,
          purchaseId: lot.sourcePurchaseId,
          initialWeight: lot.initialWeight.toString(),
          availableWeight: lot.currentWeight.toString(),
          inProcessWeight: '0.000',
          finishedWeight: '0.000',
          lostWeight: '0.000',
          purchaseCost: lot.accumulatedCost.toString(),
          totalLaborCost: '0.00',
          createdAt: lot.createdAt,
          updatedAt: lot.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/lots error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create lot' }, { status: 500 });
  }
}
