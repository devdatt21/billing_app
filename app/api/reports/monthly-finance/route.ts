export const dynamic = 'force-dynamic';

import Decimal from 'decimal.js';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

type FinanceView = 'monthly' | 'yearly';

function parsePeriodParams(searchParams: URLSearchParams): { view: FinanceView; key: string; start: Date; end: Date } {
  const now = new Date();

  const view: FinanceView = searchParams.get('view') === 'yearly' ? 'yearly' : 'monthly';

  if (view === 'yearly') {
    const fallbackYear = String(now.getFullYear());
    const yearParam = searchParams.get('year');
    const key = /^\d{4}$/.test(yearParam || '') ? String(yearParam) : fallbackYear;
    const yearValue = Number(key);
    const start = new Date(Date.UTC(yearValue, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(yearValue, 11, 31, 23, 59, 59, 999));
    return { view, key, start, end };
  }

  const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthParam = searchParams.get('month');
  const key = /^\d{4}-\d{2}$/.test(monthParam || '') ? String(monthParam) : fallbackMonth;
  const [yearValue, monthValue] = key.split('-').map(Number);
  const start = new Date(Date.UTC(yearValue, monthValue - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(yearValue, monthValue, 0, 23, 59, 59, 999));
  return { view, key, start, end };
}

function sumDecimal(values: Array<{ amount?: unknown; totalAmount?: unknown }>): Decimal {
  return values.reduce((sum, row) => {
    const value = row.amount ?? row.totalAmount ?? 0;
    return sum.plus(new Decimal(String(value)));
  }, new Decimal(0));
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { view, key, start, end } = parsePeriodParams(searchParams);

    const [invoices, purchases, expenses, lotCosts] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          createdBy: user.userId,
          status: { not: 'CANCELLED' },
          date: { gte: start, lte: end },
        },
        select: {
          id: true,
          invoiceNo: true,
          date: true,
          totalAmount: true,
          status: true,
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      }),
      prisma.purchase.findMany({
        where: {
          createdBy: user.userId,
          isDeleted: false,
          status: { not: 'CANCELLED' },
          purchaseDate: { gte: start, lte: end },
        },
        select: {
          id: true,
          purchaseNo: true,
          purchaseDate: true,
          totalAmount: true,
          status: true,
        },
        orderBy: [{ purchaseDate: 'desc' }, { id: 'desc' }],
      }),
      prisma.expense.findMany({
        where: {
          createdBy: user.userId,
          isDeleted: false,
          expenseDate: { gte: start, lte: end },
        },
        select: {
          id: true,
          expenseDate: true,
          amount: true,
          description: true,
          lotId: true,
          purchaseId: true,
          expenseType: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
      }),
      prisma.lotCost.findMany({
        where: {
          createdBy: user.userId,
          isDeleted: false,
          costDate: { gte: start, lte: end },
        },
        select: {
          id: true,
          lotId: true,
          category: true,
          amount: true,
        },
      }),
    ]);

    const revenue = sumDecimal(invoices);
    const purchaseSpend = sumDecimal(purchases);
    const expenseSpend = sumDecimal(expenses);
    const totalSpend = purchaseSpend.plus(expenseSpend);
    const estimatedProfit = revenue.minus(totalSpend);

    const lotLinkedExpenseSpend = sumDecimal(expenses.filter((entry) => entry.lotId != null));
    const purchaseLinkedExpenseSpend = sumDecimal(expenses.filter((entry) => entry.purchaseId != null));
    const operatingExpenseSpend = sumDecimal(
      expenses.filter((entry) => entry.lotId == null && entry.purchaseId == null)
    );

    const expenseByTypeMap = new Map<string, Decimal>();
    for (const expense of expenses) {
      const keyName = expense.expenseType.name;
      expenseByTypeMap.set(keyName, (expenseByTypeMap.get(keyName) || new Decimal(0)).plus(expense.amount));
    }

    const lotCostByCategoryMap = new Map<string, Decimal>();
    for (const cost of lotCosts) {
      lotCostByCategoryMap.set(cost.category, (lotCostByCategoryMap.get(cost.category) || new Decimal(0)).plus(cost.amount));
    }

    return NextResponse.json({
      view,
      periodKey: key,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        revenue: revenue.toFixed(2),
        purchaseSpend: purchaseSpend.toFixed(2),
        expenseSpend: expenseSpend.toFixed(2),
        totalSpend: totalSpend.toFixed(2),
        estimatedProfit: estimatedProfit.toFixed(2),
        operatingExpenseSpend: operatingExpenseSpend.toFixed(2),
        lotLinkedExpenseSpend: lotLinkedExpenseSpend.toFixed(2),
        purchaseLinkedExpenseSpend: purchaseLinkedExpenseSpend.toFixed(2),
      },
      counts: {
        invoices: invoices.length,
        purchases: purchases.length,
        expenses: expenses.length,
        lotCostPosts: lotCosts.length,
      },
      expenseByType: Array.from(expenseByTypeMap.entries())
        .map(([name, amount]) => ({
          name,
          amount: amount.toFixed(2),
        }))
        .sort((a, b) => Number(b.amount) - Number(a.amount)),
      lotCostByCategory: Array.from(lotCostByCategoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount: amount.toFixed(2),
        }))
        .sort((a, b) => Number(b.amount) - Number(a.amount)),
      notes: [
        `Estimated profit currently uses billing invoice revenue minus purchase spend minus recorded expenses for the selected ${view === 'yearly' ? 'year' : 'month'}.`,
        'Lot cost postings are shown as analysis only and are not added again into total spend to avoid double counting.',
      ],
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load finance report' }, { status: 500 });
  }
}
