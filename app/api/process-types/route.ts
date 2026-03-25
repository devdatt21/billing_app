export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProcessTypeSchema } from '@/lib/validations';
import { getUserFromHeaders } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validated = ProcessTypeSchema.parse(body);

    const processType = await prisma.processType.create({
      data: {
        ...validated,
        createdBy: user.userId,
        updatedBy: user.userId,
      },
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
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('onlyActive') === 'true';
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

    const processTypes = await prisma.processType.findMany({
      where: {
        createdBy: user.userId,
        isDeleted: false,
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: [{ sequence: 'asc' }, { name: 'asc' }],
      take: limit,
    });

    return NextResponse.json(processTypes);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch process types' }, { status: 500 });
  }
}
