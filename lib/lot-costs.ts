import Decimal from 'decimal.js';
import { Prisma, PrismaClient } from '@prisma/client';

type TxClient = Prisma.TransactionClient | PrismaClient;

interface ExpenseLotLedgerSyncInput {
  expenseId: number;
  userId: number;
  lotId?: number | null;
  amount?: Prisma.Decimal | Decimal | string | number;
  expenseDate?: Date;
  description?: string;
}

function toDecimal(value: Prisma.Decimal | Decimal | string | number | undefined): Decimal {
  if (value == null) return new Decimal(0);
  return value instanceof Decimal ? value : new Decimal(value);
}

export async function syncExpenseLotLedger(
  tx: TxClient,
  input: ExpenseLotLedgerSyncInput
) {
  const existingEntries = await tx.lotCost.findMany({
    where: {
      sourceType: 'EXPENSE',
      sourceRefId: input.expenseId,
      isDeleted: false,
    },
    select: {
      id: true,
      lotId: true,
      amount: true,
    },
  });

  for (const entry of existingEntries) {
    await tx.lot.update({
      where: { id: entry.lotId },
      data: {
        accumulatedCost: {
          decrement: entry.amount,
        },
      },
    });

    await tx.lotCost.update({
      where: { id: entry.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  if (!input.lotId) {
    return;
  }

  const amount = toDecimal(input.amount);
  if (amount.lte(0)) {
    return;
  }

  await tx.lot.update({
    where: { id: input.lotId },
    data: {
      accumulatedCost: {
        increment: amount,
      },
    },
  });

  await tx.lotCost.create({
    data: {
      lotId: input.lotId,
      category: 'MISC',
      sourceType: 'EXPENSE',
      sourceRefId: input.expenseId,
      amount,
      costDate: input.expenseDate || new Date(),
      remarks: input.description ? `Expense: ${input.description}` : 'Expense',
      createdBy: input.userId,
    },
  });
}
