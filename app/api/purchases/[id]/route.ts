export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid purchase ID' }, { status: 400 });

  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const purchase = await prisma.purchase.findFirst({
    where: { id, createdBy: user.userId, isDeleted: false },  // Row-level security
    include: {
      supplier: true,
      lots: {
        where: {
          isDeleted: false,
        },
        include: {
          costs: {
            where: {
              isDeleted: false,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
  return NextResponse.json(purchase);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ error: 'Invalid purchase ID' }, { status: 400 });

    const user = getUserFromHeaders(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const purchase = await prisma.purchase.findFirst({
      where: { id, createdBy: user.userId, isDeleted: false },
      select: { id: true },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const rootLots = await tx.lot.findMany({
        where: {
          sourcePurchaseId: purchase.id,
          createdBy: user.userId,
          isDeleted: false,
        },
        select: { id: true },
      });

      const lotIdSet = new Set(rootLots.map((l) => l.id));
      let frontier = [...lotIdSet];

      // Traverse full lot genealogy tree (purchase lots + all descendants).
      while (frontier.length > 0) {
        const children = await tx.lot.findMany({
          where: {
            parentLotId: { in: frontier },
            createdBy: user.userId,
            isDeleted: false,
          },
          select: { id: true },
        });

        const nextFrontier: number[] = [];
        for (const child of children) {
          if (!lotIdSet.has(child.id)) {
            lotIdSet.add(child.id);
            nextFrontier.push(child.id);
          }
        }
        frontier = nextFrontier;
      }

      const lotIds = [...lotIdSet];

      let processCount = 0;
      let costCount = 0;
      let splitCount = 0;
      let lotCount = 0;

      if (lotIds.length > 0) {
        const processesUpdate = await tx.lotProcess.updateMany({
          where: {
            lotId: { in: lotIds },
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: now,
            updatedBy: user.userId,
          },
        });
        processCount = processesUpdate.count;

        const costsUpdate = await tx.lotCost.updateMany({
          where: {
            lotId: { in: lotIds },
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: now,
          },
        });
        costCount = costsUpdate.count;

        const splitsUpdate = await tx.lotSplit.updateMany({
          where: {
            OR: [
              { sourceLotId: { in: lotIds } },
              { childLotId: { in: lotIds } },
            ],
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: now,
          },
        });
        splitCount = splitsUpdate.count;

        const lotsUpdate = await tx.lot.updateMany({
          where: {
            id: { in: lotIds },
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: now,
            status: 'CLOSED',
            updatedBy: user.userId,
          },
        });
        lotCount = lotsUpdate.count;
      }

      await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          isDeleted: true,
          deletedAt: now,
          updatedBy: user.userId,
        },
      });

      return {
        purchaseId: purchase.id,
        lotsSoftDeleted: lotCount,
        lotProcessesSoftDeleted: processCount,
        lotCostsSoftDeleted: costCount,
        lotSplitsSoftDeleted: splitCount,
      };
    });

    return NextResponse.json({
      message: 'Purchase and connected tree soft-deleted successfully.',
      summary: result,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to delete purchase' }, { status: 500 });
  }
}
