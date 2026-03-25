export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

async function verifyTokenFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return await verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await verifyTokenFromRequest(request);  // Get user from request
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const q = searchParams.get('q')?.trim();
    const status = searchParams.get('status')?.trim();
    const stage = searchParams.get('stage')?.trim();
    const sourceType = searchParams.get('sourceType')?.trim();

    const skip = (page - 1) * limit;

    const where = {
      AND: [
        { isDeleted: false },
        { status: { not: 'CLOSED' as const } },
        { createdBy: user.userId },  // Row-level security: user only sees their own lots
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
