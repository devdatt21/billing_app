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
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/billing_app" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Home">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Manufacturing Lots</h1>
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
          <form onSubmit={onCreate} className="mb-6 rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Create Manufacturing Lot</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                value={form.lotNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, lotNumber: e.target.value }))}
                placeholder="Lot number (optional)"
                className="w-full border rounded px-3 py-2"
              />
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Lot name"
                className="w-full border rounded px-3 py-2"
                required
              />
              <input
                type="number"
                min="1"
                value={form.purchaseId}
                onChange={(e) => setForm((prev) => ({ ...prev, purchaseId: e.target.value }))}
                placeholder="Purchase ID (optional)"
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.initialWeight}
                onChange={(e) => setForm((prev) => ({ ...prev, initialWeight: e.target.value }))}
                placeholder="Initial weight"
                className="w-full border rounded px-3 py-2"
                required
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.purchaseCost}
                onChange={(e) => setForm((prev) => ({ ...prev, purchaseCost: e.target.value }))}
                placeholder="Purchase cost"
                className="w-full border rounded px-3 py-2"
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
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-gray-900">No lots yet</p>
            <p className="mt-2 text-sm text-gray-600">Create your first lot to start manufacturing tracking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[980px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lot Number</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Initial</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Available</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">In Process</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lost</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Purchase</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Labor</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((lot) => (
                  <tr key={lot.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-800">{lot.lotNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{lot.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{Number(lot.initialWeight).toFixed(3)} ct</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{Number(lot.availableWeight).toFixed(3)} ct</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{Number(lot.inProcessWeight).toFixed(3)} ct</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{Number(lot.lostWeight).toFixed(3)} ct</td>
                    <td className="px-4 py-3 text-sm text-gray-800">₹{Number(lot.purchaseCost).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">₹{Number(lot.totalLaborCost).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <Link
                        href={`/billing_app/manufacturing/lots/${lot.id}`}
                        className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
