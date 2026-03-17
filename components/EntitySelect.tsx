'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { debounce } from '@/utils/formatting';
import Loader from '@/components/Loader';

export interface NamedEntity {
  id: number;
  name: string;
}

interface EntitySelectProps<T extends NamedEntity> {
  value: T | null;
  onChange: (value: T | null) => void;
  label: string;
  searchEndpoint: string;
  placeholder?: string;
  required?: boolean;
  debounceMs?: number;
  minChars?: number;
  getMeta?: (item: T) => string[];
  emptyMessage?: string;
}

export default function EntitySelect<T extends NamedEntity>({
  value,
  onChange,
  label,
  searchEndpoint,
  placeholder = 'Search...',
  required = false,
  debounceMs = 300,
  minChars = 0,
  getMeta,
  emptyMessage = 'No records found',
}: EntitySelectProps<T>) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `${searchEndpoint}?q=${encodeURIComponent(searchQuery)}&limit=10`
      );
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data as T[]);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchEndpoint]);

  const debouncedFetch = useCallback(
    debounce((searchQuery: string) => {
      fetchItems(searchQuery);
    }, debounceMs),
    [debounceMs, fetchItems]
  );

  useEffect(() => {
    if (query.length >= minChars || query.length === 0) {
      debouncedFetch(query);
    }
  }, [query, minChars, debouncedFetch]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', onClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    } else if (!isOpen) {
      setQuery('');
    }
  }, [value, isOpen]);

  const handleSelect = (item: T) => {
    onChange(item);
    setQuery(item.name);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          handleSelect(items[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
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
          type="text"
          value={query}
          onChange={(e) => {
            const nextValue = e.target.value;
            setQuery(nextValue);
            setIsOpen(true);
            setSelectedIndex(-1);
            if (value && nextValue !== value.name) {
              onChange(null);
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            if (!query) {
              fetchItems('');
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
          aria-label={label}
          required={required}
        />

        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader size="sm" />
          </div>
        )}
      </div>

      {isOpen && items.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto">
          {items.map((item, index) => {
            const meta = getMeta ? getMeta(item).filter(Boolean) : [];
            return (
              <li
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                  index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-900">{item.name}</div>
                {meta.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-600">
                    {meta.map((line, idx) => (
                      <span key={`${item.id}-${idx}`}>{line}</span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isOpen && !loading && items.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
          {query.length < minChars ? `Type at least ${minChars} characters` : emptyMessage}
        </div>
      )}
    </div>
  );
}
