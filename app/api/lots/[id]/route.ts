export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid lot ID' }, { status: 400 });

  const lot = await prisma.lot.findUnique({
    where: { id },
    include: {
      sourcePurchase: {
        select: {
          id: true,
          purchaseNo: true,
          purchaseDate: true,
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      parentLot: {
        select: {
          id: true,
          lotNo: true,
          currentWeight: true,
          status: true,
        },
      },
      childLots: {
        select: {
          id: true,
          lotNo: true,
          initialWeight: true,
          currentWeight: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      splitAsSource: {
        include: {
          childLot: {
            select: {
              id: true,
              lotNo: true,
              currentWeight: true,
              status: true,
            },
          },
        },
        orderBy: { splitDate: 'desc' },
      },
      splitAsChild: {
        include: {
          sourceLot: {
            select: {
              id: true,
              lotNo: true,
              currentWeight: true,
              status: true,
            },
          },
        },
        orderBy: { splitDate: 'desc' },
      },
      costs: {
        orderBy: { createdAt: 'desc' },
      },
      processes: {
        include: {
          processType: {
            select: { id: true, name: true, stage: true },
          },
          vendor: {
            select: { id: true, name: true },
          },
        },
        orderBy: { processDate: 'desc' },
      },
    },
  });

  if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
  return NextResponse.json(lot);
}
