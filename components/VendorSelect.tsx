'use client';

import EntitySelect from '@/components/EntitySelect';

export interface VendorOption {
  id: number;
  name: string;
  code?: string | null;
  specialization?: string | null;
  city?: string | null;
}

interface VendorSelectProps {
  value: VendorOption | null;
  onChange: (value: VendorOption | null) => void;
  label?: string;
  required?: boolean;
}

export default function VendorSelect({
  value,
  onChange,
  label = 'Vendor',
  required = false,
}: VendorSelectProps) {
  return (
    <EntitySelect<VendorOption>
      value={value}
      onChange={onChange}
      label={label}
      required={required}
      searchEndpoint="/api/search/vendors"
      placeholder="Search vendor by name, code, specialization..."
      minChars={0}
      getMeta={(item) => [
        item.code ? `Code: ${item.code}` : '',
        item.specialization ? `Specialization: ${item.specialization}` : '',
        item.city ? `City: ${item.city}` : '',
      ]}
      emptyMessage="No active vendors found"
    />
  );
}
