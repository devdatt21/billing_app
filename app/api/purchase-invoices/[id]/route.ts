export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { id: parseInt(params.id), isDeleted: false },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Purchase invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Find invoice
    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { id: parseInt(params.id), isDeleted: false },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Purchase invoice not found' },
        { status: 404 }
      );
    }

    // Soft-delete invoice (preserve file for possible recovery)
    await prisma.purchaseInvoice.update({
      where: { id: parseInt(params.id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      } as unknown as Prisma.PurchaseInvoiceUpdateInput,
    });

    return NextResponse.json(
      { message: 'Purchase invoice deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase invoice' },
      { status: 500 }
    );
  }
}
