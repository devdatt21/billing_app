export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    const vendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
                { specialization: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(vendors);
  } catch {
    return NextResponse.json({ error: 'Failed to search vendors' }, { status: 500 });
  }
}
