export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('onlyActive') === 'true';

    const vendors = await prisma.vendor.findMany({
      where: {
        createdBy: user.userId,
        isDeleted: false,
        ...(onlyActive ? { isActive: true } : {}),
      },
      select: {
        id: true,
        name: true,
        vendorType: true,
        specialization: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ vendors });
  } catch (error) {
    console.error('GET /api/vendors error:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body?.name ?? '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        vendorType: typeof body?.vendorType === 'string' ? body.vendorType.trim() : null,
        specialization: typeof body?.specialization === 'string' ? body.specialization.trim() : null,
        isActive: body?.isActive !== false,
        createdBy: user.userId,
        updatedBy: user.userId,
      },
      select: {
        id: true,
        name: true,
        vendorType: true,
        specialization: true,
        isActive: true,
      },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('POST /api/vendors error:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
