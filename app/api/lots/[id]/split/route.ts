export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

interface SplitChildInput {
  lotNo?: string;
  weight: string | number;
  notes?: string | null;
}

interface SplitPayload {
  children: SplitChildInput[];
  remarks?: string | null;
}

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function defaultChildLotNo(parentLotNo: string, index: number): string {
  return `${parentLotNo}-S${index}`;
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

    const id = parseId(params.id);
    if (!id) return NextResponse.json({ error: 'Invalid lot ID' }, { status: 400 });

    const body = (await request.json()) as SplitPayload;
    const children = body.children || [];

    if (!Array.isArray(children) || children.length === 0) {
      return NextResponse.json({ error: 'At least one child lot is required' }, { status: 400 });
    }

    const sourceLot = await prisma.lot.findUnique({ where: { id } });
    if (!sourceLot) return NextResponse.json({ error: 'Source lot not found' }, { status: 404 });

    const sourceCurrentWeight = new Decimal(sourceLot.currentWeight);
    if (sourceCurrentWeight.lte(0)) {
      return NextResponse.json({ error: 'Source lot has no available weight to split' }, { status: 400 });
    }

    const parsedChildren = children.map((child, idx) => {
      const weight = new Decimal(child.weight);
      if (weight.lte(0)) {
        throw new Error(`Child weight must be greater than 0 at position ${idx + 1}`);
      }

      return {
        lotNo: child.lotNo?.trim() || defaultChildLotNo(sourceLot.lotNo, idx + 1),
        weight,
        notes: child.notes?.trim() || null,
      };
    });

    const totalChildWeight = parsedChildren.reduce((sum, child) => sum.plus(child.weight), new Decimal(0));

    if (totalChildWeight.gt(sourceCurrentWeight)) {
      return NextResponse.json(
        {
          error: 'Child lot weight total cannot exceed source lot current weight',
          details: {
            sourceCurrentWeight: sourceCurrentWeight.toString(),
            requestedChildWeight: totalChildWeight.toString(),
          },
        },
        { status: 400 }
      );
    }

    const residualWeight = sourceCurrentWeight.minus(totalChildWeight);

    const result = await prisma.$transaction(async (tx) => {
      const updatedSource = await tx.lot.update({
        where: { id: sourceLot.id },
        data: {
          currentWeight: residualWeight,
          status: residualWeight.eq(0) ? 'CLOSED' : sourceLot.status,
          updatedBy: user?.userId || null,
        },
      });

      const createdChildren = [];
      for (const child of parsedChildren) {
        const createdChild = await tx.lot.create({
          data: {
            lotNo: child.lotNo,
            sourceType: 'SPLIT',
            parentLotId: sourceLot.id,
            initialWeight: child.weight,
            currentWeight: child.weight,
            status: 'IN_PROCESS',
            inventoryState: sourceLot.inventoryState,
            currentStage: sourceLot.currentStage,
            currentLocation: sourceLot.currentLocation,
            accumulatedCost: 0,
            notes: child.notes,
            createdBy: user?.userId || null,
            updatedBy: user?.userId || null,
          },
        });

        await tx.lotSplit.create({
          data: {
            sourceLotId: sourceLot.id,
            childLotId: createdChild.id,
            splitWeight: child.weight,
            residualAfterSplit: residualWeight,
            splitDate: new Date(),
            remarks: body.remarks || null,
            createdBy: user?.userId || null,
          },
        });

        createdChildren.push(createdChild);
      }

      return {
        sourceLot: updatedSource,
        childLots: createdChildren,
        summary: {
          sourceWeightBefore: sourceCurrentWeight.toString(),
          childWeightTotal: totalChildWeight.toString(),
          residualWeight: residualWeight.toString(),
        },
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; meta?: { target?: string[] } };
    if (err.code === 'P2002') {
      const target = err.meta?.target?.[0] || 'field';
      return NextResponse.json({ error: `${target} must be unique` }, { status: 409 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to split lot' }, { status: 500 });
  }
}
