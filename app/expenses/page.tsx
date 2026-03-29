'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';
import PurchaseSelect, { PurchaseOption } from '@/components/PurchaseSelect';
import LotSelect, { LotOption } from '@/components/LotSelect';

interface ExpenseTypeOption {
  id: number;
  name: string;
  usageCount?: number;
}

interface ExpenseItem {
  id: number;
  expenseDate: string;
  amount: string;
  description: string;
  remarks?: string | null;
  purchaseId?: number | null;
  lotId?: number | null;
  expenseType: {
    id: number;
    name: string;
  };
  purchase?: {
    id: number;
    purchaseNo: string;
  } | null;
  lot?: {
    id: number;
    lotNo: string;
  } | null;
}

interface ExpenseFormState {
  expenseDate: string;
  amount: string;
  description: string;
  remarks: string;
  typeQuery: string;
  expenseTypeId?: number;
  purchase: PurchaseOption | null;
  lot: LotOption | null;
}

const emptyForm: ExpenseFormState = {
  expenseDate: new Date().toISOString().slice(0, 10),
  amount: '',
  description: '',
  remarks: '',
  typeQuery: '',
  expenseTypeId: undefined,
  purchase: null,
  lot: null,
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(value: string): string {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ExpensesPage() {
  const toast = useToast();
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(emptyForm);

  const [typeOptions, setTypeOptions] = useState<ExpenseTypeOption[]>([]);
  const [typeLoading, setTypeLoading] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [isCreatingCustomType, setIsCreatingCustomType] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const canCreateCustomType = useMemo(() => {
    const q = form.typeQuery.trim().toLowerCase();
    if (!q) return false;
    return !typeOptions.some((opt) => opt.name.trim().toLowerCase() === q);
  }, [form.typeQuery, typeOptions]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await apiClient.get(`/api/expenses?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to load expenses');
        return;
      }

      const data = await res.json();
      setItems(data.expenses || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchTypeOptions = async (query = '') => {
    setTypeLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '8');
      if (query.trim()) {
        params.set('q', query.trim());
      }

      const res = await apiClient.get(`/api/search/expense-types?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      setTypeOptions(Array.isArray(data) ? data : []);
    } finally {
      setTypeLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchTypeOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTypeOptions(form.typeQuery);
    }, 200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.typeQuery]);

  const resetForm = () => {
    setEditingId(null);
    setIsCreatingCustomType(false);
    setShowTypeDropdown(false);
    setForm({
      ...emptyForm,
      expenseDate: new Date().toISOString().slice(0, 10),
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.typeQuery.trim()) {
      toast.error('Expense type is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        expenseDate: form.expenseDate,
        amount: form.amount,
        description: form.description,
        remarks: form.remarks || null,
        purchaseId: form.purchase?.id || null,
        lotId: form.lot?.id || null,
        ...(form.expenseTypeId ? { expenseTypeId: form.expenseTypeId } : { expenseTypeName: form.typeQuery.trim() }),
      };

      const endpoint = editingId ? `/api/expenses/${editingId}` : '/api/expenses';
      const res = editingId
        ? await apiClient.put(endpoint, payload)
        : await apiClient.post(endpoint, payload);

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to save expense');
        return;
      }

      toast.success(editingId ? 'Expense updated successfully' : 'Expense added successfully');
      resetForm();
      await Promise.all([fetchItems(), fetchTypeOptions()]);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (item: ExpenseItem) => {
    setEditingId(item.id);
    setIsCreatingCustomType(false);
    setShowTypeDropdown(false);
    setForm({
      expenseDate: item.expenseDate.slice(0, 10),
      amount: item.amount,
      description: item.description,
      remarks: item.remarks || '',
      typeQuery: item.expenseType?.name || '',
      expenseTypeId: item.expenseType?.id,
      purchase: item.purchase
        ? {
            id: item.purchase.id,
            name: item.purchase.purchaseNo,
            purchaseNo: item.purchase.purchaseNo,
            purchaseDate: '',
            supplierName: null,
          }
        : null,
      lot: item.lot
        ? {
            id: item.lot.id,
            name: item.lot.lotNo,
            lotNo: item.lot.lotNo,
            lotDate: '',
            purchaseDate: null,
            sourcePurchaseNo: null,
          }
        : null,
    });
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this expense?')) return;

    const res = await apiClient.delete(`/api/expenses/${id}`);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || 'Failed to delete expense');
      return;
    }

    toast.success('Expense deleted successfully');
    await fetchItems();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Back to Home">
              <svg className="h-5 w-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">Expenses</h1>
          </div>
          <p className="hidden max-w-3xl truncate text-sm text-slate-600 dark:text-slate-400 md:block">
            Track expenses linked to purchases/lots or add reusable custom expense types like Rent, Salary, and Supplies.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-3 sm:p-4 lg:grid-cols-3">
        <form onSubmit={onSubmit} className="h-fit space-y-3 rounded-lg border border-sky-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm shadow-sm sm:p-4 lg:col-span-1">
          <h2 className="font-semibold text-slate-900 dark:text-white">{editingId ? 'Edit Expense' : 'New Expense'}</h2>

          <input
            type="date"
            className="w-full rounded border border-sky-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white px-3 py-2"
            value={form.expenseDate}
            onChange={(e) => setForm((prev) => ({ ...prev, expenseDate: e.target.value }))}
            required
          />

          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white px-3 py-2"
            placeholder="Amount *"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            required
          />

          <div className="relative">
            <input
              className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white px-3 py-2"
              placeholder="Expense type * (type to search or create)"
              value={form.typeQuery}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, typeQuery: e.target.value, expenseTypeId: undefined }));
                setShowTypeDropdown(true);
                setIsCreatingCustomType(false);
              }}
              onFocus={() => setShowTypeDropdown(true)}
              required
            />
            {isCreatingCustomType && (
              <div className="mt-2 rounded border-l-4 border-l-blue-500 bg-blue-50 dark:bg-slate-800 p-2 text-xs text-blue-900 dark:text-blue-300">
                ✓ Creating custom type: <span className="font-semibold">{form.typeQuery.trim()}</span>
              </div>
            )}
            {showTypeDropdown && (form.typeQuery.trim() || typeOptions.length > 0) && (
              <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                {typeLoading ? (
                  <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Searching...</div>
                ) : (
                  <>
                    {typeOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            typeQuery: option.name,
                            expenseTypeId: option.id,
                          }));
                          setShowTypeDropdown(false);
                          setIsCreatingCustomType(false);
                        }}
                      >
                        <span className="dark:text-white">{option.name}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">Used {option.usageCount || 0}</span>
                      </button>
                    ))}
                    {canCreateCustomType && (
                      <button
                        type="button"
                        className="w-full border-t border-gray-100 dark:border-slate-700 px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            typeQuery: prev.typeQuery.trim(),
                            expenseTypeId: undefined,
                          }));
                          setShowTypeDropdown(false);
                          setIsCreatingCustomType(true);
                        }}
                      >
                        Create &quot;{form.typeQuery.trim()}&quot;
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <input
            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white px-3 py-2"
            placeholder="Description *"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            required
          />

          <textarea
            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white px-3 py-2"
            placeholder="Remarks (optional)"
            value={form.remarks}
            onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
            rows={3}
          />

          <PurchaseSelect
            value={form.purchase}
            onChange={(purchase) => setForm((prev) => ({ ...prev, purchase }))}
            label="Purchase (optional)"
          />

          <LotSelect
            value={form.lot}
            onChange={(lot) => setForm((prev) => ({ ...prev, lot }))}
            label="Lot (optional)"
          />

          <div className="flex flex-wrap gap-2">
            <button
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {editingId ? 'Update Expense' : 'Add Expense'}
            </button>
            {editingId && (
              <button type="button" className="rounded border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-white">Expense List</h2>
            <input
              className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white px-3 py-2 text-sm sm:w-80"
              placeholder="Search description, type, lot, purchase..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  fetchItems();
                }
              }}
            />
          </div>

          {loading ? (
            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 text-left">
                    <th className="py-2 text-slate-700 dark:text-slate-300">Date</th>
                    <th className="text-slate-700 dark:text-slate-300">Type</th>
                    <th className="text-slate-700 dark:text-slate-300">Description</th>
                    <th className="text-slate-700 dark:text-slate-300">Purchase</th>
                    <th className="text-slate-700 dark:text-slate-300">Lot</th>
                    <th className="text-slate-700 dark:text-slate-300">Amount</th>
                    <th className="text-right text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-slate-700 align-top">
                      <td className="py-2 text-slate-700 dark:text-slate-300">{formatDate(item.expenseDate)}</td>
                      <td className="font-medium text-slate-900 dark:text-white">{item.expenseType?.name || '-'}</td>
                      <td>
                        <p className="font-medium text-slate-900 dark:text-white">{item.description}</p>
                        {item.remarks ? <p className="text-xs text-slate-500 dark:text-slate-400">{item.remarks}</p> : null}
                      </td>
                      <td className="text-slate-700 dark:text-slate-300">{item.purchase?.purchaseNo || '-'}</td>
                      <td className="text-slate-700 dark:text-slate-300">{item.lot?.lotNo || '-'}</td>
                      <td className="font-semibold text-slate-900 dark:text-white">Rs {formatAmount(item.amount)}</td>
                      <td className="space-x-2 text-right">
                        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300" onClick={() => onEdit(item)}>Edit</button>
                        <button className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" onClick={() => onDelete(item.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No expenses found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
