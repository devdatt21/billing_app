export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

async function ensureDefaultProcessTypes() {
  const count = await prisma.processType.count({ where: { isActive: true } });
  if (count > 0) return;

  await prisma.$transaction(
    DEFAULT_PROCESS_TYPES.map((item) =>
      prisma.processType.upsert({
        where: { name: item.name },
        update: {
          stage: item.stage,
          sequence: item.sequence,
          isActive: true,
          description: item.description,
        },
        create: {
          ...item,
          isActive: true,
        },
      })
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultProcessTypes();

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
