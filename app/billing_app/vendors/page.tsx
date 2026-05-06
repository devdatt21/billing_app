'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Loader from '@/components/Loader';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

interface VendorRow {
  id: number;
  name: string;
  vendorType?: string | null;
  specialization?: string | null;
  isActive: boolean;
  openJobs: number;
  completedJobs: number;
  issuedWeight: string;
  returnedWeight: string;
  totalLabor: string;
  paidAmount: string;
  dueAmount: string;
}

function money(value: string | number): string {
  return `Rs ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function VendorsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const loadVendors = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/api/vendors');
        if (!res.ok) {
          setVendors([]);
          return;
        }

        const data = await res.json();
        setVendors(data.vendors || []);
      } finally {
        setLoading(false);
      }
    };

    loadVendors();
  }, [user]);

  const filteredVendors = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return vendors;

    return vendors.filter((vendor) => {
      return [
        vendor.name,
        vendor.vendorType || '',
        vendor.specialization || '',
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [vendors, query]);

  const totals = useMemo(() => {
    return vendors.reduce(
      (acc, vendor) => ({
        openJobs: acc.openJobs + vendor.openJobs,
        totalLabor: acc.totalLabor + Number(vendor.totalLabor || 0),
        paidAmount: acc.paidAmount + Number(vendor.paidAmount || 0),
        dueAmount: acc.dueAmount + Number(vendor.dueAmount || 0),
      }),
      { openJobs: 0, totalLabor: 0, paidAmount: 0, dueAmount: 0 }
    );
  }, [vendors]);

  if (!user && !isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/billing_app" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Billing">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Vendor Ledger</h1>
          </div>
          <p className="hidden max-w-3xl truncate text-sm text-gray-600 md:block">
            Review vendor work history, active jobs, payments, and dues.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {loading || isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader />
          </div>
        ) : (
          <div className="space-y-5">
            <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Open Jobs</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{totals.openJobs}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Work Value</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{money(totals.totalLabor)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Paid</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{money(totals.paidAmount)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Due</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{money(totals.dueAmount)}</p>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-gray-900">Vendors</h2>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search vendor, type, specialization"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-sm"
                />
              </div>

              {filteredVendors.length === 0 ? (
                <p className="py-8 text-center text-gray-600">No vendors found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead className="border-b bg-gray-50 text-left text-gray-700">
                      <tr>
                        <th className="px-3 py-3">Vendor</th>
                        <th className="px-3 py-3">Work</th>
                        <th className="px-3 py-3 text-right">Issued</th>
                        <th className="px-3 py-3 text-right">Returned</th>
                        <th className="px-3 py-3 text-right">Work Value</th>
                        <th className="px-3 py-3 text-right">Paid</th>
                        <th className="px-3 py-3 text-right">Due</th>
                        <th className="px-3 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendors.map((vendor) => (
                        <tr key={vendor.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900">{vendor.name}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {[vendor.vendorType, vendor.specialization].filter(Boolean).join(' / ') || 'General vendor'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {vendor.openJobs} open / {vendor.completedJobs} completed
                          </td>
                          <td className="px-3 py-3 text-right">{Number(vendor.issuedWeight).toFixed(3)} ct</td>
                          <td className="px-3 py-3 text-right">{Number(vendor.returnedWeight).toFixed(3)} ct</td>
                          <td className="px-3 py-3 text-right">{money(vendor.totalLabor)}</td>
                          <td className="px-3 py-3 text-right">{money(vendor.paidAmount)}</td>
                          <td className="px-3 py-3 text-right font-semibold text-gray-900">{money(vendor.dueAmount)}</td>
                          <td className="px-3 py-3 text-right">
                            <Link
                              href={`/billing_app/vendors/${vendor.id}`}
                              className="inline-flex rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600"
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
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
