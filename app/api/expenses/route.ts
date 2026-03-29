export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ExpenseSchema } from '@/lib/validations';
import { getUserFromHeaders } from '@/lib/auth-helpers';

function normalizeExpenseTypeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function resolveExpenseTypeId(
  userId: number,
  payload: { expenseTypeId?: number; expenseTypeName?: string }
): Promise<number> {
  if (payload.expenseTypeId) {
    const existing = await prisma.expenseType.findFirst({
      where: {
        id: payload.expenseTypeId,
        createdBy: userId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new Error('Expense type not found');
    }

    return existing.id;
  }

  const name = payload.expenseTypeName?.trim();
  if (!name) {
    throw new Error('Expense type is required');
  }

  const normalizedName = normalizeExpenseTypeName(name);

  const existing = await prisma.expenseType.findFirst({
    where: {
      createdBy: userId,
      normalizedName,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.expenseType.create({
    data: {
      name,
      normalizedName,
      createdBy: userId,
    },
    select: { id: true },
  });

  return created.id;
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validated = ExpenseSchema.parse(body);

    const expenseTypeId = await resolveExpenseTypeId(user.userId, validated);

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          expenseDate: validated.expenseDate,
          amount: validated.amount,
          description: validated.description,
          remarks: validated.remarks || null,
          expenseTypeId,
          purchaseId: validated.purchaseId || null,
          lotId: validated.lotId || null,
          createdBy: user.userId,
          updatedBy: user.userId,
        },
        include: {
          expenseType: { select: { id: true, name: true } },
          purchase: { select: { id: true, purchaseNo: true } },
          lot: { select: { id: true, lotNo: true } },
        },
      });

      await tx.expenseType.update({
        where: { id: expenseTypeId },
        data: { usageCount: { increment: 1 } },
      });

      return created;
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate value found' }, { status: 409 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const q = searchParams.get('q')?.trim();
    const typeId = searchParams.get('expenseTypeId');
    const purchaseId = searchParams.get('purchaseId');
    const lotId = searchParams.get('lotId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ExpenseWhereInput = {
      createdBy: user.userId,
      isDeleted: false,
      ...(typeId ? { expenseTypeId: parseInt(typeId, 10) } : {}),
      ...(purchaseId ? { purchaseId: parseInt(purchaseId, 10) } : {}),
      ...(lotId ? { lotId: parseInt(lotId, 10) } : {}),
      ...(startDate || endDate
        ? {
            expenseDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { description: { contains: q, mode: 'insensitive' } },
              { remarks: { contains: q, mode: 'insensitive' } },
              { expenseType: { name: { contains: q, mode: 'insensitive' } } },
              { purchase: { purchaseNo: { contains: q, mode: 'insensitive' } } },
              { lot: { lotNo: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: whereClause,
        include: {
          expenseType: { select: { id: true, name: true } },
          purchase: { select: { id: true, purchaseNo: true } },
          lot: { select: { id: true, lotNo: true } },
        },
        skip,
        take: limit,
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
      }),
      prisma.expense.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
