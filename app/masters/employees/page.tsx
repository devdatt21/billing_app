'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';

interface Employee {
  id: number;
  name: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  isActive: boolean;
}

const emptyForm = {
  name: '',
  code: '',
  email: '',
  phone: '',
  designation: '',
  department: '',
  joinDate: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  stateCode: '',
  bankName: '',
  bankAccount: '',
  ifsc: '',
  panNumber: '',
  aadharNumber: '',
  isActive: true,
};

export default function EmployeesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/employees?limit=200');
      if (res.ok) setItems((await res.json()).employees || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = editingId ? `/api/employees/${editingId}` : '/api/employees';
      const res = editingId
        ? await apiClient.put(endpoint, form)
        : await apiClient.post(endpoint, form);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to save employee');
        return;
      }
      setEditingId(null);
      setForm(emptyForm);
      await fetchItems();
      toast.success(editingId ? 'Employee updated successfully' : 'Employee created successfully');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (item: Employee) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      code: item.code || '',
      email: item.email || '',
      phone: item.phone || '',
      designation: item.designation || '',
      department: item.department || '',
      joinDate: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      stateCode: '',
      bankName: '',
      bankAccount: '',
      ifsc: '',
      panNumber: '',
      aadharNumber: '',
      isActive: item.isActive,
    });
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this employee?')) return;
    const res = await apiClient.delete(`/api/employees/${id}`);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || 'Failed to delete employee');
      return;
    }
    await fetchItems();
    toast.success('Employee deleted successfully');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/masters" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Masters">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Employees</h1>
          </div>
          <p className="hidden max-w-3xl truncate text-sm text-gray-600 md:block">
            Manage employee records with contact details and banking information.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 lg:col-span-1 h-fit text-sm">
          <h2 className="font-semibold text-gray-900">{editingId ? 'Edit Employee' : 'New Employee'}</h2>
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Join Date" type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Address Line 1" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Address Line 2" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="PAN Number" value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Aadhar Number" value={form.aadharNumber} onChange={(e) => setForm({ ...form, aadharNumber: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Bank Name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="Bank Account" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
          <input className="w-full px-3 py-1.5 sm:py-2 border rounded text-sm" placeholder="IFSC Code" value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          <div className="flex flex-wrap gap-2">
            <button disabled={saving} className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{editingId ? 'Update' : 'Create'}</button>
            {editingId && <button type="button" className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm border rounded" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}
          </div>
        </form>

        <section className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Employees</h2>
          {loading ? <p className="text-gray-600">Loading...</p> : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="inline-block min-w-full px-3 sm:px-0">
                <table className="w-full min-w-[600px] text-xs sm:text-sm">
                  <thead><tr className="text-left border-b"><th className="py-2 px-2 sm:px-3">Name</th><th className="px-2 sm:px-3">Email</th><th className="px-2 sm:px-3">Phone</th><th className="px-2 sm:px-3">Designation</th><th className="px-2 sm:px-3">Status</th><th className="text-right px-2 sm:px-3">Actions</th></tr></thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2 sm:px-3 font-medium break-words">{item.name}</td>
                        <td className="px-2 sm:px-3 break-words">{item.email || '-'}</td>
                        <td className="px-2 sm:px-3 whitespace-nowrap">{item.phone || '-'}</td>
                        <td className="px-2 sm:px-3">{item.designation || '-'}</td>
                        <td className="px-2 sm:px-3 whitespace-nowrap">{item.isActive ? 'Active' : 'Inactive'}</td>
                        <td className="text-right space-x-2 px-2 sm:px-3"><button className="text-blue-600 text-xs sm:text-sm" onClick={() => onEdit(item)}>Edit</button><button className="text-red-600 text-xs sm:text-sm" onClick={() => onDelete(item.id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
