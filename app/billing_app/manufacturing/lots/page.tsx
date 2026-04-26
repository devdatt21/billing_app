'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import Loader from '@/components/Loader';
import { useToast } from '@/contexts/ToastContext';

interface LotRow {
  id: number;
  lotNumber: string;
  name: string;
  purchaseId?: number;
  initialWeight: string;
  availableWeight: string;
  inProcessWeight: string;
  lostWeight: string;
  purchaseCost: string;
  totalLaborCost: string;
  createdAt: string;
}

interface LotForm {
  lotNumber: string;
  name: string;
  purchaseId: string;
  initialWeight: string;
  purchaseCost: string;
}

export default function ManufacturingLotsPage() {
  const toast = useToast();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [items, setItems] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<LotForm>({
    lotNumber: '',
    name: '',
    purchaseId: '',
    initialWeight: '',
    purchaseCost: '',
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const loadLots = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/lots');
      if (!res.ok) {
        setItems([]);
        return;
      }
      const payload = await res.json();
      setItems(payload.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadLots();
  }, [user]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        lotNumber: form.lotNumber,
        name: form.name,
        purchaseId: form.purchaseId ? Number(form.purchaseId) : null,
        initialWeight: form.initialWeight,
        purchaseCost: form.purchaseCost,
      };

      const res = await apiClient.post('/api/lots', payload);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create lot');
        return;
      }

      toast.success('Lot created successfully');
      setForm({
        lotNumber: '',
        name: '',
        purchaseId: '',
        initialWeight: '',
        purchaseCost: '',
      });
      setShowCreate(false);
      await loadLots();
    } finally {
      setSaving(false);
    }
  };

  if (!user && !isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/billing_app" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Back to Home">
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Manufacturing Lots</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {showCreate ? 'Close' : 'Create Lot'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {showCreate ? (
          <form onSubmit={onCreate} className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Create Manufacturing Lot</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                value={form.lotNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, lotNumber: e.target.value }))}
                placeholder="Lot number (optional)"
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Lot name"
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <input
                type="number"
                min="1"
                value={form.purchaseId}
                onChange={(e) => setForm((prev) => ({ ...prev, purchaseId: e.target.value }))}
                placeholder="Purchase ID (optional)"
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.initialWeight}
                onChange={(e) => setForm((prev) => ({ ...prev, initialWeight: e.target.value }))}
                placeholder="Initial weight"
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.purchaseCost}
                onChange={(e) => setForm((prev) => ({ ...prev, purchaseCost: e.target.value }))}
                placeholder="Purchase cost"
                className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save Lot'}
              </button>
            </div>
          </form>
        ) : null}

        {loading || isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">No lots yet</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Create your first lot to start manufacturing tracking.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Lot Number</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Initial</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Available</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">In Process</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Lost</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Purchase</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Labor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((lot) => (
                    <tr key={lot.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{lot.lotNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{lot.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{Number(lot.initialWeight).toFixed(3)} ct</td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{Number(lot.availableWeight).toFixed(3)} ct</td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{Number(lot.inProcessWeight).toFixed(3)} ct</td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{Number(lot.lostWeight).toFixed(3)} ct</td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">₹{Number(lot.purchaseCost).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">₹{Number(lot.totalLaborCost).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        <Link
                          href={`/billing_app/manufacturing/lots/${lot.id}`}
                          className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 md:hidden">
              {items.map((lot) => (
                <div key={lot.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold text-gray-800 dark:text-gray-100 text-base">{lot.name}</div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {lot.lotNumber || `#${lot.id}`}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 dark:border-gray-700 pt-2">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block text-xs">Available</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{Number(lot.availableWeight).toFixed(3)} ct</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block text-xs">In Process</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{Number(lot.inProcessWeight).toFixed(3)} ct</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block text-xs">Initial</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{Number(lot.initialWeight).toFixed(3)} ct</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block text-xs">Costs</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">₹{Number(lot.totalLaborCost).toFixed(2)} lab</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/billing_app/manufacturing/lots/${lot.id}`}
                      className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-center"
                    >
                      Open Lot
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
