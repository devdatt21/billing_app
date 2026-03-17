'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CompanySelect, { Company } from '@/components/CompanySelect';
import InvoiceLineEditor, { InvoiceLine } from '@/components/InvoiceLineEditor';
import InvoiceSummary from '@/components/InvoiceSummary';
import { calcInvoiceTotals } from '@/utils/calcTax';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';

export default function InvoiceEditorPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [seller, setSeller] = useState<Company | null>(null);
  const [buyer, setBuyer] = useState<Company | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [heading, setHeading] = useState('TAX INVOICE');
  const [customHeading, setCustomHeading] = useState('');
  const [loadingInvoiceNo, setLoadingInvoiceNo] = useState(true);
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

  // Fetch next invoice number on mount
  useEffect(() => {
    const fetchNextInvoiceNumber = async () => {
      try {
        const response = await apiClient.get('/api/invoices/next-number');
        if (response.ok) {
          const data = await response.json();
          setInvoiceNo(data.nextNumber);
        }
      } catch (error) {
        console.error('Failed to fetch next invoice number:', error);
      } finally {
        setLoadingInvoiceNo(false);
      }
    };

    fetchNextInvoiceNumber();
  }, []);

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

    setLoading(true);

    try {
      const response = await apiClient.post('/api/invoices', {
        invoiceNo,
        date,
        heading: heading === 'CUSTOM' ? customHeading : heading,
        seller,
        buyer,
        deliveryNote: deliveryNote || null,
        terms: terms || null,
        lines: lines.map((line) => ({
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
        const invoice = await response.json();
        toast.success('Invoice created successfully.');
        router.push(`/billing_app/invoices/${invoice.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-3 sm:px-4 py-3 flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Billing • Create Invoice</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 pb-6">
        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Document Type/Heading */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['TAX INVOICE', 'DELIVERY CHALLAN', 'CUSTOM'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setHeading(option)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      heading === option
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {option === 'CUSTOM' ? 'Custom' : option}
                  </button>
                ))}
              </div>
              {heading === 'CUSTOM' && (
                <input
                  type="text"
                  value={customHeading}
                  onChange={(e) => setCustomHeading(e.target.value.toUpperCase())}
                  placeholder="Enter custom heading (e.g., PROFORMA INVOICE)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder={loadingInvoiceNo ? "Loading..." : "INV-001"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loadingInvoiceNo}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated. You can edit if needed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Seller */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <CompanySelect
            value={seller}
            onChange={setSeller}
            label="Seller (From)"
            placeholder="Search seller by name, GSTIN, or phone..."
            roleFilter="seller"
            required
          />
        </div>

        {/* Buyer */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <CompanySelect
            value={buyer}
            onChange={setBuyer}
            label="Buyer (To)"
            placeholder="Search buyer by name, GSTIN, or phone..."
            roleFilter="buyer"
            required
          />
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <InvoiceLineEditor lines={lines} onChange={setLines} />
        </div>

        {/* Tax Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Settings</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SGST % <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={sgstPct}
                onChange={(e) => setSgstPct(e.target.value)}
                placeholder="0.75"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CGST % <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={cgstPct}
                onChange={(e) => setCgstPct(e.target.value)}
                placeholder="0.75"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* Optional Fields */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Note
              </label>
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Optional delivery note"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms & Conditions
              </label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Optional terms and conditions"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-4">
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

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 z-30 border border-gray-200 bg-white/95 shadow-lg backdrop-blur-sm rounded-lg">
          <div className="px-4 py-3 flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 active:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
          </div>
        </div>
      </form>
    </div>
  );
}
