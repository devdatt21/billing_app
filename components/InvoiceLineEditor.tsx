'use client';

import { useState } from 'react';
import Decimal from 'decimal.js';

export interface InvoiceLine {
  id?: string;
  description: string;
  hsn?: string;
  qty: string;
  unit?: string;
  rate: string;
  amount: string;
}

interface InvoiceLineEditorProps {
  lines: InvoiceLine[];
  onChange: (lines: InvoiceLine[]) => void;
}

export default function InvoiceLineEditor({ lines, onChange }: InvoiceLineEditorProps) {
  const calculateAmount = (qty: string, rate: string): string => {
    try {
      if (!qty || !rate) return '0.00';
      const qtyDecimal = new Decimal(qty);
      const rateDecimal = new Decimal(rate);
      return qtyDecimal.mul(rateDecimal).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString();
    } catch {
      return '0.00';
    }
  };

  const handleLineChange = (index: number, field: keyof InvoiceLine, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Recalculate amount if qty or rate changes
    if (field === 'qty' || field === 'rate') {
      newLines[index].amount = calculateAmount(newLines[index].qty, newLines[index].rate);
    }
    
    onChange(newLines);
  };

  const addLine = () => {
    onChange([
      ...lines,
      {
        id: `temp-${Date.now()}`,
        description: '',
        hsn: '',
        qty: '1',
        unit: 'Pcs',
        rate: '0',
        amount: '0.00',
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      onChange(lines.filter((_, i) => i !== index));
    }
  };

  const moveLine = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newLines = [...lines];
      [newLines[index - 1], newLines[index]] = [newLines[index], newLines[index - 1]];
      onChange(newLines);
    } else if (direction === 'down' && index < lines.length - 1) {
      const newLines = [...lines];
      [newLines[index], newLines[index + 1]] = [newLines[index + 1], newLines[index]];
      onChange(newLines);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
        <button
          type="button"
          onClick={addLine}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 text-sm font-medium"
        >
          + Add Line
        </button>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={line.id || index}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            {/* Line number and controls */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600">Item #{index + 1}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveLine(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move up"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveLine(index, 'down')}
                  disabled={index === lines.length - 1}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move down"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                  className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove line"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={line.description}
                onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                placeholder="Item description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* HSN Code */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
              <input
                type="text"
                value={line.hsn || ''}
                onChange={(e) => handleLineChange(index, 'hsn', e.target.value)}
                placeholder="71023910"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Qty, Unit, Rate - Stacked layout */}
            <div className="space-y-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qty <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={line.qty}
                  onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={line.unit || ''}
                  onChange={(e) => handleLineChange(index, 'unit', e.target.value)}
                  placeholder="Pcs/Cts"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={line.rate}
                  onChange={(e) => handleLineChange(index, 'rate', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                  min="0"
                />
              </div>
            </div>

            {/* Amount (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="text"
                value={line.amount}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-semibold"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
