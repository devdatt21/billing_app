'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export interface SupplierOption {
  id: number;
  name: string;
}

interface SupplierSelectProps {
  value: SupplierOption | null;
  onChange: (supplier: SupplierOption | null) => void;
  required?: boolean;
  className?: string;
}

export default function SupplierSelect({ value, onChange, required = false, className = '' }: SupplierSelectProps) {
  const [options, setOptions] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadSuppliers = async () => {
      try {
        const res = await apiClient.get('/api/suppliers?onlyActive=true&limit=200');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setOptions(data.suppliers || []);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSuppliers();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      onChange(null);
      return;
    }
    const selectedOption = options.find((opt) => opt.id === Number(selectedId)) || null;
    onChange(selectedOption);
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Supplier {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value ? String(value.id) : ''}
        onChange={handleChange}
        required={required}
        disabled={loading}
        className="w-full px-3 py-2 border rounded bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
      >
        <option value="" disabled={required}>
          {loading ? 'Loading suppliers...' : 'Select Supplier'}
        </option>
        {options.map((supplier) => (
          <option key={supplier.id} value={String(supplier.id)}>
            {supplier.name}
          </option>
        ))}
      </select>
    </div>
  );
}