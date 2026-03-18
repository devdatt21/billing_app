export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const q = searchParams.get('q')?.trim();
    const status = searchParams.get('status')?.trim();
    const stage = searchParams.get('stage')?.trim();
    const sourceType = searchParams.get('sourceType')?.trim();

    const skip = (page - 1) * limit;

    const where = {
      AND: [
        { status: { not: 'CLOSED' as const } },
        ...(status
          ? [{ status: status as 'PURCHASED' | 'IN_PROCESS' | 'AT_VENDOR' | 'READY' | 'SOLD' | 'CLOSED' | 'HOLD' }]
          : []),
        ...(stage
          ? [{ currentStage: stage as 'CUTTING' | 'SARIN_MEASUREMENT' | 'POLISHING' | 'READY_INVENTORY' | 'SOLD' }]
          : []),
        ...(sourceType
          ? [{ sourceType: sourceType as 'PURCHASE' | 'SPLIT' | 'ADJUSTMENT' }]
          : []),
        ...(q
          ? [{
              OR: [
                { lotNo: { contains: q, mode: 'insensitive' as const } },
                { sourcePurchase: { purchaseNo: { contains: q, mode: 'insensitive' as const } } },
              ],
            }]
          : []),
      ],
    };

    const [lots, total] = await Promise.all([
      prisma.lot.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          parentLot: {
            select: {
              id: true,
              lotNo: true,
            },
          },
          sourcePurchase: {
            select: {
              id: true,
              purchaseNo: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              childLots: true,
            },
          },
        },
      }),
      prisma.lot.count({ where }),
    ]);

    return NextResponse.json({
      lots,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch lots' }, { status: 500 });
  }
}
