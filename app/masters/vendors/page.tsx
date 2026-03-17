'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface Vendor {
  id: number;
  name: string;
  code?: string | null;
  vendorType?: string | null;
  specialization?: string | null;
  phone?: string | null;
  isActive: boolean;
}

const emptyForm = { name: '', code: '', vendorType: '', specialization: '', phone: '', isActive: true };

export default function VendorsPage() {
  const [items, setItems] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/vendors?limit=200');
      if (res.ok) setItems((await res.json()).vendors || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = editingId ? `/api/vendors/${editingId}` : '/api/vendors';
      const res = editingId
        ? await apiClient.put(endpoint, form)
        : await apiClient.post(endpoint, form);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to save vendor');
        return;
      }
      setEditingId(null);
      setForm(emptyForm);
      await fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm('Delete this vendor?')) return;
    const res = await apiClient.delete(`/api/vendors/${id}`);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to delete vendor');
      return;
    }
    await fetchItems();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/masters" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Masters"><svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Link>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Vendors</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 lg:col-span-1 h-fit text-sm">
          <h2 className="font-semibold text-gray-900">{editingId ? 'Edit Vendor' : 'New Vendor'}</h2>
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Vendor Type" value={form.vendorType} onChange={(e) => setForm({ ...form, vendorType: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          <div className="flex flex-wrap gap-2">
            <button disabled={saving} className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{editingId ? 'Update' : 'Create'}</button>
            {editingId && <button type="button" className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm border rounded" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}
          </div>
        </form>

        <section className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Vendor List</h2>
          {loading ? <p className="text-gray-600">Loading...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs sm:text-sm">
                <thead><tr className="text-left border-b"><th className="py-2">Name</th><th>Type</th><th>Specialization</th><th>Phone</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 font-medium">{item.name}</td><td>{item.vendorType || '-'}</td><td>{item.specialization || '-'}</td><td>{item.phone || '-'}</td><td>{item.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="text-right space-x-2"><button className="text-blue-600 text-xs sm:text-sm" onClick={() => { setEditingId(item.id); setForm({ name: item.name || '', code: item.code || '', vendorType: item.vendorType || '', specialization: item.specialization || '', phone: item.phone || '', isActive: item.isActive }); }}>Edit</button><button className="text-red-600 text-xs sm:text-sm" onClick={() => onDelete(item.id)}>Delete</button></td>
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
