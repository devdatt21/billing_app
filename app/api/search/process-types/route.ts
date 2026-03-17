export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    const processTypes = await prisma.processType.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              name: { contains: q, mode: 'insensitive' },
            }
          : {}),
      },
      take: limit,
      orderBy: [{ sequence: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(processTypes);
  } catch {
    return NextResponse.json({ error: 'Failed to search process types' }, { status: 500 });
  }
}
