export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProcessTypeSchema } from '@/lib/validations';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid process type ID' }, { status: 400 });

  const processType = await prisma.processType.findUnique({ where: { id } });
  if (!processType) return NextResponse.json({ error: 'Process type not found' }, { status: 404 });
  return NextResponse.json(processType);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ error: 'Invalid process type ID' }, { status: 400 });

    const existing = await prisma.processType.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Process type not found' }, { status: 404 });

    const body = await request.json();
    const validated = ProcessTypeSchema.parse(body);

    const processType = await prisma.processType.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(processType);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Process type name must be unique' }, { status: 409 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update process type' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid process type ID' }, { status: 400 });

  const processType = await prisma.processType.findUnique({
    where: { id },
    include: { lotProcesses: { select: { id: true }, take: 1 } },
  });

  if (!processType) return NextResponse.json({ error: 'Process type not found' }, { status: 404 });
  if (processType.lotProcesses.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete process type linked to lot processes' },
      { status: 400 }
    );
  }

  await prisma.processType.delete({ where: { id } });
  return NextResponse.json({ message: 'Process type deleted successfully' });
}
