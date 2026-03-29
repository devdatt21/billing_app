export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const parsedId = parseInt(q, 10);
    const idFilter = Number.isNaN(parsedId) ? undefined : parsedId;

    const lots = await prisma.lot.findMany({
      where: {
        createdBy: user.userId,
        isDeleted: false,
        ...(q
          ? {
              OR: [
                ...(idFilter ? [{ id: idFilter }] : []),
                { lotNo: { contains: q, mode: 'insensitive' } },
                { sourcePurchase: { purchaseNo: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        sourcePurchase: {
          select: {
            purchaseNo: true,
            purchaseDate: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: Math.min(limit, 25),
    });

    return NextResponse.json(
      lots.map((lot) => ({
        id: lot.id,
        name: lot.lotNo,
        lotNo: lot.lotNo,
        lotDate: lot.createdAt,
        purchaseDate: lot.sourcePurchase?.purchaseDate || null,
        sourcePurchaseNo: lot.sourcePurchase?.purchaseNo || null,
      }))
    );
  } catch {
    return NextResponse.json({ error: 'Failed to search lots' }, { status: 500 });
  }
}
