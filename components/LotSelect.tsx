'use client';

import EntitySelect from '@/components/EntitySelect';

export interface LotOption {
  id: number;
  name: string;
  lotNo: string;
  lotDate: string;
  purchaseDate?: string | null;
  sourcePurchaseNo?: string | null;
}

interface LotSelectProps {
  value: LotOption | null;
  onChange: (value: LotOption | null) => void;
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

export default function LotSelect({
  value,
  onChange,
  label = 'Lot (optional)',
  required = false,
}: LotSelectProps) {
  return (
    <EntitySelect<LotOption>
      value={value}
      onChange={onChange}
      label={label}
      required={required}
      searchEndpoint="/api/search/lots"
      placeholder="Search lot by lot no or purchase no..."
      minChars={0}
      getMeta={(item) => [
        `ID: ${item.id}`,
        `Lot Date: ${formatDate(item.lotDate)}`,
        item.purchaseDate ? `Purchase Date: ${formatDate(item.purchaseDate)}` : '',
        item.sourcePurchaseNo ? `Purchase: ${item.sourcePurchaseNo}` : '',
      ]}
      emptyMessage="No matching lots found"
    />
  );
}
