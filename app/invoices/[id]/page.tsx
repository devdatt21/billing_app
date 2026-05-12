'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIndianCurrency, numberToWords } from '@/utils/formatting';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';
import { DetailPageSkeleton } from '@/components/PageSkeleton';

interface Company {
  id: number;
  name: string;
  gstin?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
}

interface InvoiceLine {
  id: number;
  description: string;
  hsn?: string | null;
  qty: string;
  unit?: string | null;
  rate: string;
  amount: string;
}

interface Invoice {
  id: number;
  invoiceNo: string;
  date: string;
  seller: Company;
  buyer: Company;
  deliveryNote?: string | null;
  terms?: string | null;
  lines: InvoiceLine[];
  subtotal: string;
  sgstRate: string;
  cgstRate: string;
  sgstAmount: string;
  cgstAmount: string;
  totalTax: string;
  rounding: string;
  totalAmount: string;
  amountInWords?: string | null;
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    try {
      const response = await apiClient.get(`/api/invoices/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Invoice not found');
        } else {
          setError('Failed to load invoice');
        }
        return;
      }

      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleDownloadPDF = async () => {
    try {
      const response = await apiClient.get(`/api/invoices/${params.id}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.invoiceNo.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  if (!loading && (error || !invoice)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{error || 'Invoice not found'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The invoice you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <button
            onClick={() => router.push('/invoices')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View All Invoices
          </button>
        </div>
      </div>
    );
  }

  const invoiceData = invoice ?? ({} as Invoice);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - No Print */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm no-print">
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => router.push('/invoices')}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              aria-label="Back to Invoices"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Billing • Invoice Details</h1>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
          >
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
          <button
            onClick={() => router.push(`/invoices/${params.id}/edit`)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
          >
            <span className="hidden sm:inline">Edit Invoice</span>
            <span className="sm:hidden">Edit</span>
          </button>
        </div>
      </header>

      {/* Invoice Content */}
      <div className="max-w-5xl mx-auto p-3 sm:p-6 lg:p-8">
        {loading ? (
          <DetailPageSkeleton />
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 lg:p-8">
            {/* Invoice Header */}
            <div className="border-b-2 border-gray-900 dark:border-gray-400 pb-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">INVOICE</h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Invoice No: <span className="font-semibold">{invoiceData.invoiceNo}</span></p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Date: <span className="font-semibold">{new Date(invoiceData.date).toLocaleDateString('en-IN')}</span></p>
              </div>
            </div>
          </div>

          {/* Seller & Buyer Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Seller */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">From (Seller)</h3>
              <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">{invoiceData.seller.name}</h4>
              {invoiceData.seller.addressLine1 && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{invoiceData.seller.addressLine1}</p>}
              {invoiceData.seller.addressLine2 && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{invoiceData.seller.addressLine2}</p>}
              {invoiceData.seller.city && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{invoiceData.seller.city}, {invoiceData.seller.state}</p>}
              {invoiceData.seller.gstin && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-2"><span className="font-semibold">GSTIN:</span> {invoiceData.seller.gstin}</p>}
              {invoiceData.seller.phone && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300"><span className="font-semibold">Phone:</span> {invoiceData.seller.phone}</p>}
              
              {/* Bank Details */}
              {invoiceData.seller.bankName && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Bank Details:</p>
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{invoiceData.seller.bankName}</p>
                  {invoiceData.seller.bankAccount && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">A/c: {invoiceData.seller.bankAccount}</p>}
                  {invoiceData.seller.ifsc && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">IFSC: {invoiceData.seller.ifsc}</p>}
                </div>
              )}
            </div>

            {/* Buyer */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">To (Buyer)</h3>
              <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">{invoiceData.buyer.name}</h4>
              {invoiceData.buyer.addressLine1 && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{invoiceData.buyer.addressLine1}</p>}
              {invoiceData.buyer.addressLine2 && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{invoiceData.buyer.addressLine2}</p>}
              {invoiceData.buyer.city && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{invoiceData.buyer.city}, {invoiceData.buyer.state}</p>}
              {invoiceData.buyer.gstin && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-2"><span className="font-semibold">GSTIN:</span> {invoiceData.buyer.gstin}</p>}
              {invoiceData.buyer.phone && <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300"><span className="font-semibold">Phone:</span> {invoiceData.buyer.phone}</p>}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-6 sm:mb-8 overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="text-left px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">#</th>
                  <th className="text-left px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">Description</th>
                  <th className="text-left px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">HSN</th>
                  <th className="text-right px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">Qty</th>
                  <th className="text-left px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">Unit</th>
                  <th className="text-right px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">Rate</th>
                  <th className="text-right px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.lines.map((line, index) => (
                  <tr key={line.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">{index + 1}</td>
                    <td className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white font-medium">{line.description}</td>
                    <td className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">{line.hsn || '-'}</td>
                    <td className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-right">{parseFloat(line.qty).toFixed(3)}</td>
                    <td className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">{line.unit || '-'}</td>
                    <td className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-right whitespace-nowrap">{formatIndianCurrency(line.rate)}</td>
                    <td className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-white font-semibold text-right whitespace-nowrap">{formatIndianCurrency(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 sm:gap-8 mt-6">
            <div className="w-full sm:w-auto sm:min-w-[280px] lg:min-w-[320px]">
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-2">
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Subtotal:</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatIndianCurrency(invoiceData.subtotal)}</span>
                </div>
                
                {/* Show IGST for inter-state or SGST+CGST for intra-state */}
                {invoiceData.seller.stateCode?.trim() && invoiceData.buyer.stateCode?.trim() && invoiceData.seller.stateCode?.trim() !== invoiceData.buyer.stateCode?.trim() ? (
                  <div className="flex justify-between items-center pb-2">
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">IGST @ {(parseFloat(invoiceData.sgstRate) + parseFloat(invoiceData.cgstRate)).toFixed(2)}%:</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatIndianCurrency((parseFloat(invoiceData.sgstAmount) + parseFloat(invoiceData.cgstAmount)).toFixed(2))}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">SGST @ {invoiceData.sgstRate}%:</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatIndianCurrency(invoiceData.sgstAmount)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">CGST @ {invoiceData.cgstRate}%:</span>
                      <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatIndianCurrency(invoiceData.cgstAmount)}</span>
                    </div>
                  </>
                )}
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Total Tax:</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{formatIndianCurrency(invoiceData.totalTax)}</span>
                </div>
                
                {parseFloat(invoiceData.rounding) !== 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Rounding:</span>
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      {parseFloat(invoiceData.rounding) > 0 ? '+' : ''}{formatIndianCurrency(invoiceData.rounding)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-3 border-t-2 border-gray-900 dark:border-gray-300 mt-3">
                  <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Total Amount:</span>
                  <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{formatIndianCurrency(invoiceData.totalAmount)}</span>
                </div>
              </div>

              {/* Amount in Words */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Amount in Words:</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                  {invoiceData.amountInWords || numberToWords(invoiceData.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {(invoiceData.deliveryNote || invoiceData.terms) && (
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-300 dark:border-gray-600">
              {invoiceData.deliveryNote && (
                <div className="mb-4">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Delivery Note:</h4>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{invoiceData.deliveryNote}</p>
                </div>
              )}
              
              {invoiceData.terms && (
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Terms & Conditions:</h4>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{invoiceData.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Signature Section */}
          <div className="mt-8 sm:mt-12 pt-6 border-t border-gray-300 dark:border-gray-600">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Customer Seal & Signature */}
              <div className="flex flex-col">
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 h-32 sm:h-40 bg-gray-50 dark:bg-gray-700/50">
                  {/* Empty space for stamp/seal */}
                </div>
                <div className="mt-3 text-center">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Customer Seal & Signature</p>
                </div>
              </div>

              {/* Authorized Signatory */}
              <div className="flex flex-col">
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 h-32 sm:h-40 bg-gray-50 dark:bg-gray-700/50 flex items-end justify-end">
                  <div className="text-right">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{invoiceData.seller.name}</p>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-300 dark:border-gray-600 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Thank you for your business!</p>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
