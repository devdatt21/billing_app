'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatIndianCurrency } from '@/utils/formatting';
import { apiClient } from '@/lib/api-client';
import Loader from '@/components/Loader';

interface Invoice {
  id: number;
  invoiceNo: string;
  date: string;
  seller: { name: string };
  buyer: { name: string };
  totalAmount: string;
}

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/invoices?page=${page}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 dark:hover:bg-slate-800"
              aria-label="Back to Home"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Billing • Invoices</h1>
          </div>
          <p className="hidden max-w-2xl truncate text-sm text-gray-600 dark:text-gray-400 md:block">
            Browse, search, and manage invoice records for sales.
          </p>
          <Link
            href="/invoices/create"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
          >
            <span className="hidden sm:inline">+ New Invoice</span>
            <span className="sm:hidden">+ New</span>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size="lg" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center dark:bg-slate-900 dark:border-slate-800">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 dark:text-gray-100">No invoices yet</h3>
            <p className="text-gray-600 mb-6 dark:text-gray-400">Get started by creating your first invoice</p>
            <Link
              href="/invoices/create"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Invoice
            </Link>
          </div>
        ) : (
          <>
            {/* Invoices List */}
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800"
                >
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="block"
                  >
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{invoice.invoiceNo}</h3>
                      
                      <div className="text-sm text-gray-600 space-y-2 dark:text-gray-400">
                        <div>
                          <span className="font-medium dark:text-gray-300">From:</span>
                          <div className="dark:text-gray-300">{invoice.seller.name}</div>
                        </div>
                        <div>
                          <span className="font-medium dark:text-gray-300">To:</span>
                          <div className="dark:text-gray-300">{invoice.buyer.name}</div>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatIndianCurrency(invoice.totalAmount)}
                        </div>
                        <div className="text-sm text-gray-500 hover:text-gray-700 mt-1 dark:text-gray-400 dark:hover:text-gray-300">
                          View Details →
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
                    <Link
                      href={`/invoices/${invoice.id}/edit`}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium text-center transition-colors dark:hover:bg-blue-500"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm font-medium text-center transition-colors dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
