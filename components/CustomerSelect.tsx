'use client';

import EntitySelect from '@/components/EntitySelect';

export interface CustomerOption {
  id: number;
  name: string;
  code?: string | null;
  gstin?: string | null;
  city?: string | null;
}

interface CustomerSelectProps {
  value: CustomerOption | null;
  onChange: (value: CustomerOption | null) => void;
  label?: string;
  required?: boolean;
}

export default function CustomerSelect({
  value,
  onChange,
  label = 'Customer',
  required = false,
}: CustomerSelectProps) {
  return (
    <EntitySelect<CustomerOption>
      value={value}
      onChange={onChange}
      label={label}
      required={required}
      searchEndpoint="/api/search/customers"
      placeholder="Search customer by name, code, GSTIN..."
      minChars={0}
      getMeta={(item) => [
        item.code ? `Code: ${item.code}` : '',
        item.gstin ? `GSTIN: ${item.gstin}` : '',
        item.city ? `City: ${item.city}` : '',
      ]}
      emptyMessage="No active customers found"
    />
  );
}
