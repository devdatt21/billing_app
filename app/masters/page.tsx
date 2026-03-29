'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ListPageSkeleton } from '@/components/PageSkeleton';

export default function MastersHomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (!user && !isLoading) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Home">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">ERP • Master Data</h1>
          </div>
          <p className="hidden max-w-3xl truncate text-sm text-gray-600 md:block">
            Manage foundational records used by purchase, process, sale, and payment workflows.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        {isLoading ? (
          <ListPageSkeleton />
        ) : (
          <>
            <p className="text-gray-600 mb-6">Manage foundational records used by purchase, process, sale, and payment workflows.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/masters/suppliers" className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Suppliers</h2>
                <p className="text-sm text-gray-600 mt-1">Purchase-side parties and source records.</p>
              </Link>
              <Link href="/masters/vendors" className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Vendors</h2>
                <p className="text-sm text-gray-600 mt-1">Job-work and process execution partners.</p>
              </Link>
              <Link href="/masters/customers" className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
                <p className="text-sm text-gray-600 mt-1">Sale-side buyers for lot realization.</p>
              </Link>
              <Link href="/masters/process-types" className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Process Flow</h2>
                <p className="text-sm text-gray-600 mt-1">Configure stage sequence from purchase to sale.</p>
              </Link>
              <Link href="/masters/employees" className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Employees</h2>
                <p className="text-sm text-gray-600 mt-1">Manage employee records and banking details.</p>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
