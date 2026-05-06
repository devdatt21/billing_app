'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api-client';
import { DetailPageSkeleton } from '@/components/PageSkeleton';

interface CleanSlateSummary {
  lotProcessesSoftDeleted: number;
  jobReturnsSoftDeleted: number;
  lotCostsSoftDeleted: number;
  lotSplitsSoftDeleted: number;
  lotsSoftDeleted: number;
  purchasesSoftDeleted: number;
  suppliersSoftDeleted: number;
  vendorsSoftDeleted: number;
  customersSoftDeleted: number;
  processTypesSoftDeleted: number;
  companiesSoftDeleted: number;
  purchaseInvoicesSoftDeleted: number;
  invoicesCancelled: number;
  salesCancelled: number;
  paymentsCancelled: number;
}

export default function CleanSlatePage() {
  const router = useRouter();
  const toast = useToast();
  const { user, isLoading } = useAuth();

  const [confirmation, setConfirmation] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CleanSlateSummary | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const canRun = confirmation.trim().toLowerCase() === 'clean slate' && !running;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canRun) {
      toast.warning('Type "clean slate" to confirm.');
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      const response = await apiClient.post('/api/clean-slate', {
        confirmation,
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Clean slate failed');
        return;
      }

      setResult(data.summary || null);
      setConfirmation('');
      toast.success('Clean slate completed.');
    } finally {
      setRunning(false);
    }
  };

  if (!user && !isLoading) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/billing_app" className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg" aria-label="Back to Billing Home">
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Clean Slate</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {isLoading ? (
          <DetailPageSkeleton />
        ) : (
          <>
            <section className="rounded-lg border border-red-300 bg-red-50 p-5 dark:bg-red-900/20 dark:border-red-700">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Danger Zone</h2>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                This action will clear your user-owned master and operational data for this account.
                Some records are archived and some are marked as cancelled based on module rules.
              </p>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                To continue, type <span className="font-semibold">clean slate</span> below.
              </p>
            </section>

            <form onSubmit={onSubmit} className="rounded-lg border border-gray-200 bg-white p-5 space-y-4 dark:bg-slate-900 dark:border-slate-800">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirmation Text
              </label>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Type: clean slate"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 dark:placeholder-gray-400"
              />

              <button
                type="submit"
                disabled={!canRun}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running ? 'Running Clean Slate...' : 'Run Clean Slate'}
              </button>
            </form>

            {result ? (
              <section className="rounded-lg border border-gray-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Execution Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <p className="text-gray-700 dark:text-gray-300">Lot Processes Cleared: <span className="font-semibold">{result.lotProcessesSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Job Returns Cleared: <span className="font-semibold">{result.jobReturnsSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Lot Costs Cleared: <span className="font-semibold">{result.lotCostsSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Lot Splits Cleared: <span className="font-semibold">{result.lotSplitsSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Lots Cleared: <span className="font-semibold">{result.lotsSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Purchases Cleared: <span className="font-semibold">{result.purchasesSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Suppliers Cleared: <span className="font-semibold">{result.suppliersSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Vendors Cleared: <span className="font-semibold">{result.vendorsSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Customers Cleared: <span className="font-semibold">{result.customersSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Process Types Cleared: <span className="font-semibold">{result.processTypesSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Companies Cleared: <span className="font-semibold">{result.companiesSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Purchase Invoices Cleared: <span className="font-semibold">{result.purchaseInvoicesSoftDeleted}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Invoices Cancelled: <span className="font-semibold">{result.invoicesCancelled}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Sales Cancelled: <span className="font-semibold">{result.salesCancelled}</span></p>
                  <p className="text-gray-700 dark:text-gray-300">Payments Cancelled: <span className="font-semibold">{result.paymentsCancelled}</span></p>
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
