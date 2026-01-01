'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from '@/utils/formatting';
import { apiClient } from '@/lib/api-client';
import Loader from '@/components/Loader';

export interface Company {
  id: number;
  name: string;
  gstin?: string | null;
  phone?: string | null;
  city?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  state?: string | null;
  stateCode?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
}

interface CompanySelectProps {
  value?: Company | null;
  onChange: (company: Company | null) => void;
  label: string;
  placeholder?: string;
  roleFilter?: 'seller' | 'buyer';
  debounceMs?: number;
  required?: boolean;
}

export default function CompanySelect({
  value,
  onChange,
  label,
  placeholder = 'Search company by name, GSTIN, or phone...',
  roleFilter,
  debounceMs = 300,
  required = false,
}: CompanySelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch companies from API
  const fetchCompanies = async (searchQuery: string) => {
    setLoading(true);
    try {
      const roleParam = roleFilter ? `&role=${roleFilter}` : '';
      const response = await apiClient.get(
        `/api/search/companies?q=${encodeURIComponent(searchQuery)}&limit=10${roleParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedFetch = useCallback(
    debounce((searchQuery: string) => {
      fetchCompanies(searchQuery);
    }, debounceMs),
    [debounceMs]
  );

  useEffect(() => {
    if (query.length >= 2 || query.length === 0) {
      debouncedFetch(query);
    }
  }, [query, debouncedFetch]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < companies.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && companies[selectedIndex]) {
          handleSelect(companies[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (company: Company) => {
    onChange(company);
    setQuery(company.name);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setIsOpen(true);
    setSelectedIndex(-1);
    
    // Clear selection if user edits the field
    if (value && newQuery !== value.name) {
      onChange(null);
    }
  };

  // Sync query with value when value changes externally
  useEffect(() => {
    if (value) {
      setQuery(value.name);
    } else if (!isOpen) {
      setQuery('');
    }
  }, [value, isOpen]);

  const handleFocus = () => {
    setIsOpen(true);
    if (!query) {
      fetchCompanies('');
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
          aria-label={label}
          aria-autocomplete="list"
          aria-controls="company-listbox"
          aria-expanded={isOpen}
          required={required}
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader size="sm" />
          </div>
        )}
      </div>

      {isOpen && companies.length > 0 && (
        <ul
          id="company-listbox"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto"
        >
          {companies.map((company, index) => (
            <li
              key={company.id}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSelect(company)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-gray-900">{company.name}</div>
              <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-600">
                {company.gstin && (
                  <span className="inline-flex items-center">
                    <span className="font-semibold mr-1">GSTIN:</span>
                    {company.gstin}
                  </span>
                )}
                {company.city && (
                  <span className="inline-flex items-center">
                    <span className="font-semibold mr-1">City:</span>
                    {company.city}
                  </span>
                )}
                {company.phone && (
                  <span className="inline-flex items-center">
                    <span className="font-semibold mr-1">Phone:</span>
                    {company.phone}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !loading && companies.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
          {query.length >= 2 ? (
            <div>No companies found. Try a different search term.</div>
          ) : (
            <div>
              {roleFilter === 'seller' ? (
                <>
                  <div className="font-medium text-gray-700 mb-2">No seller companies found</div>
                  <div className="text-sm">Add a company and mark it as "This is my organization"</div>
                </>
              ) : roleFilter === 'buyer' ? (
                <>
                  <div className="font-medium text-gray-700 mb-2">No buyer companies found</div>
                  <div className="text-sm">Add customer/client companies (without checking "This is my organization")</div>
                </>
              ) : (
                <div>No companies found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
