export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid purchase ID' }, { status: 400 });

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      lots: {
        include: {
          costs: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
  return NextResponse.json(purchase);
}
