'use client';

import { formatIndianCurrency, numberToWords } from '@/utils/formatting';

interface InvoiceSummaryProps {
  subtotal: string;
  sgstRate: string;
  cgstRate: string;
  sgstAmount: string;
  cgstAmount: string;
  totalTax: string;
  rounding: string;
  totalAmount: string;
}

export default function InvoiceSummary({
  subtotal,
  sgstRate,
  cgstRate,
  sgstAmount,
  cgstAmount,
  totalTax,
  rounding,
  totalAmount,
}: InvoiceSummaryProps) {
  const amountInWords = numberToWords(totalAmount);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Invoice Summary</h3>

      {/* Subtotal */}
      <div className="flex justify-between items-center">
        <span className="text-gray-700">Subtotal:</span>
        <span className="font-semibold text-gray-900">{formatIndianCurrency(subtotal)}</span>
      </div>

      {/* SGST */}
      <div className="flex justify-between items-center">
        <span className="text-gray-700">
          SGST @ {sgstRate}%:
        </span>
        <span className="font-semibold text-gray-900">{formatIndianCurrency(sgstAmount)}</span>
      </div>

      {/* CGST */}
      <div className="flex justify-between items-center">
        <span className="text-gray-700">
          CGST @ {cgstRate}%:
        </span>
        <span className="font-semibold text-gray-900">{formatIndianCurrency(cgstAmount)}</span>
      </div>

      {/* Total Tax */}
      <div className="flex justify-between items-center border-t pt-2">
        <span className="text-gray-700 font-medium">Total Tax:</span>
        <span className="font-semibold text-gray-900">{formatIndianCurrency(totalTax)}</span>
      </div>

      {/* Rounding (if not zero) */}
      {parseFloat(rounding) !== 0 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Rounding:</span>
          <span className="font-medium text-gray-700">
            {parseFloat(rounding) > 0 ? '+' : ''}{formatIndianCurrency(rounding)}
          </span>
        </div>
      )}

      {/* Total Amount */}
      <div className="flex justify-between items-center border-t-2 border-gray-300 pt-3 mt-3">
        <span className="text-lg font-bold text-gray-900">Total Amount:</span>
        <span className="text-xl font-bold text-blue-600">{formatIndianCurrency(totalAmount)}</span>
      </div>

      {/* Amount in Words */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
        <p className="text-xs font-medium text-gray-600 mb-1">Amount in Words:</p>
        <p className="text-sm font-semibold text-gray-900">{amountInWords}</p>
      </div>
    </div>
  );
}
