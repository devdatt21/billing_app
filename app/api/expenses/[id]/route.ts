export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ExpenseSchema } from '@/lib/validations';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { syncExpenseLotLedger } from '@/lib/lot-costs';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
  }

  const expense = await prisma.expense.findFirst({
    where: {
      id,
      createdBy: user.userId,
      isDeleted: false,
    },
    include: {
      expenseType: { select: { id: true, name: true } },
      purchase: { select: { id: true, purchaseNo: true } },
      lot: { select: { id: true, lotNo: true } },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  return NextResponse.json(expense);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = parseId(params.id);
    if (!id) {
      return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({
      where: {
        id,
        createdBy: user.userId,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = ExpenseSchema.parse(body);

    if (validated.lotId) {
      const lot = await prisma.lot.findFirst({
        where: {
          id: validated.lotId,
          createdBy: user.userId,
          isDeleted: false,
        },
        select: { id: true },
      });

      if (!lot) {
        throw new Error('Linked lot not found');
      }
    }

    if (validated.purchaseId) {
      const purchase = await prisma.purchase.findFirst({
        where: {
          id: validated.purchaseId,
          createdBy: user.userId,
          isDeleted: false,
        },
        select: { id: true },
      });

      if (!purchase) {
        throw new Error('Linked purchase not found');
      }
    }

    const expenseTypeId = await resolveExpenseTypeId(user.userId, validated);

    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data: {
          expenseDate: validated.expenseDate,
          amount: validated.amount,
          description: validated.description,
          remarks: validated.remarks || null,
          expenseTypeId,
          purchaseId: validated.purchaseId || null,
          lotId: validated.lotId || null,
          updatedBy: user.userId,
        },
        include: {
          expenseType: { select: { id: true, name: true } },
          purchase: { select: { id: true, purchaseNo: true } },
          lot: { select: { id: true, lotNo: true } },
        },
      });

      await syncExpenseLotLedger(tx, {
        expenseId: updated.id,
        userId: user.userId,
        lotId: updated.lotId,
        amount: updated.amount,
        expenseDate: updated.expenseDate,
        description: updated.description,
      });

      return updated;
    });

    return NextResponse.json(expense);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
  }

  const existing = await prisma.expense.findFirst({
    where: {
      id,
      createdBy: user.userId,
      isDeleted: false,
    },
    select: {
      id: true,
      lotId: true,
      amount: true,
      expenseDate: true,
      description: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: user.userId,
      },
    });

    await syncExpenseLotLedger(tx, {
      expenseId: existing.id,
      userId: user.userId,
      lotId: null,
      amount: existing.amount,
      expenseDate: existing.expenseDate,
      description: existing.description,
    });
  });

  return NextResponse.json({ message: 'Expense deleted successfully' });
}
