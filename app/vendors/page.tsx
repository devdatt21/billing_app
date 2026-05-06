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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Back to Home">
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Vendor Ledger</h1>
          </div>
          <p className="hidden max-w-3xl truncate text-sm text-gray-600 dark:text-gray-400 md:block">
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
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Open Jobs</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{totals.openJobs}</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Work Value</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{money(totals.totalLabor)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{money(totals.paidAmount)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Due</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{money(totals.dueAmount)}</p>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Vendors</h2>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search vendor, type, specialization"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 sm:max-w-sm"
                />
              </div>

              {filteredVendors.length === 0 ? (
                <p className="py-8 text-center text-gray-600 dark:text-gray-400">No vendors found.</p>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[920px] text-sm">
                      <thead className="border-b bg-gray-50 dark:bg-gray-700 text-left text-gray-700 dark:text-gray-200">
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
                          <tr key={vendor.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-3 py-3">
                              <div className="font-medium text-gray-900 dark:text-white">{vendor.name}</div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {[vendor.vendorType, vendor.specialization].filter(Boolean).join(' / ') || 'General vendor'}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                              {vendor.openJobs} open / {vendor.completedJobs} completed
                            </td>
                            <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{Number(vendor.issuedWeight).toFixed(3)} ct</td>
                            <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{Number(vendor.returnedWeight).toFixed(3)} ct</td>
                            <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{money(vendor.totalLabor)}</td>
                            <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{money(vendor.paidAmount)}</td>
                            <td className="px-3 py-3 text-right font-semibold text-gray-900 dark:text-white">{money(vendor.dueAmount)}</td>
                            <td className="px-3 py-3 text-right">
                              <Link
                                href={`/vendors/${vendor.id}`}
                                className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
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
                    {filteredVendors.map((vendor) => (
                      <div key={vendor.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="font-semibold text-gray-800 dark:text-white text-base">{vendor.name}</div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {vendor.openJobs} open
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {[vendor.vendorType, vendor.specialization].filter(Boolean).join(' / ') || 'General vendor'}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 dark:border-gray-700 pt-2">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block text-xs">Issued Weight</span>
                            <span className="font-medium text-gray-800 dark:text-white">{Number(vendor.issuedWeight).toFixed(3)} ct</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block text-xs">Returned</span>
                            <span className="font-medium text-gray-800 dark:text-white">{Number(vendor.returnedWeight).toFixed(3)} ct</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block text-xs">Work Value</span>
                            <span className="font-medium text-gray-800 dark:text-white">{money(vendor.totalLabor)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block text-xs">Due</span>
                            <span className="font-semibold text-gray-800 dark:text-white">{money(vendor.dueAmount)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 dark:border-gray-700 pt-2">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block text-xs">Paid</span>
                            <span className="font-medium text-gray-800 dark:text-white">{money(vendor.paidAmount)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block text-xs">Completed</span>
                            <span className="font-medium text-gray-800 dark:text-white">{vendor.completedJobs}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <Link
                            href={`/vendors/${vendor.id}`}
                            className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-center"
                          >
                            Open Vendor
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
