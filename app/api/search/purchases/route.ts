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

    const purchases = await prisma.purchase.findMany({
      where: {
        createdBy: user.userId,
        isDeleted: false,
        ...(q
          ? {
              OR: [
                ...(idFilter ? [{ id: idFilter }] : []),
                { purchaseNo: { contains: q, mode: 'insensitive' } },
                { referenceNo: { contains: q, mode: 'insensitive' } },
                { supplier: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        supplier: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ purchaseDate: 'desc' }, { id: 'desc' }],
      take: Math.min(limit, 25),
    });

    return NextResponse.json(
      purchases.map((purchase) => ({
        id: purchase.id,
        name: purchase.purchaseNo,
        purchaseNo: purchase.purchaseNo,
        purchaseDate: purchase.purchaseDate,
        supplierName: purchase.supplier?.name || null,
      }))
    );
  } catch {
    return NextResponse.json({ error: 'Failed to search purchases' }, { status: 500 });
  }
}
