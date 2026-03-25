export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CustomerSchema } from '@/lib/validations';
import { getUserFromHeaders } from '@/lib/auth-helpers';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });

  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const customer = await prisma.customer.findFirst({ where: { id, isDeleted: false, createdBy: user.userId } });  // Row-level security
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });

    const user = getUserFromHeaders(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const existing = await prisma.customer.findFirst({ where: { id, isDeleted: false, createdBy: user.userId } });  // Row-level security
    if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const body = await request.json();
    const validated = CustomerSchema.parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...validated,
        updatedBy: user?.userId || null,
      },
    });

    return NextResponse.json(customer);
  } catch (error: unknown) {
    const err = error as { code?: string; meta?: { target?: string[] } };
    if (err.code === 'P2002') {
      const target = err.meta?.target?.[0] || 'field';
      return NextResponse.json({ error: `${target} must be unique` }, { status: 409 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });

  const user = getUserFromHeaders(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const customer = await prisma.customer.findFirst({
    where: { id, isDeleted: false, createdBy: user.userId },  // Row-level security
    include: { sales: { select: { id: true }, take: 1 } },
  });

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  if (customer.sales.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete customer with sales records' },
      { status: 400 }
    );
  }

  await prisma.customer.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
  return NextResponse.json({ message: 'Customer deleted successfully' });
}
