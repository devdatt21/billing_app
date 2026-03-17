'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import { apiClient } from '@/lib/api-client';
import SupplierSelect, { SupplierOption } from '@/components/SupplierSelect';
import { useToast } from '@/contexts/ToastContext';

interface PurchaseRow {
  id: number;
  purchaseNo: string;
  purchaseDate: string;
  roughWeight: string;
  totalAmount: string;
  status: 'DRAFT' | 'RECEIVED' | 'POSTED' | 'CANCELLED';
  referenceNo?: string | null;
  supplier: {
    id: number;
    name: string;
  };
  lots: Array<{
    id: number;
    lotNo: string;
    initialWeight: string;
  }>;
}

interface PurchaseFormState {
  purchaseNo: string;
  lotNo: string;
  supplier: SupplierOption | null;
  purchaseDate: string;
  referenceNo: string;
  roughWeight: string;
  totalAmount: string;
  remarks: string;
}

interface PurchaseFilters {
  q: string;
  supplierId: string;
  purchaseDateFrom: string;
  purchaseDateTo: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PurchasesPage() {
  const toast = useToast();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [loadingPage, setLoadingPage] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<PurchaseRow[]>([]);
  const [supplierFilterOptions, setSupplierFilterOptions] = useState<SupplierOption[]>([]);
  const [filters, setFilters] = useState<PurchaseFilters>({
    q: '',
    supplierId: '',
    purchaseDateFrom: '',
    purchaseDateTo: '',
  });
  const [form, setForm] = useState<PurchaseFormState>({
    purchaseNo: '',
    lotNo: '',
    supplier: null,
    purchaseDate: todayISO(),
    referenceNo: '',
    roughWeight: '',
    totalAmount: '',
    remarks: '',
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const loadNextNumbers = useCallback(async () => {
    const res = await apiClient.get('/api/purchases/next-number');
    if (!res.ok) return;
    const data = await res.json();
    setForm((prev) => ({
      ...prev,
      purchaseNo: data.purchaseNo || prev.purchaseNo,
      lotNo: data.lotNo || prev.lotNo,
    }));
  }, []);

  const loadPurchases = useCallback(async (nextFilters: PurchaseFilters, withLoading = true) => {
    if (withLoading) setTableLoading(true);
    try {
      const params = new URLSearchParams({ limit: '25' });
      if (nextFilters.q.trim()) params.set('q', nextFilters.q.trim());
      if (nextFilters.supplierId) params.set('supplierId', nextFilters.supplierId);
      if (nextFilters.purchaseDateFrom) params.set('purchaseDateFrom', nextFilters.purchaseDateFrom);
      if (nextFilters.purchaseDateTo) params.set('purchaseDateTo', nextFilters.purchaseDateTo);

      const res = await apiClient.get(`/api/purchases?${params.toString()}`);
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(data.purchases || []);
    } finally {
      if (withLoading) setTableLoading(false);
    }
  }, []);

  const loadSupplierFilterOptions = useCallback(async () => {
    const res = await apiClient.get('/api/suppliers?onlyActive=true&limit=200');
    if (!res.ok) {
      setSupplierFilterOptions([]);
      return;
    }
    const data = await res.json();
    const options: SupplierOption[] = (data.suppliers || []).map((supplier: { id: number; name: string }) => ({
      id: supplier.id,
      name: supplier.name,
    }));
    setSupplierFilterOptions(options);
  }, []);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      setLoadingPage(true);
      await Promise.all([
        loadNextNumbers(),
        loadPurchases({ q: '', supplierId: '', purchaseDateFrom: '', purchaseDateTo: '' }, false),
        loadSupplierFilterOptions(),
      ]);
      setLoadingPage(false);
    };
    run();
  }, [user, loadNextNumbers, loadPurchases, loadSupplierFilterOptions]);

  useEffect(() => {
    if (!user) return;
    loadPurchases(filters, true);
  }, [user, filters, loadPurchases]);

  const resetForNextEntry = async () => {
    setForm((prev) => ({
      ...prev,
      purchaseDate: todayISO(),
      referenceNo: '',
      roughWeight: '',
      totalAmount: '',
      remarks: '',
      supplier: null,
    }));
    await loadNextNumbers();
  };

  const canSubmit = useMemo(() => {
    return (
      !!form.purchaseNo &&
      !!form.lotNo &&
      !!form.supplier &&
      !!form.purchaseDate &&
      Number(form.roughWeight) > 0 &&
      Number(form.totalAmount) >= 0
    );
  }, [form]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.supplier) {
      toast.warning('Please select a supplier');
      return;
    }

    if (Number(form.roughWeight) <= 0) {
      toast.warning('Rough weight must be greater than 0');
      return;
    }

    if (Number(form.totalAmount) < 0) {
      toast.warning('Total amount cannot be negative');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        purchaseNo: form.purchaseNo,
        lotNo: form.lotNo,
        supplierId: form.supplier.id,
        purchaseDate: form.purchaseDate,
        referenceNo: form.referenceNo || null,
        roughWeight: form.roughWeight,
        totalAmount: form.totalAmount,
        remarks: form.remarks || null,
        status: 'RECEIVED',
      };

      const res = await apiClient.post('/api/purchases', payload);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to create purchase');
        return;
      }

      await Promise.all([resetForNextEntry(), loadPurchases(filters, true)]);
      toast.success('Purchase created with linked lot and initial cost entry.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loadingPage) {
    return <Loader fullScreen text="Loading purchases..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Home">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Purchase Intake</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-1 h-fit">
          <h2 className="font-semibold text-gray-900">New Purchase</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase No</label>
              <input
                value={form.purchaseNo}
                onChange={(e) => setForm((prev) => ({ ...prev, purchaseNo: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial Lot No</label>
              <input
                value={form.lotNo}
                onChange={(e) => setForm((prev) => ({ ...prev, lotNo: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
          </div>

          <SupplierSelect
            value={form.supplier}
            onChange={(supplier) => setForm((prev) => ({ ...prev, supplier }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference No</label>
              <input
                value={form.referenceNo}
                onChange={(e) => setForm((prev) => ({ ...prev, referenceNo: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rough Weight (cts)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.roughWeight}
                onChange={(e) => setForm((prev) => ({ ...prev, roughWeight: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.totalAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded"
              placeholder="Optional operational remarks"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Purchase'}
            </button>
            <button
              type="button"
              className="px-4 py-2 border rounded"
              onClick={() => {
                resetForNextEntry();
              }}
            >
              Reset
            </button>
          </div>
        </form>

        <section className="bg-white border border-gray-200 rounded-lg p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-3 gap-3">
            <h2 className="font-semibold text-gray-900">Recent Purchases</h2>
            <button className="text-sm text-blue-600" onClick={() => loadPurchases(filters, true)}>Refresh</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            <input
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
              placeholder="Search purchase no / ref / supplier"
            />

            <select
              value={filters.supplierId}
              onChange={(e) => setFilters((prev) => ({ ...prev, supplierId: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">All suppliers</option>
              {supplierFilterOptions.map((supplier) => (
                <option key={supplier.id} value={String(supplier.id)}>{supplier.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={filters.purchaseDateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, purchaseDateFrom: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />

            <input
              type="date"
              value={filters.purchaseDateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, purchaseDateTo: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <button
              type="button"
              className="text-sm text-gray-700 underline"
              onClick={() => setFilters({ q: '', supplierId: '', purchaseDateFrom: '', purchaseDateTo: '' })}
            >
              Clear Filters
            </button>
          </div>

          {tableLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader size="md" text="Loading purchases..." />
            </div>
          ) : items.length === 0 ? (
            <p className="text-gray-600">No purchases created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Purchase No</th>
                    <th>Lot No</th>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 font-medium">{item.purchaseNo}</td>
                      <td>{item.lots[0]?.lotNo || '-'}</td>
                      <td>{item.supplier?.name || '-'}</td>
                      <td>{new Date(item.purchaseDate).toLocaleDateString()}</td>
                      <td>{item.roughWeight}</td>
                      <td>{item.totalAmount}</td>
                      <td>{item.status}</td>
                      <td>
                        <Link href={`/purchases/${item.id}`} className="text-blue-600 hover:text-blue-700">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
