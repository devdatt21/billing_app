export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CustomerSchema } from '@/lib/validations';
import { getUserFromHeaders } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = getUserFromHeaders(request);
    const validated = CustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        ...validated,
        createdBy: user?.userId || null,
        updatedBy: user?.userId || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; meta?: { target?: string[] } };
    if (err.code === 'P2002') {
      const target = err.meta?.target?.[0] || 'field';
      return NextResponse.json({ error: `${target} must be unique` }, { status: 409 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const q = searchParams.get('q')?.trim();
    const onlyActive = searchParams.get('onlyActive') === 'true';
    const skip = (page - 1) * limit;

    const whereClause = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { code: { contains: q, mode: 'insensitive' as const } },
              { gstin: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.customer.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
