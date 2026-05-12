'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CompanySelect, { Company } from '@/components/CompanySelect';
import InvoiceLineEditor, { InvoiceLine } from '@/components/InvoiceLineEditor';
import InvoiceSummary from '@/components/InvoiceSummary';
import { calcInvoiceTotals } from '@/utils/calcTax';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';
import Loader from '@/components/Loader';

interface InvoiceData {
  id: number;
  invoiceNo: string;
  date: string;
  heading?: string | null;
  seller: Company;
  buyer: Company;
  deliveryNote?: string | null;
  terms?: string | null;
  lines: Array<{
    id: number;
    description: string;
    hsn?: string | null;
    qty: string | number | { toString(): string };
    unit?: string | null;
    rate: string | number | { toString(): string };
    amount?: string | number | { toString(): string };
  }>;
  sgstRate: string | number | { toString(): string };
  cgstRate: string | number | { toString(): string };
}

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seller, setSeller] = useState<Company | null>(null);
  const [buyer, setBuyer] = useState<Company | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [heading, setHeading] = useState('TAX INVOICE');
  const [customHeading, setCustomHeading] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [terms, setTerms] = useState('');
  const [sgstPct, setSgstPct] = useState('0.75');
  const [cgstPct, setCgstPct] = useState('0.75');
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      id: 'line-1',
      description: '',
      hsn: '',
      qty: '1',
      unit: 'Cts',
      rate: '',
      amount: '0.00',
    },
  ]);

  // Fetch invoice data on mount
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await apiClient.get(`/api/invoices/${params.id}`);
        if (response.ok) {
          const data: InvoiceData = await response.json();
          setInvoiceNo(data.invoiceNo);
          setSeller(data.seller);
          setBuyer(data.buyer);
          setHeading(data.heading === 'TAX INVOICE' ? 'TAX INVOICE' : 'CUSTOM');
          if (data.heading && data.heading !== 'TAX INVOICE') {
            setCustomHeading(data.heading);
          }
          setDate(data.date.split('T')[0]);
          setDeliveryNote(data.deliveryNote || '');
          setTerms(data.terms || '');
          // Convert Decimal values to strings - handle both Decimal objects and regular numbers
          const sgstVal = typeof data.sgstRate === 'string' 
            ? data.sgstRate 
            : typeof data.sgstRate === 'number' 
            ? String(data.sgstRate)
            : data.sgstRate.toString();
          const cgstVal = typeof data.cgstRate === 'string' 
            ? data.cgstRate 
            : typeof data.cgstRate === 'number' 
            ? String(data.cgstRate)
            : data.cgstRate.toString();
          setSgstPct(sgstVal);
          setCgstPct(cgstVal);
          // Convert line items to ensure qty, rate, and amount are strings
          const convertedLines = data.lines.map((line) => ({
            id: String(line.id),
            description: line.description,
            hsn: line.hsn || '',
            qty: typeof line.qty === 'string' ? line.qty : String(line.qty),
            unit: line.unit || 'Cts',
            rate: typeof line.rate === 'string' ? line.rate : String(line.rate),
            amount: typeof line.amount === 'string' ? line.amount : String(line.amount),
          }));
          setLines(convertedLines);
        } else {
          toast.error('Failed to load invoice');
          router.push('/invoices');
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast.error('Failed to load invoice');
        router.push('/invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [params.id, toast, router]);

  // Calculate totals whenever lines or tax rates change
  const totals = calcInvoiceTotals(
    lines.map((l) => ({ qty: l.qty, rate: l.rate })),
    sgstPct,
    cgstPct,
    'HALF_UP'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!seller || !buyer) {
      toast.warning('Please select both seller and buyer');
      return;
    }

    if (lines.some((line) => !line.description || !line.qty || !line.rate)) {
      toast.warning('Please fill in all required line item fields');
      return;
    }

    setSaving(true);

    try {
      const response = await apiClient.put(`/api/invoices/${params.id}`, {
        heading: heading === 'CUSTOM' ? customHeading : heading,
        seller,
        buyer,
        deliveryNote: deliveryNote || null,
        terms: terms || null,
        lines: lines.map((line) => ({
          id: line.id,
          description: line.description,
          hsn: line.hsn || null,
          qty: line.qty,
          unit: line.unit || null,
          rate: line.rate,
        })),
        sgstPct,
        cgstPct,
        roundingMode: 'HALF_UP',
      });

      if (response.ok) {
        toast.success('Invoice updated successfully.');
        router.push(`/invoices/${params.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-6xl mx-auto flex min-h-16 items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 dark:hover:bg-slate-800"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Billing • Edit Invoice</h1>
          </div>
          <p className="hidden max-w-2xl truncate text-sm text-gray-600 dark:text-gray-400 md:block">
            Update invoice details, items, and tax information.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto p-3 sm:p-4 pb-24">
        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">Invoice Details</h2>

          <div className="grid grid-cols-1 gap-4">
            {/* Document Type/Heading */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                Document Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHeading('TAX INVOICE')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    heading === 'TAX INVOICE'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
                  }`}
                >
                  Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setHeading('CUSTOM')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    heading === 'CUSTOM'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300'
                  }`}
                >
                  Custom
                </button>
              </div>
              {heading === 'CUSTOM' && (
                <input
                  type="text"
                  value={customHeading}
                  onChange={(e) => setCustomHeading(e.target.value)}
                  placeholder="Enter custom heading"
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                />
              )}
            </div>

            {/* Invoice Number and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Invoice numbers cannot be edited</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                  required
                />
              </div>
            </div>

            {/* Seller and Buyer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Seller <span className="text-red-500">*</span>
                </label>
                <CompanySelect value={seller} onChange={setSeller} label="Seller" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Buyer <span className="text-red-500">*</span>
                </label>
                <CompanySelect value={buyer} onChange={setBuyer} label="Buyer" required />
              </div>
            </div>

            {/* Delivery Note and Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Delivery Note
                </label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="e.g. By Road, Air, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Terms of Delivery
                </label>
                <input
                  type="text"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="e.g. FOB, CIF, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Tax Rates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  SGST (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={sgstPct}
                  onChange={(e) => setSgstPct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  CGST (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cgstPct}
                  onChange={(e) => setCgstPct(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Editor */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 dark:bg-slate-900 dark:border-slate-800">
          <InvoiceLineEditor lines={lines} onChange={setLines} />
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 dark:bg-slate-900 dark:border-slate-800">
          <InvoiceSummary
            subtotal={totals.subtotal}
            sgstRate={sgstPct}
            cgstRate={cgstPct}
            sgstAmount={totals.sgstAmount}
            cgstAmount={totals.cgstAmount}
            totalTax={totals.totalTax}
            rounding={totals.rounding}
            totalAmount={totals.totalAmount}
            isInterState={seller?.stateCode !== buyer?.stateCode && !!seller?.stateCode && !!buyer?.stateCode}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-medium transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
