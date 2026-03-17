export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProcessTypeSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ProcessTypeSchema.parse(body);

    const processType = await prisma.processType.create({
      data: validated,
    });

    return NextResponse.json(processType, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Process type name must be unique' }, { status: 409 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create process type' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('onlyActive') === 'true';

    const processTypes = await prisma.processType.findMany({
      where: {
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: [{ sequence: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ processTypes });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch process types' }, { status: 500 });
  }
}
