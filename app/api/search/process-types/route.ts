export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

const DEFAULT_PROCESS_TYPES = [
  {
    name: 'Cutting',
    stage: 'CUTTING' as const,
    sequence: 1,
    description: 'Primary rough cutting process',
  },
  {
    name: 'Sarin Measurement',
    stage: 'SARIN_MEASUREMENT' as const,
    sequence: 2,
    description: 'Sarin scan and measurement',
  },
  {
    name: 'Polishing',
    stage: 'POLISHING' as const,
    sequence: 3,
    description: 'Final polishing and finish',
  },
  {
    name: 'Ready Inventory',
    stage: 'READY_INVENTORY' as const,
    sequence: 4,
    description: 'Marked ready for inventory',
  },
  {
    name: 'Sold',
    stage: 'SOLD' as const,
    sequence: 5,
    description: 'Marked as sold',
  },
];

async function ensureDefaultProcessTypes(userId: number) {
  const count = await prisma.processType.count({ where: { createdBy: userId, isActive: true, isDeleted: false } });
  if (count > 0) return;

  await prisma.$transaction(
    DEFAULT_PROCESS_TYPES.map((item) =>
      prisma.processType.upsert({
        where: { createdBy_name: { createdBy: userId, name: item.name } },
        update: {
          stage: item.stage,
          sequence: item.sequence,
          isActive: true,
          isDeleted: false,
          deletedAt: null,
          description: item.description,
          updatedBy: userId,
        },
        create: {
          ...item,
          isActive: true,
          createdBy: userId,
          updatedBy: userId,
        },
      })
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await ensureDefaultProcessTypes(user.userId);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    const processTypes = await prisma.processType.findMany({
      where: {
        createdBy: user.userId,
        isActive: true,
        isDeleted: false,
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
