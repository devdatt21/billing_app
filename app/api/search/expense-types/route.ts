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

    const types = await prisma.expenseType.findMany({
      where: {
        createdBy: user.userId,
        isDeleted: false,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { normalizedName: { contains: q.toLowerCase(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        usageCount: true,
      },
    });

    return NextResponse.json(types);
  } catch {
    return NextResponse.json({ error: 'Failed to search expense types' }, { status: 500 });
  }
}
