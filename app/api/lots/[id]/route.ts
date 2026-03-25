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
  if (!id) return NextResponse.json({ error: 'Invalid lot ID' }, { status: 400 });

  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const lot = await prisma.lot.findFirst({
    where: { id, createdBy: user.userId, isDeleted: false },  // Row-level security
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
        where: { isDeleted: false },
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
        where: {
          isDeleted: false,
          childLot: {
            isDeleted: false,
          },
        },
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
        where: {
          isDeleted: false,
          sourceLot: {
            isDeleted: false,
          },
        },
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
        where: {
          isDeleted: false,
        },
        orderBy: { createdAt: 'desc' },
      },
      processes: {
        where: {
          status: { not: 'CANCELLED' },
          isDeleted: false,
        },
        include: {
          processType: {
            select: { id: true, name: true, stage: true, color: true },
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

export async function DELETE(
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

    const lot = await prisma.lot.findFirst({
      where: { id, createdBy: user.userId, isDeleted: false },
      select: {
        id: true,
        lotNo: true,
        status: true,
        notes: true,
      },
    });

    if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 });

    const activeChildLots = await prisma.lot.count({
      where: {
        parentLotId: lot.id,
        isDeleted: false,
      },
    });

    if (activeChildLots > 0) {
      return NextResponse.json(
        { error: 'Cannot delete this parent lot because child lots exist. Delete child lots first.' },
        { status: 422 }
      );
    }

    const deletedStamp = `Deleted on ${new Date().toISOString()} by user ${user.userId}`;
    const nextNotes = lot.notes ? `${lot.notes}\n${deletedStamp}` : deletedStamp;

    await prisma.lot.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'CLOSED',
        notes: nextNotes,
        updatedBy: user.userId || null,
      },
    });

    return NextResponse.json({ success: true, message: 'Lot deleted successfully.' });
  } catch {
    return NextResponse.json({ error: 'Unable to delete lot. Please try again.' }, { status: 400 });
  }
}
