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
  /** If true, show IGST instead of SGST+CGST (for inter-state sales) */
  isInterState?: boolean;
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
  isInterState = false,
}: InvoiceSummaryProps) {
  const amountInWords = numberToWords(totalAmount);
  
  // For IGST, combine the rates and amounts
  const igstRate = (parseFloat(sgstRate) + parseFloat(cgstRate)).toFixed(2);
  const igstAmount = (parseFloat(sgstAmount) + parseFloat(cgstAmount)).toFixed(2);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 dark:bg-slate-900 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 dark:text-gray-100 dark:border-slate-700">Invoice Summary</h3>

      {/* Subtotal */}
      <div className="flex justify-between items-center">
        <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{formatIndianCurrency(subtotal)}</span>
      </div>

      {/* Tax Display - IGST for inter-state, SGST+CGST for intra-state */}
      {isInterState ? (
        <div className="flex justify-between items-center">
          <span className="text-gray-700 dark:text-gray-300">
            IGST @ {igstRate}%:
          </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{formatIndianCurrency(igstAmount)}</span>
        </div>
      ) : (
        <>
          {/* SGST */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">
              SGST @ {sgstRate}%:
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatIndianCurrency(sgstAmount)}</span>
          </div>

          {/* CGST */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">
              CGST @ {cgstRate}%:
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatIndianCurrency(cgstAmount)}</span>
          </div>
        </>
      )}

      {/* Total Tax */}
      <div className="flex justify-between items-center border-t pt-2 dark:border-slate-700">
        <span className="text-gray-700 font-medium dark:text-gray-300">Total Tax:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{formatIndianCurrency(totalTax)}</span>
      </div>

      {/* Rounding (if not zero) */}
      {parseFloat(rounding) !== 0 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">Rounding:</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {parseFloat(rounding) > 0 ? '+' : ''}{formatIndianCurrency(rounding)}
          </span>
        </div>
      )}

      {/* Total Amount */}
      <div className="flex justify-between items-center border-t-2 border-gray-300 pt-3 mt-3 dark:border-slate-600">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Total Amount:</span>
        <span className="text-xl font-bold text-blue-600">{formatIndianCurrency(totalAmount)}</span>
      </div>

      {/* Amount in Words */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3 dark:bg-slate-800 dark:border-slate-700">
        <p className="text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Amount in Words:</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">{amountInWords}</p>
      </div>
    </div>
  );
}
