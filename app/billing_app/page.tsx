'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Loader from '@/components/Loader';

export default function BillingHome() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <Loader fullScreen text="Loading..." />;
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
          <h1 className="text-xl font-bold text-gray-900">Billing Module</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        <p className="text-gray-600 mb-6">Manage invoices, billing entities, purchase bills, and reset operations.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/billing_app/invoices/create"
            className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
            <p className="text-sm text-gray-600 mt-1">Create new invoices with tax calculations and line items.</p>
          </Link>

          <Link
            href="/billing_app/invoices"
            className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
            <p className="text-sm text-gray-600 mt-1">Browse, search, and manage invoice records.</p>
          </Link>

          <Link
            href="/billing_app/companies"
            className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">Companies</h2>
            <p className="text-sm text-gray-600 mt-1">Maintain seller and buyer company master data.</p>
          </Link>

          <Link
            href="/billing_app/purchase-invoices"
            className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">Purchase Invoices</h2>
            <p className="text-sm text-gray-600 mt-1">Upload and track purchase bills for audit and records.</p>
          </Link>

        </div>
      </main>
    </div>
  );
}
