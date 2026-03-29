'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { DetailPageSkeleton } from '@/components/PageSkeleton';

interface Supplier {
  id: number;
  name: string;
}

interface LotCost {
  id: number;
  category: string;
  amount: string;
  costDate: string;
  remarks?: string | null;
}

interface Lot {
  id: number;
  lotNo: string;
  initialWeight: string;
  currentWeight: string;
  status: string;
  inventoryState: string;
  currentStage: string;
  accumulatedCost: string;
  costs: LotCost[];
}

interface PurchaseDetail {
  id: number;
  purchaseNo: string;
  purchaseDate: string;
  status: string;
  referenceNo?: string | null;
  roughWeight: string;
  totalAmount: string;
  remarks?: string | null;
  supplier: Supplier;
  lots: Lot[];
}

function formatNumber(value: string | number, fractionDigits = 2): string {
  const numeric = typeof value === 'number' ? value : Number(value || 0);
  return numeric.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export default function PurchaseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await apiClient.get(`/api/purchases/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Purchase not found');
          } else {
            setError('Failed to load purchase details');
          }
          return;
        }

        const data = await response.json();
        setPurchase(data);
      } catch {
        setError('Failed to load purchase details');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [params.id]);

  const totals = useMemo(() => {
    if (!purchase) return { lotCount: 0, costEntries: 0, summedCost: 0 };

    const lotCount = purchase.lots.length;
    const costEntries = purchase.lots.reduce((acc, lot) => acc + lot.costs.length, 0);
    const summedCost = purchase.lots.reduce(
      (sum, lot) => sum + lot.costs.reduce((lotCost, entry) => lotCost + Number(entry.amount), 0),
      0
    );

    return { lotCount, costEntries, summedCost };
  }, [purchase]);

  if (!loading && (error || !purchase)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white border rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || 'Purchase not found'}</h2>
          <p className="text-gray-600 mb-4">The requested purchase record is unavailable.</p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => router.push('/purchases')}
          >
            Back to Purchases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href="/purchases" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Purchases">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Purchase Details</h1>
          </div>
          <div className="text-sm text-gray-600">#{purchase?.purchaseNo || '...'}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {loading ? (
          <DetailPageSkeleton />
        ) : (
          <>
            <section className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Supplier</p>
              <p className="font-semibold text-gray-900">{purchase!.supplier?.name || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Purchase Date</p>
              <p className="font-semibold text-gray-900">{new Date(purchase!.purchaseDate).toLocaleDateString('en-IN')}</p>
            </div>
            <div>
              <p className="text-gray-500">Rough Weight</p>
              <p className="font-semibold text-gray-900">{formatNumber(purchase!.roughWeight, 3)} cts</p>
            </div>
            <div>
              <p className="text-gray-500">Total Amount</p>
              <p className="font-semibold text-gray-900">INR {formatNumber(purchase!.totalAmount, 2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <p className="font-semibold text-gray-900">{purchase!.status}</p>
            </div>
            <div>
              <p className="text-gray-500">Reference</p>
              <p className="font-semibold text-gray-900">{purchase!.referenceNo || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Linked Lots</p>
              <p className="font-semibold text-gray-900">{totals.lotCount}</p>
            </div>
            <div>
              <p className="text-gray-500">Cost Entries</p>
              <p className="font-semibold text-gray-900">{totals.costEntries}</p>
            </div>
          </div>
          {purchase!.remarks ? (
            <div className="mt-4 text-sm">
              <p className="text-gray-500 mb-1">Remarks</p>
              <p className="text-gray-800">{purchase!.remarks}</p>
            </div>
          ) : null}
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Linked Lots and Cost Ledger</h2>
            <p className="text-sm text-gray-600">Total Ledger Cost: INR {formatNumber(totals.summedCost, 2)}</p>
          </div>

          {purchase!.lots.length === 0 ? (
            <p className="text-gray-600">No lots linked to this purchase!.</p>
          ) : (
            <div className="space-y-4">
              {purchase!.lots.map((lot) => (
                <div key={lot.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-gray-500">Lot No</p>
                      <p className="font-semibold text-gray-900">
                        <Link href={`/lots/${lot.id}`} className="text-blue-600 hover:text-blue-700">
                          {lot.lotNo}
                        </Link>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Initial Weight</p>
                      <p className="font-semibold text-gray-900">{formatNumber(lot.initialWeight, 3)} cts</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Current Weight</p>
                      <p className="font-semibold text-gray-900">{formatNumber(lot.currentWeight, 3)} cts</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-semibold text-gray-900">{lot.status}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Accumulated Cost</p>
                      <p className="font-semibold text-gray-900">INR {formatNumber(lot.accumulatedCost, 2)}</p>
                    </div>
                  </div>

                  {lot.costs.length === 0 ? (
                    <p className="text-gray-600 text-sm">No cost entries for this lot.</p>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full px-4 sm:px-0">
                        <table className="w-full min-w-[500px] text-xs sm:text-sm">
                          <thead>
                            <tr className="text-left border-b bg-gray-50">
                              <th className="py-2 px-2 sm:px-3 whitespace-nowrap">Date</th>
                              <th className="px-2 sm:px-3 whitespace-nowrap">Category</th>
                              <th className="px-2 sm:px-3 whitespace-nowrap text-right">Amount</th>
                              <th className="px-2 sm:px-3">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lot.costs.map((entry) => (
                              <tr key={entry.id} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-2 sm:px-3 whitespace-nowrap text-xs">{new Date(entry.costDate).toLocaleDateString('en-IN')}</td>
                                <td className="px-2 sm:px-3 whitespace-nowrap text-xs">{entry.category}</td>
                                <td className="px-2 sm:px-3 whitespace-nowrap text-right text-xs">INR {formatNumber(entry.amount, 2)}</td>
                                <td className="px-2 sm:px-3 text-xs truncate">{entry.remarks || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
