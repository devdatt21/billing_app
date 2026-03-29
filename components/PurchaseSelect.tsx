'use client';

import EntitySelect from '@/components/EntitySelect';

export interface PurchaseOption {
  id: number;
  name: string;
  purchaseNo: string;
  purchaseDate: string;
  supplierName?: string | null;
}

interface PurchaseSelectProps {
  value: PurchaseOption | null;
  onChange: (value: PurchaseOption | null) => void;
  label?: string;
  required?: boolean;
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PurchaseSelect({
  value,
  onChange,
  label = 'Purchase (optional)',
  required = false,
}: PurchaseSelectProps) {
  return (
    <EntitySelect<PurchaseOption>
      value={value}
      onChange={onChange}
      label={label}
      required={required}
      searchEndpoint="/api/search/purchases"
      placeholder="Search purchase by no, supplier, or reference..."
      minChars={0}
      getMeta={(item) => [
        `ID: ${item.id}`,
        `Date: ${formatDate(item.purchaseDate)}`,
        item.supplierName ? `Supplier: ${item.supplierName}` : '',
      ]}
      emptyMessage="No matching purchases found"
    />
  );
}
