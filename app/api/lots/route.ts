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
      return {
        id: lot.id,
        lotNumber: lot.lotNo,
        name: lot.notes || lot.lotNo,
        purchaseId: lot.sourcePurchaseId,
        initialWeight: lot.initialWeight.toString(),
        availableWeight: lot.availableWeight.toString(),
        inProcessWeight: lot.inProcessWeight.toString(),
        finishedWeight: '0',
        lostWeight: lot.lostWeight.toString(),
        purchaseCost: lot.purchaseCost.toString(),
        totalLaborCost: lot.totalLaborCost.toString(),
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
          availableWeight: new Prisma.Decimal(initialWeight.toString()),
          status: 'PURCHASED',
          inventoryState: 'ROUGH',
          currentStage: 'CUTTING',
          purchaseCost: new Prisma.Decimal(purchaseCost.toString()),
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

      await tx.materialMovement.create({
        data: {
          lotId: created.id,
          movementType: 'PURCHASE',
          fromBucket: 'SUPPLIER',
          toBucket: 'SAFE',
          weight: new Prisma.Decimal(initialWeight.toString()),
        },
      });

      if (purchaseCost.gt(0)) {
        await tx.costMovement.create({
          data: {
            lotId: created.id,
            costType: 'PURCHASE_COST',
            amount: new Prisma.Decimal(purchaseCost.toString()),
          },
        });
      }

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
          availableWeight: lot.availableWeight.toString(),
          inProcessWeight: '0.000',
          finishedWeight: '0.000',
          lostWeight: '0.000',
          purchaseCost: lot.purchaseCost.toString(),
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
