export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = Number(params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
    }

    const body = await request.json();
    const amount = new Prisma.Decimal(String(body?.amount ?? '0'));

    if (amount.lte(0)) {
      return NextResponse.json({ error: 'Payment amount must be greater than 0' }, { status: 400 });
    }

    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        createdBy: user.userId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        paymentNo: typeof body?.paymentNo === 'string' && body.paymentNo.trim()
          ? body.paymentNo.trim()
          : null,
        partyType: 'VENDOR',
        partyRefId: vendor.id,
        direction: 'OUTGOING',
        status: body?.status === 'PENDING' ? 'PENDING' : 'CLEARED',
        amount,
        paymentDate: body?.paymentDate ? new Date(String(body.paymentDate)) : new Date(),
        referenceNo: typeof body?.referenceNo === 'string' && body.referenceNo.trim()
          ? body.referenceNo.trim()
          : null,
        notes: typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        createdBy: user.userId,
        updatedBy: user.userId,
      },
    });

    return NextResponse.json(
      {
        id: payment.id,
        amount: payment.amount.toString(),
        status: payment.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/vendors/[id]/payments error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
