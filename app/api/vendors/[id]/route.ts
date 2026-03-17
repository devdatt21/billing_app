export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VendorSchema } from '@/lib/validations';
import { getUserFromHeaders } from '@/lib/auth-helpers';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });

  const vendor = await prisma.vendor.findFirst({ where: { id, isDeleted: false } });
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  return NextResponse.json(vendor);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });

    const existing = await prisma.vendor.findFirst({ where: { id, isDeleted: false } });
    if (!existing) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    const user = getUserFromHeaders(request);
    const body = await request.json();
    const validated = VendorSchema.parse(body);

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...validated,
        updatedBy: user?.userId || null,
      },
    });

    return NextResponse.json(vendor);
  } catch (error: unknown) {
    const err = error as { code?: string; meta?: { target?: string[] } };
    if (err.code === 'P2002') {
      const target = err.meta?.target?.[0] || 'field';
      return NextResponse.json({ error: `${target} must be unique` }, { status: 409 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });

  const vendor = await prisma.vendor.findFirst({
    where: { id, isDeleted: false },
    include: { lotProcesses: { select: { id: true }, take: 1 } },
  });

  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  if (vendor.lotProcesses.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete vendor with linked lot processes' },
      { status: 400 }
    );
  }

  await prisma.vendor.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
  return NextResponse.json({ message: 'Vendor deleted successfully' });
}
