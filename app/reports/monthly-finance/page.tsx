'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { MonthlyFinanceSkeleton } from '@/components/PageSkeleton';

interface FinanceBucket {
  name?: string;
  category?: string;
  amount: string;
}

interface MonthlyFinanceReport {
  view: 'monthly' | 'yearly';
  periodKey: string;
  summary: {
    revenue: string;
    purchaseSpend: string;
    expenseSpend: string;
    totalSpend: string;
    estimatedProfit: string;
    operatingExpenseSpend: string;
    lotLinkedExpenseSpend: string;
    purchaseLinkedExpenseSpend: string;
  };
  counts: {
    invoices: number;
    purchases: number;
    expenses: number;
    lotCostPosts: number;
  };
  expenseByType: FinanceBucket[];
  lotCostByCategory: FinanceBucket[];
  notes: string[];
}

function toMonthInputValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toYearInputValue(date = new Date()): string {
  return String(date.getFullYear());
}

function formatCurrency(value: string | number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">Rs {formatCurrency(value)}</p>
      <p className="mt-2 text-xs text-gray-600">{hint}</p>
    </div>
  );
}

export default function MonthlyFinancePage() {
  const [view, setView] = useState<'monthly' | 'yearly'>('monthly');
  const [month, setMonth] = useState(toMonthInputValue());
  const [year, setYear] = useState(toYearInputValue());
  const [report, setReport] = useState<MonthlyFinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const periodParam = view === 'yearly'
          ? `view=yearly&year=${encodeURIComponent(year)}`
          : `view=monthly&month=${encodeURIComponent(month)}`;

        const res = await apiClient.get(`/api/reports/monthly-finance?${periodParam}`);
        if (!res.ok) {
          const body = await res.json();
          setError(body.error || 'Failed to load finance report');
          setReport(null);
          return;
        }

        setReport(await res.json());
      } catch {
        setError('Failed to load finance report');
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [month, view, year]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, index) => String(currentYear - index));
  }, []);

  const profitTone = useMemo(() => {
    if (!report) return 'text-gray-900';
    return Number(report.summary.estimatedProfit) >= 0 ? 'text-emerald-700' : 'text-red-700';
  }, [report]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 px-3 py-2 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="rounded-lg p-1.5 hover:bg-gray-100" aria-label="Back to Home">
              <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-base font-bold text-gray-900 sm:text-xl">Finance Tab</h1>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <select
              value={view}
              onChange={(e) => setView(e.target.value as 'monthly' | 'yearly')}
              className="h-9 w-full min-w-0 rounded border border-gray-300 bg-white px-2 text-xs sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>

            {view === 'monthly' ? (
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-9 w-full min-w-0 rounded border border-gray-300 bg-white px-2 text-xs sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-sm"
              />
            ) : (
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-9 w-full min-w-0 rounded border border-gray-300 bg-white px-2 text-xs sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-sm"
              >
                {yearOptions.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
        {loading ? (
          <MonthlyFinanceSkeleton />
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        ) : report ? (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard title="Revenue" value={report.summary.revenue} hint={`${report.counts.invoices} invoice(s)`} />
              <MetricCard title="Purchase Spend" value={report.summary.purchaseSpend} hint={`${report.counts.purchases} purchase(s)`} />
              <MetricCard title="Recorded Expenses" value={report.summary.expenseSpend} hint={`${report.counts.expenses} expense entry(s)`} />
              <MetricCard title="Total Spend" value={report.summary.totalSpend} hint="Purchases + recorded expenses" />
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Estimated Profit</p>
                <p className={`mt-2 text-2xl font-semibold ${profitTone}`}>Rs {formatCurrency(report.summary.estimatedProfit)}</p>
                <p className="mt-2 text-xs text-gray-600">Current period estimate using existing modules</p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">Expense Split</h2>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Operating expenses</span>
                    <span className="font-medium text-gray-900">Rs {formatCurrency(report.summary.operatingExpenseSpend)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Lot-linked expenses</span>
                    <span className="font-medium text-gray-900">Rs {formatCurrency(report.summary.lotLinkedExpenseSpend)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Purchase-linked expenses</span>
                    <span className="font-medium text-gray-900">Rs {formatCurrency(report.summary.purchaseLinkedExpenseSpend)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">Expenses By Type</h2>
                <div className="mt-3 space-y-2 text-sm">
                  {report.expenseByType.length === 0 ? (
                    <p className="text-gray-600">No expenses in this period.</p>
                  ) : (
                    report.expenseByType.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="text-gray-600">{item.name}</span>
                        <span className="font-medium text-gray-900">Rs {formatCurrency(item.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">Lot Cost Posts</h2>
                <p className="mt-1 text-xs text-gray-500">{report.counts.lotCostPosts} ledger post(s) in this period</p>
                <div className="mt-3 space-y-2 text-sm">
                  {report.lotCostByCategory.length === 0 ? (
                    <p className="text-gray-600">No lot cost movement in this period.</p>
                  ) : (
                    report.lotCostByCategory.map((item) => (
                      <div key={item.category} className="flex items-center justify-between">
                        <span className="text-gray-600">{item.category}</span>
                        <span className="font-medium text-gray-900">Rs {formatCurrency(item.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
              <h2 className="font-semibold">Current Calculation Notes</h2>
              <div className="mt-2 space-y-1">
                {report.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
