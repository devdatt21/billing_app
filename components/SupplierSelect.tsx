'use client';

import EntitySelect from '@/components/EntitySelect';

export interface SupplierOption {
  id: number;
  name: string;
  code?: string | null;
  gstin?: string | null;
  city?: string | null;
}

interface SupplierSelectProps {
  value: SupplierOption | null;
  onChange: (value: SupplierOption | null) => void;
  label?: string;
  required?: boolean;
}

export default function SupplierSelect({
  value,
  onChange,
  label = 'Supplier',
  required = false,
}: SupplierSelectProps) {
  return (
    <EntitySelect<SupplierOption>
      value={value}
      onChange={onChange}
      label={label}
      required={required}
      searchEndpoint="/api/search/suppliers"
      placeholder="Search supplier by name, code, GSTIN..."
      minChars={0}
      getMeta={(item) => [
        item.code ? `Code: ${item.code}` : '',
        item.gstin ? `GSTIN: ${item.gstin}` : '',
        item.city ? `City: ${item.city}` : '',
      ]}
      emptyMessage="No active suppliers found"
    />
  );
}
