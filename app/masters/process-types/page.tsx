'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';

type Stage = 'CUTTING' | 'SARIN_MEASUREMENT' | 'POLISHING' | 'READY_INVENTORY' | 'SOLD';

interface ProcessType {
  id: number;
  name: string;
  stage: Stage;
  sequence: number;
  isActive: boolean;
  description?: string | null;
  color?: string;
}

const emptyForm: { name: string; stage: Stage; sequence: number; isActive: boolean; description: string; color: string } = {
  name: '',
  stage: 'CUTTING',
  sequence: 1,
  isActive: true,
  description: '',
  color: '#10b981',
};

export default function ProcessTypesPage() {
  const toast = useToast();
  const [items, setItems] = useState<ProcessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/process-types');
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.processTypes || [];
        setItems(items);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = editingId ? `/api/process-types/${editingId}` : '/api/process-types';
      const res = editingId
        ? await apiClient.put(endpoint, form)
        : await apiClient.post(endpoint, form);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save process type' }));
        toast.error(err.error || 'Failed to save process type');
        return;
      }
      setEditingId(null);
      setForm(emptyForm);
      await fetchItems();
      toast.success(editingId ? 'Process type updated successfully' : 'Process type created successfully');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this process type?')) return;
    const res = await apiClient.delete(`/api/process-types/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete process type' }));
      toast.error(err.error || 'Failed to delete process type');
      return;
    }
    await fetchItems();
    toast.success('Process type deleted successfully');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/masters" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Masters"><svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Process Flow Master</h1>
          </div>
          <p className="hidden max-w-3xl truncate text-sm text-gray-600 md:block">
            Configure the stage sequence from purchase to sale.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 lg:col-span-1 h-fit text-sm">
          <h2 className="font-semibold text-gray-900">{editingId ? 'Edit Step' : 'New Step'}</h2>
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })}>
            <option value="CUTTING">CUTTING</option>
            <option value="SARIN_MEASUREMENT">SARIN_MEASUREMENT</option>
            <option value="POLISHING">POLISHING</option>
            <option value="READY_INVENTORY">READY_INVENTORY</option>
            <option value="SOLD">SOLD</option>
          </select>
          <input type="number" min={1} className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Sequence" value={form.sequence} onChange={(e) => setForm({ ...form, sequence: Number(e.target.value) || 1 })} />
          <div className="flex items-center gap-2">
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-14 border rounded cursor-pointer" />
            <span className="text-xs text-gray-600">{form.color}</span>
          </div>
          <textarea className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          <div className="flex flex-wrap gap-2">
            <button disabled={saving} className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{editingId ? 'Update' : 'Create'}</button>
            {editingId && <button type="button" className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm border rounded" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}
          </div>
        </form>

        <section className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Configured Flow Steps</h2>
          {loading ? <p className="text-gray-600">Loading...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs sm:text-sm">
                <thead><tr className="text-left border-b"><th className="py-2">Name</th><th>Stage</th><th>Seq</th><th>Color</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 font-medium">{item.name}</td><td>{item.stage}</td><td>{item.sequence}</td>
                      <td><div className="w-6 h-6 rounded-full border" style={{ backgroundColor: item.color || '#10b981' }} title={item.color} /></td>
                      <td>{item.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="text-right space-x-2"><button className="text-blue-600 text-xs sm:text-sm" onClick={() => { setEditingId(item.id); setForm({ name: item.name, stage: item.stage, sequence: item.sequence, isActive: item.isActive, description: item.description || '', color: item.color || '#10b981' }); }}>Edit</button><button className="text-red-600 text-xs sm:text-sm" onClick={() => onDelete(item.id)}>Delete</button></td>
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
