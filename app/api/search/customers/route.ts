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
    const limit = parseInt(searchParams.get('limit') || '10');

    const customers = await prisma.customer.findMany({
      where: {
        createdBy: user.userId,
        isDeleted: false,
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
                { gstin: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(customers);
  } catch {
    return NextResponse.json({ error: 'Failed to search customers' }, { status: 500 });
  }
}
