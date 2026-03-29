'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';

interface Supplier {
  id: number;
  name: string;
  code?: string | null;
  gstin?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  openingDue: string;
  isActive: boolean;
}

const emptyForm = {
  name: '',
  code: '',
  gstin: '',
  phone: '',
  city: '',
  state: '',
  openingDue: '0',
  isActive: true,
};

export default function SuppliersPage() {
  const toast = useToast();
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/suppliers?limit=200');
      if (res.ok) {
        const data = await res.json();
        setItems(data.suppliers || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.phone && form.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingId ? `/api/suppliers/${editingId}` : '/api/suppliers';
      const res = editingId
        ? await apiClient.put(endpoint, form)
        : await apiClient.post(endpoint, form);
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { error?: string }));
        toast.error(err.error || 'Failed to save supplier');
        return;
      }
      setEditingId(null);
      setForm(emptyForm);
      await fetchItems();
      toast.success(editingId ? 'Supplier updated successfully' : 'Supplier created successfully');
    } catch {
      toast.error('Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (item: Supplier) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      code: item.code || '',
      gstin: item.gstin || '',
      phone: item.phone || '',
      city: item.city || '',
      state: item.state || '',
      openingDue: item.openingDue || '0',
      isActive: item.isActive,
    });
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this supplier?')) return;
    const res = await apiClient.delete(`/api/suppliers/${id}`);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || 'Failed to delete supplier');
      return;
    }
    await fetchItems();
    toast.success('Supplier deleted successfully');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/masters" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Masters">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Suppliers</h1>
          </div>
          <p className="hidden max-w-3xl truncate text-sm text-gray-600 md:block">
            Manage purchase vendors and their payable accounts.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 lg:col-span-1 h-fit text-sm">
          <h2 className="font-semibold text-gray-900">{editingId ? 'Edit Supplier' : 'New Supplier'}</h2>
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
          <input
            className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm"
            placeholder="Phone"
            inputMode="numeric"
            maxLength={10}
            value={form.phone}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
              setForm({ ...form, phone: digitsOnly });
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <input type="number" step="0.01" className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Opening Due" value={form.openingDue} onChange={(e) => setForm({ ...form, openingDue: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          <div className="flex flex-wrap gap-2">
            <button disabled={saving} className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{editingId ? 'Update' : 'Create'}</button>
            {editingId && <button type="button" className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm border rounded" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}
          </div>
        </form>

        <section className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Supplier List</h2>
          {loading ? <p className="text-gray-600">Loading...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs sm:text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Name</th><th>Code</th><th>GSTIN</th><th>Phone</th><th>Status</th><th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 font-medium">{item.name}</td>
                      <td>{item.code || '-'}</td>
                      <td>{item.gstin || '-'}</td>
                      <td>{item.phone || '-'}</td>
                      <td>{item.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="text-right space-x-2">
                        <button className="text-blue-600 text-xs sm:text-sm" onClick={() => onEdit(item)}>Edit</button>
                        <button className="text-red-600 text-xs sm:text-sm" onClick={() => onDelete(item.id)}>Delete</button>
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
