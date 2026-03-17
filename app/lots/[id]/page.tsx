'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import { apiClient } from '@/lib/api-client';

interface ParentLot {
  id: number;
  lotNo: string;
  currentWeight: string;
  status: string;
}

interface ChildLot {
  id: number;
  lotNo: string;
  initialWeight: string;
  currentWeight: string;
  status: string;
  createdAt: string;
}

interface SourcePurchase {
  id: number;
  purchaseNo: string;
  purchaseDate: string;
  supplier?: {
    id: number;
    name: string;
  } | null;
}

interface SplitAsSourceEntry {
  id: number;
  splitDate: string;
  splitWeight: string;
  residualAfterSplit?: string | null;
  childLot?: {
    id: number;
    lotNo: string;
    currentWeight: string;
    status: string;
  } | null;
}

interface SplitAsChildEntry {
  id: number;
  splitDate: string;
  splitWeight: string;
  sourceLot?: {
    id: number;
    lotNo: string;
    currentWeight: string;
    status: string;
  } | null;
}

interface LotProcess {
  id: number;
  processDate: string;
  status: string;
  inputWeight: string;
  outputWeight: string;
  lossWeight: string;
  costAmount: string;
  remarks?: string | null;
  processType?: { id: number; name: string; stage: string } | null;
  vendor?: { id: number; name: string } | null;
}

type TimelineEvent =
  | { kind: 'process'; date: string; data: LotProcess }
  | { kind: 'split-out'; date: string; data: SplitAsSourceEntry }
  | { kind: 'split-in'; date: string; data: SplitAsChildEntry };

interface LotDetail {
  id: number;
  lotNo: string;
  initialWeight: string;
  currentWeight: string;
  status: string;
  inventoryState: string;
  currentStage: string;
  currentLocation?: string | null;
  accumulatedCost: string;
  notes?: string | null;
  sourcePurchase?: SourcePurchase | null;
  parentLot?: ParentLot | null;
  childLots: ChildLot[];
  splitAsSource: SplitAsSourceEntry[];
  splitAsChild: SplitAsChildEntry[];
  processes: LotProcess[];
}

function formatNumber(value: string | number, fractionDigits = 3): string {
  const n = typeof value === 'number' ? value : Number(value || 0);
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function LotDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lot, setLot] = useState<LotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [splitWeights, setSplitWeights] = useState<string[]>(['']);
  const [splitSaving, setSplitSaving] = useState(false);

  // Process form state
  const [processTypeId, setProcessTypeId] = useState('');
  const [processTypeName, setProcessTypeName] = useState('');
  const [processTypeStage, setProcessTypeStage] = useState('');
  const [ptSearch, setPtSearch] = useState('');
  const [ptOptions, setPtOptions] = useState<{ id: number; name: string; stage: string }[]>([]);
  const [ptLoading, setPtLoading] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vSearch, setVSearch] = useState('');
  const [vOptions, setVOptions] = useState<{ id: number; name: string }[]>([]);
  const [procInputWeight, setProcInputWeight] = useState('');
  const [procOutputWeight, setProcOutputWeight] = useState('');
  const [procCostAmount, setProcCostAmount] = useState('');
  const [procDate, setProcDate] = useState('');
  const [procRemarks, setProcRemarks] = useState('');
  const [procSaving, setProcSaving] = useState(false);

  const loadLot = useCallback(async () => {
    try {
      const res = await apiClient.get(`/api/lots/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) setError('Lot not found');
        else setError('Failed to load lot details');
        return;
      }
      setLot(await res.json());
    } catch {
      setError('Failed to load lot details');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadLot();
  }, [loadLot]);

  const splitTotal = useMemo(
    () => splitWeights.reduce((sum, item) => sum + Number(item || 0), 0),
    [splitWeights]
  );

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!lot) return [];
    const events: TimelineEvent[] = [
      ...lot.processes.map((p) => ({ kind: 'process' as const, date: p.processDate, data: p })),
      ...lot.splitAsSource.map((s) => ({ kind: 'split-out' as const, date: s.splitDate, data: s })),
      ...lot.splitAsChild.map((s) => ({ kind: 'split-in' as const, date: s.splitDate, data: s })),
    ];
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [lot]);

  useEffect(() => {
    if (ptSearch.length < 1) { setPtOptions([]); return; }
    setPtLoading(true);
    apiClient.get(`/api/search/process-types?q=${encodeURIComponent(ptSearch)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setPtOptions(Array.isArray(data) ? data : []))
      .finally(() => setPtLoading(false));
  }, [ptSearch]);

  useEffect(() => {
    if (vSearch.length < 1) { setVOptions([]); return; }
    apiClient.get(`/api/search/vendors?q=${encodeURIComponent(vSearch)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setVOptions(Array.isArray(data) ? data : []));
  }, [vSearch]);

  const submitProcess = async (e: FormEvent) => {
    e.preventDefault();
    if (!lot || !processTypeId) return;
    setProcSaving(true);
    try {
      const res = await apiClient.post(`/api/lots/${lot.id}/processes`, {
        processTypeId: Number(processTypeId),
        vendorId: vendorId ? Number(vendorId) : undefined,
        inputWeight: procInputWeight,
        outputWeight: procOutputWeight,
        costAmount: procCostAmount || '0',
        processDate: procDate || new Date().toISOString().split('T')[0],
        remarks: procRemarks,
      });
      if (!res.ok) {
        const b = await res.json();
        alert(b.error || 'Failed to record process');
        return;
      }
      setProcessTypeId(''); setProcessTypeName(''); setProcessTypeStage('');
      setPtSearch(''); setVendorId(''); setVendorName(''); setVSearch('');
      setProcInputWeight(''); setProcOutputWeight('');
      setProcCostAmount(''); setProcDate(''); setProcRemarks('');
      await loadLot();
      alert('Process recorded successfully.');
    } finally {
      setProcSaving(false);
    }
  };

  const submitSplit = async (e: FormEvent) => {
    e.preventDefault();
    if (!lot) return;

    const children = splitWeights
      .map((weight) => Number(weight))
      .filter((weight) => weight > 0)
      .map((weight) => ({ weight: weight.toFixed(3) }));

    if (children.length === 0) {
      alert('Enter at least one valid child weight');
      return;
    }

    setSplitSaving(true);
    try {
      const res = await apiClient.post(`/api/lots/${lot.id}/split`, {
        children,
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || 'Failed to split lot');
        return;
      }

      setSplitWeights(['']);
      await loadLot();
      alert('Lot split saved successfully.');
    } finally {
      setSplitSaving(false);
    }
  };

  if (loading) return <Loader fullScreen text="Loading lot details..." />;

  if (error || !lot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white border rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || 'Lot not found'}</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => router.push('/purchases')}>
            Back to Purchases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Go back">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Lot Details</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-white border border-gray-200 rounded-lg p-5 xl:col-span-2 space-y-4">
          <div>
            <p className="text-sm text-gray-500">Lot No</p>
            <p className="text-lg font-semibold text-gray-900">{lot.lotNo}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-gray-500">Initial</p><p className="font-semibold">{formatNumber(lot.initialWeight)} cts</p></div>
            <div><p className="text-gray-500">Current</p><p className="font-semibold">{formatNumber(lot.currentWeight)} cts</p></div>
            <div><p className="text-gray-500">Status</p><p className="font-semibold">{lot.status}</p></div>
            <div><p className="text-gray-500">Stage</p><p className="font-semibold">{lot.currentStage}</p></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Source Purchase</p>
              <p className="font-semibold">
                {lot.sourcePurchase ? `${lot.sourcePurchase.purchaseNo} (${lot.sourcePurchase.supplier?.name || '-'})` : '-'}
              </p>
            </div>
            <div><p className="text-gray-500">Inventory State</p><p className="font-semibold">{lot.inventoryState}</p></div>
            <div><p className="text-gray-500">Current Location</p><p className="font-semibold">{lot.currentLocation || '-'}</p></div>
            <div><p className="text-gray-500">Accumulated Cost</p><p className="font-semibold">INR {Number(lot.accumulatedCost).toLocaleString('en-IN')}</p></div>
            <div><p className="text-gray-500">Parent Lot</p>
              <p className="font-semibold">
                {lot.parentLot ? <Link className="text-blue-600" href={`/lots/${lot.parentLot.id}`}>{lot.parentLot.lotNo}</Link> : '-'}
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Lineage Tree</h2>
            <div className="rounded-lg border border-gray-200 p-3 text-sm bg-gray-50">
              <div className="font-medium text-gray-900">{lot.lotNo}</div>
              {lot.parentLot ? (
                <div className="mt-1 text-gray-700">
                  Parent: <Link className="text-blue-600" href={`/lots/${lot.parentLot.id}`}>{lot.parentLot.lotNo}</Link>
                </div>
              ) : (
                <div className="mt-1 text-gray-500">Parent: Root lot</div>
              )}

              {lot.childLots.length > 0 ? (
                <div className="mt-3">
                  <div className="text-gray-600 mb-1">Children</div>
                  <ul className="space-y-1">
                    {lot.childLots.map((child) => (
                      <li key={child.id} className="flex items-center gap-2">
                        <span className="text-gray-400">└─</span>
                        <Link className="text-blue-600" href={`/lots/${child.id}`}>{child.lotNo}</Link>
                        <span className="text-gray-500">({formatNumber(child.currentWeight)} cts)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-2 text-gray-500">No children yet</div>
              )}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Activity Timeline</h2>
            {timeline.length === 0 ? (
              <p className="text-gray-600 text-sm">No activity recorded yet.</p>
            ) : (
              <ol className="relative border-l border-gray-200 pl-4 space-y-4">
                {timeline.map((event) => {
                  if (event.kind === 'process') {
                    const p = event.data as LotProcess;
                    return (
                      <li key={`proc-${p.id}`} className="relative">
                        <span className="absolute -left-[1.3rem] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                        <p className="text-xs text-gray-500">{formatDate(p.processDate)}</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {p.processType?.name ?? 'Process'}
                          <span className="ml-2 text-xs font-normal text-gray-500">{p.processType?.stage}</span>
                        </p>
                        {p.vendor && <p className="text-xs text-gray-600">Vendor: {p.vendor.name}</p>}
                        <p className="text-xs text-gray-600">
                          In: {formatNumber(p.inputWeight)} cts → Out: {formatNumber(p.outputWeight)} cts
                          {Number(p.lossWeight) !== 0 && (
                            <span className="ml-1 text-amber-600">Loss: {formatNumber(p.lossWeight)} cts</span>
                          )}
                        </p>
                        {Number(p.costAmount) > 0 && (
                          <p className="text-xs text-gray-600">Cost: INR {Number(p.costAmount).toLocaleString('en-IN')}</p>
                        )}
                        <p className="text-xs mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${
                            p.status === 'COMPLETED' ? 'bg-green-600' :
                            p.status === 'IN_PROGRESS' ? 'bg-blue-600' : 'bg-gray-400'
                          }`}>{p.status}</span>
                        </p>
                        {p.remarks && <p className="text-xs text-gray-500 mt-0.5">Note: {p.remarks}</p>}
                      </li>
                    );
                  }
                  if (event.kind === 'split-out') {
                    const s = event.data as SplitAsSourceEntry;
                    return (
                      <li key={`sout-${s.id}`} className="relative">
                        <span className="absolute -left-[1.3rem] top-1 w-3 h-3 rounded-full bg-orange-400 border-2 border-white" />
                        <p className="text-xs text-gray-500">{formatDate(s.splitDate)}</p>
                        <p className="text-sm font-semibold text-gray-900">Split Out</p>
                        <p className="text-xs text-gray-600">
                          {formatNumber(s.splitWeight)} cts →{' '}
                          {s.childLot ? (
                            <Link href={`/lots/${s.childLot.id}`} className="text-blue-600">{s.childLot.lotNo}</Link>
                          ) : '-'}
                        </p>
                        <p className="text-xs text-gray-500">Residual: {formatNumber(s.residualAfterSplit || '0')} cts</p>
                      </li>
                    );
                  }
                  // split-in
                  const s = event.data as SplitAsChildEntry;
                  return (
                    <li key={`sin-${s.id}`} className="relative">
                      <span className="absolute -left-[1.3rem] top-1 w-3 h-3 rounded-full bg-sky-500 border-2 border-white" />
                      <p className="text-xs text-gray-500">{formatDate(s.splitDate)}</p>
                      <p className="text-sm font-semibold text-gray-900">Received From Split</p>
                      <p className="text-xs text-gray-600">
                        {formatNumber(s.splitWeight)} cts ←{' '}
                        {s.sourceLot ? (
                          <Link href={`/lots/${s.sourceLot.id}`} className="text-blue-600">{s.sourceLot.lotNo}</Link>
                        ) : '-'}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Child Lots</h2>
            {lot.childLots.length === 0 ? (
              <p className="text-gray-600 text-sm">No child lots yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left border-b"><th className="py-2">Lot</th><th>Initial</th><th>Current</th><th>Status</th></tr></thead>
                  <tbody>
                    {lot.childLots.map((child) => (
                      <tr key={child.id} className="border-b">
                        <td className="py-2"><Link href={`/lots/${child.id}`} className="text-blue-600">{child.lotNo}</Link></td>
                        <td>{formatNumber(child.initialWeight)} cts</td>
                        <td>{formatNumber(child.currentWeight)} cts</td>
                        <td>{child.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <form onSubmit={submitSplit} className="bg-white border border-gray-200 rounded-lg p-5 h-fit space-y-3">
          <h2 className="font-semibold text-gray-900">Split Lot</h2>
          <p className="text-sm text-gray-600">Enter child weights. Residual stays on source lot.</p>

          {splitWeights.map((value, idx) => (
            <div key={idx}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Child {idx + 1} Weight (cts)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={value}
                onChange={(e) => {
                  const next = [...splitWeights];
                  next[idx] = e.target.value;
                  setSplitWeights(next);
                }}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          ))}

          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 border rounded"
              onClick={() => setSplitWeights((prev) => [...prev, ''])}
            >
              Add Child
            </button>
            {splitWeights.length > 1 && (
              <button
                type="button"
                className="px-3 py-2 border rounded"
                onClick={() => setSplitWeights((prev) => prev.slice(0, -1))}
              >
                Remove Last
              </button>
            )}
          </div>

          <div className="text-sm text-gray-700">
            Split total: <span className="font-semibold">{formatNumber(splitTotal)} cts</span>
            <br />
            Source current: <span className="font-semibold">{formatNumber(lot.currentWeight)} cts</span>
          </div>

          <button
            type="submit"
            disabled={splitSaving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {splitSaving ? 'Saving split...' : 'Save Split'}
          </button>
        </form>

        <form onSubmit={submitProcess} className="bg-white border border-gray-200 rounded-lg p-5 h-fit space-y-3">
          <h2 className="font-semibold text-gray-900">Record Process</h2>
          <p className="text-sm text-gray-600">Updates lot weight and stage on save.</p>

          {/* Process type search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Process Type *</label>
            {processTypeId ? (
              <div className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                <span>{processTypeName} <span className="text-gray-500 text-xs">({processTypeStage})</span></span>
                <button type="button" className="text-gray-400 hover:text-red-500 text-xs" onClick={() => { setProcessTypeId(''); setProcessTypeName(''); setProcessTypeStage(''); }}>✕</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search process type…"
                  value={ptSearch}
                  onChange={(e) => setPtSearch(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                {ptLoading && <p className="text-xs text-gray-400 mt-1">Loading…</p>}
                {ptOptions.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border rounded shadow-sm mt-1 max-h-40 overflow-y-auto text-sm">
                    {ptOptions.map((pt) => (
                      <li key={pt.id}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                        onClick={() => { setProcessTypeId(String(pt.id)); setProcessTypeName(pt.name); setProcessTypeStage(pt.stage); setPtSearch(''); setPtOptions([]); }}
                      >{pt.name} <span className="text-gray-400 text-xs">({pt.stage})</span></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Vendor search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor (optional)</label>
            {vendorId ? (
              <div className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                <span>{vendorName}</span>
                <button type="button" className="text-gray-400 hover:text-red-500 text-xs" onClick={() => { setVendorId(''); setVendorName(''); }}>✕</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search vendor…"
                  value={vSearch}
                  onChange={(e) => setVSearch(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                {vOptions.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border rounded shadow-sm mt-1 max-h-40 overflow-y-auto text-sm">
                    {vOptions.map((v) => (
                      <li key={v.id}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                        onClick={() => { setVendorId(String(v.id)); setVendorName(v.name); setVSearch(''); setVOptions([]); }}
                      >{v.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Input Weight (cts) *</label>
              <input type="number" step="0.001" min="0" value={procInputWeight}
                onChange={(e) => setProcInputWeight(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Output Weight (cts) *</label>
              <input type="number" step="0.001" min="0" value={procOutputWeight}
                onChange={(e) => setProcOutputWeight(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm" required />
            </div>
          </div>

          {procInputWeight && procOutputWeight && (
            <p className="text-xs text-gray-600">
              Loss: <span className="font-semibold text-amber-600">
                {formatNumber(Math.max(0, Number(procInputWeight) - Number(procOutputWeight)))} cts
              </span>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Process Date</label>
            <input type="date" value={procDate} onChange={(e) => setProcDate(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost (INR)</label>
            <input type="number" step="0.01" min="0" value={procCostAmount}
              onChange={(e) => setProcCostAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea rows={2} value={procRemarks} onChange={(e) => setProcRemarks(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm" />
          </div>

          <button
            type="submit"
            disabled={procSaving || !processTypeId}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {procSaving ? 'Saving…' : 'Record Process'}
          </button>
        </form>
        </main>
       </div>
  );
}
