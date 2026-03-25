export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { CreatePurchaseSchema } from '@/lib/validations';
import { getUserFromHeaders } from '@/lib/auth-helpers';

function normalizedLotNo(input?: string | null, purchaseNo?: string): string {
  if (input && input.trim()) return input.trim();
  const base = (purchaseNo || 'LOT').replace(/[^A-Za-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `LOT-${base}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = getUserFromHeaders(request);

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const validated = CreatePurchaseSchema.parse(body);

    const supplier = await prisma.supplier.findUnique({ where: { id: validated.supplierId } });
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const roughWeight = new Decimal(validated.roughWeight);
    const totalAmount = new Decimal(validated.totalAmount);
    if (roughWeight.lte(0)) {
      return NextResponse.json({ error: 'Rough weight must be greater than 0' }, { status: 400 });
    }
    if (totalAmount.lt(0)) {
      return NextResponse.json({ error: 'Total amount cannot be negative' }, { status: 400 });
    }

    const lotNo = normalizedLotNo(validated.lotNo, validated.purchaseNo);

    const created = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          purchaseNo: validated.purchaseNo,
          supplierId: validated.supplierId,
          purchaseDate: validated.purchaseDate,
          referenceNo: validated.referenceNo || null,
          roughWeight,
          totalAmount,
          status: validated.status || 'RECEIVED',
          remarks: validated.remarks || null,
          createdBy: user?.userId || null,
          updatedBy: user?.userId || null,
        },
      });

      const lot = await tx.lot.create({
        data: {
          lotNo,
          sourceType: 'PURCHASE',
          sourcePurchaseId: purchase.id,
          initialWeight: roughWeight,
          currentWeight: roughWeight,
          status: 'PURCHASED',
          inventoryState: 'ROUGH',
          currentStage: 'CUTTING',
          accumulatedCost: totalAmount,
          notes: validated.remarks || null,
          createdBy: user?.userId || null,
          updatedBy: user?.userId || null,
        },
      });

      await tx.lotCost.create({
        data: {
          lotId: lot.id,
          category: 'PURCHASE',
          sourceType: 'PURCHASE',
          sourceRefId: purchase.id,
          amount: totalAmount,
          costDate: validated.purchaseDate,
          remarks: validated.referenceNo || validated.remarks || null,
          createdBy: user?.userId || null,
        },
      });

      return tx.purchase.findUnique({
        where: { id: purchase.id },
        include: {
          supplier: true,
          lots: {
            include: {
              costs: true,
            },
          },
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; meta?: { target?: string[] } };
    if (err.code === 'P2002') {
      const target = err.meta?.target?.[0] || 'field';
      return NextResponse.json({ error: `${target} must be unique` }, { status: 409 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const q = searchParams.get('q')?.trim();
    const supplierIdRaw = searchParams.get('supplierId');
    const supplierId = supplierIdRaw ? parseInt(supplierIdRaw, 10) : undefined;
    const purchaseDateFrom = searchParams.get('purchaseDateFrom');
    const purchaseDateTo = searchParams.get('purchaseDateTo');
    const skip = (page - 1) * limit;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (purchaseDateFrom) {
      const from = new Date(`${purchaseDateFrom}T00:00:00.000Z`);
      if (!Number.isNaN(from.getTime())) {
        dateFilter.gte = from;
      }
    }
    if (purchaseDateTo) {
      const to = new Date(`${purchaseDateTo}T23:59:59.999Z`);
      if (!Number.isNaN(to.getTime())) {
        dateFilter.lte = to;
      }
    }

    const where = {
      createdBy: user.userId,  // Row-level security: user only sees their own purchases
      isDeleted: false,
      ...(supplierId ? { supplierId } : {}),
      ...(Object.keys(dateFilter).length ? { purchaseDate: dateFilter } : {}),
      ...(q
        ? {
            OR: [
              { purchaseNo: { contains: q, mode: 'insensitive' as const } },
              { referenceNo: { contains: q, mode: 'insensitive' as const } },
              { supplier: { name: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          supplier: true,
          lots: {
            where: {
              isDeleted: false,
            },
            select: {
              id: true,
              lotNo: true,
              initialWeight: true,
              currentWeight: true,
              status: true,
            },
          },
        },
      }),
      prisma.purchase.count({ where }),
    ]);

    return NextResponse.json({
      purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}
