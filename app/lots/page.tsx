'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Loader from '@/components/Loader';
import { apiClient } from '@/lib/api-client';

interface LotRow {
  id: number;
  lotNo: string;
  sourceType: 'PURCHASE' | 'SPLIT' | 'ADJUSTMENT';
  initialWeight: string;
  currentWeight: string;
  status: string;
  currentStage: string;
  parentLot?: {
    id: number;
    lotNo: string;
  } | null;
  sourcePurchase?: {
    id: number;
    purchaseNo: string;
    supplier?: {
      id: number;
      name: string;
    } | null;
  } | null;
  _count: {
    childLots: number;
  };
}

interface LotFilters {
  q: string;
  status: string;
  stage: string;
  sourceType: string;
}

function formatWeight(value: string | number): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export default function LotsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LotFilters>({
    q: '',
    status: '',
    stage: '',
    sourceType: '',
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const loadLots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filters.q.trim()) params.set('q', filters.q.trim());
      if (filters.status) params.set('status', filters.status);
      if (filters.stage) params.set('stage', filters.stage);
      if (filters.sourceType) params.set('sourceType', filters.sourceType);

      const res = await apiClient.get(`/api/lots?${params.toString()}`);
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(data.lots || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadLots();
  }, [user, filters]);

  if (isLoading || loading) {
    return <Loader fullScreen text="Loading lots..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Home">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Lots</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
        <section className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            className="w-full px-3 py-2 border rounded"
            placeholder="Search lot no / purchase no"
          />

          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">All status</option>
            <option value="PURCHASED">PURCHASED</option>
            <option value="IN_PROCESS">IN_PROCESS</option>
            <option value="AT_VENDOR">AT_VENDOR</option>
            <option value="READY">READY</option>
            <option value="SOLD">SOLD</option>
            <option value="CLOSED">CLOSED</option>
            <option value="HOLD">HOLD</option>
          </select>

          <select
            value={filters.stage}
            onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value }))}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">All stages</option>
            <option value="CUTTING">CUTTING</option>
            <option value="SARIN_MEASUREMENT">SARIN_MEASUREMENT</option>
            <option value="POLISHING">POLISHING</option>
            <option value="READY_INVENTORY">READY_INVENTORY</option>
            <option value="SOLD">SOLD</option>
          </select>

          <select
            value={filters.sourceType}
            onChange={(e) => setFilters((prev) => ({ ...prev, sourceType: e.target.value }))}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">All sources</option>
            <option value="PURCHASE">PURCHASE</option>
            <option value="SPLIT">SPLIT</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
          </select>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-4">
          {items.length === 0 ? (
            <p className="text-gray-600">No lots found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Lot No</th>
                    <th>Source</th>
                    <th>Parent</th>
                    <th>Current Weight</th>
                    <th>Status</th>
                    <th>Stage</th>
                    <th>Children</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((lot) => (
                    <tr key={lot.id} className="border-b">
                      <td className="py-2 font-medium">{lot.lotNo}</td>
                      <td>
                        {lot.sourceType}
                        {lot.sourcePurchase ? (
                          <div className="text-xs text-gray-600">{lot.sourcePurchase.purchaseNo}</div>
                        ) : null}
                      </td>
                      <td>
                        {lot.parentLot ? <Link className="text-blue-600" href={`/lots/${lot.parentLot.id}`}>{lot.parentLot.lotNo}</Link> : '-'}
                      </td>
                      <td>{formatWeight(lot.currentWeight)} cts</td>
                      <td>{lot.status}</td>
                      <td>{lot.currentStage}</td>
                      <td>{lot._count?.childLots ?? 0}</td>
                      <td>
                        <Link href={`/lots/${lot.id}`} className="text-blue-600 hover:text-blue-700">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
