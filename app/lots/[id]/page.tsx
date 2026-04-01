'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { DetailPageSkeleton } from '@/components/PageSkeleton';
import { useToast } from '@/contexts/ToastContext';

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
  createdAt: string;
  processStartDate?: string | null;
  processEndDate?: string | null;
  status: string;
  inputWeight: string;
  outputWeight: string;
  lossWeight: string;
  costAmount: string;
  remarks?: string | null;
  processType?: { id: number; name: string; stage: string; color?: string } | null;
  vendor?: { id: number; name: string } | null;
}

interface LotCostEntry {
  id: number;
  category: string;
  sourceType?: string | null;
  amount: string;
  costDate: string;
  remarks?: string | null;
}

interface ProcessTypeOption {
  id: number;
  name: string;
  stage: string;
  color?: string;
}

type TimelineEvent =
  | { kind: 'process'; date: string; data: LotProcess }
  | { kind: 'split-out'; date: string; data: SplitAsSourceEntry }
  | { kind: 'split-in'; date: string; data: SplitAsChildEntry };

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

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
  costs: LotCostEntry[];
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

function toLocalInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toUserMessage(message: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/outputWeight/g, 'Output Weight'],
    [/inputWeight/g, 'Input Weight'],
    [/costAmount/g, 'Cost Amount'],
    [/vendorId/g, 'Vendor'],
    [/processTypeId/g, 'Process Type'],
    [/processStartDate/g, 'Start Date'],
    [/processEndDate/g, 'End Date'],
    [/returnedAt/g, 'Return Date'],
  ];

  return replacements.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), message);
}

const timelineDotClass = 'absolute left-[-1rem] top-1 block h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white box-border';

function AnimatedDots() {
  return (
    <span className="ml-1 inline-flex items-end gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.15s' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.3s' }} />
    </span>
  );
}

export default function LotDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const editFormRef = useRef<HTMLFormElement>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [lot, setLot] = useState<LotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [splitWeights, setSplitWeights] = useState<string[]>(['']);
  const [splitSaving, setSplitSaving] = useState(false);

  // Process form state
  const [processTypeId, setProcessTypeId] = useState('');
  const [processTypeOptions, setProcessTypeOptions] = useState<ProcessTypeOption[]>([]);
  const [processTypeLoading, setProcessTypeLoading] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vSearch, setVSearch] = useState('');
  const [vOptions, setVOptions] = useState<{ id: number; name: string }[]>([]);
  const [vDropdownOpen, setVDropdownOpen] = useState(false);
  const [procInputWeight, setProcInputWeight] = useState('');
  const [procOutputWeight, setProcOutputWeight] = useState('');
  const [procCostAmount, setProcCostAmount] = useState('');
  const [procStartDate, setProcStartDate] = useState('');
  const [procEndDate, setProcEndDate] = useState('');
  const [procRemarks, setProcRemarks] = useState('');
  const [editingProcessId, setEditingProcessId] = useState<number | null>(null);
  const [procSaving, setProcSaving] = useState(false);
  const [deletingProcessId, setDeletingProcessId] = useState<number | null>(null);
  const [confirmDeleteProcessId, setConfirmDeleteProcessId] = useState<number | null>(null);

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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1279px)');
    setIsMobileView(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobileView(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const splitTotal = useMemo(
    () => splitWeights.reduce((sum, item) => sum + Number(item || 0), 0),
    [splitWeights]
  );

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!lot) return [];
    const events: TimelineEvent[] = [
      ...lot.processes.map((p) => ({ kind: 'process' as const, date: p.processStartDate || p.processDate, data: p })),
      ...lot.splitAsSource.map((s) => ({ kind: 'split-out' as const, date: s.splitDate, data: s })),
      ...lot.splitAsChild.map((s) => ({ kind: 'split-in' as const, date: s.splitDate, data: s })),
    ];

    return events.sort((a, b) => {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      const diff = aDate.getTime() - bDate.getTime();
      if (diff !== 0) return diff;

      // If two process events happen on the same date, order by actual creation time.
      if (a.kind === 'process' && b.kind === 'process' && isSameCalendarDay(aDate, bDate)) {
        return new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime();
      }

      return 0;
    });
  }, [lot]);

  const minProcessDate = useMemo(() => {
    if (!lot) return '';
    const allDates = [
      ...lot.processes.map((p) => p.processStartDate || p.processDate),
      ...lot.splitAsSource.map((s) => s.splitDate),
      ...lot.splitAsChild.map((s) => s.splitDate),
    ]
      .map((d) => new Date(d))
      .filter((d) => !isNaN(d.getTime()));

    if (allDates.length === 0) return '';
    const latest = new Date(Math.max(...allDates.map((d) => d.getTime())));
    return toLocalInputDate(latest);
  }, [lot]);

  const todayDate = useMemo(() => toLocalInputDate(new Date()), []);

  const effectiveStartMinDate = useMemo(() => {
    if (!minProcessDate) return '';
    return minProcessDate > todayDate ? todayDate : minProcessDate;
  }, [minProcessDate, todayDate]);

  const displayCurrentWeight = useMemo(() => {
    if (!lot) return '0';

    const activeProcesses = lot.processes.filter((p) => p.status !== 'CANCELLED');

    const latestProcess = [...activeProcesses]
      .sort(
        (a, b) =>
          new Date(b.processStartDate || b.processDate).getTime()
          - new Date(a.processStartDate || a.processDate).getTime()
      )[0];

    if (
      latestProcess
      && latestProcess.status === 'IN_PROGRESS'
      && Number(latestProcess.outputWeight) === 0
      && Number(latestProcess.inputWeight) > 0
    ) {
      return latestProcess.inputWeight;
    }

    return lot.currentWeight;
  }, [lot]);

  const latestProcessId = useMemo(() => {
    if (!lot || lot.processes.length === 0) return null;
    const activeProcesses = lot.processes.filter((p) => p.status !== 'CANCELLED');
    if (activeProcesses.length === 0) return null;

    return [...activeProcesses]
      .sort(
        (a, b) =>
          new Date(b.processStartDate || b.processDate).getTime()
          - new Date(a.processStartDate || a.processDate).getTime()
      )[0]?.id ?? null;
  }, [lot]);

  const costSummary = useMemo(() => {
    if (!lot) {
      return {
        totalSpent: 0,
        positiveSpend: 0,
        currentWeight: 0,
        costPerCarat: 0,
      };
    }

    const totalSpent = lot.costs.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const positiveSpend = lot.costs.reduce((sum, entry) => (
      Number(entry.amount || 0) > 0 ? sum + Number(entry.amount) : sum
    ), 0);
    const currentWeight = Number(displayCurrentWeight || 0);

    return {
      totalSpent,
      positiveSpend,
      currentWeight,
      costPerCarat: currentWeight > 0 ? totalSpent / currentWeight : 0,
    };
  }, [lot, displayCurrentWeight]);

  const maxAllowedInputWeight = useMemo(() => Number(displayCurrentWeight || 0), [displayCurrentWeight]);

  useEffect(() => {
    setProcessTypeLoading(true);
    apiClient
      .get('/api/search/process-types?limit=100')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProcessTypeOptions(Array.isArray(data) ? data : []))
      .finally(() => setProcessTypeLoading(false));
  }, []);

  useEffect(() => {
    apiClient.get('/api/search/vendors?limit=5')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setVOptions(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    if (vSearch.length < 1) return;
    apiClient.get(`/api/search/vendors?q=${encodeURIComponent(vSearch)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setVOptions(Array.isArray(data) ? data : []));
  }, [vSearch]);

  const allowedProcessTypeOptions = useMemo(() => {
    if (!lot) return processTypeOptions;

    const stageOrder: Record<string, number> = {
      PURCHASE: 1,
      CUTTING: 2,
      SARIN: 3,
      SARIN_MEASUREMENT: 3,
      POLISHING: 4,
      INVENTORY: 5,
      READY_INVENTORY: 5,
      SELL: 6,
      SOLD: 6,
    };

    const currentStageOrder = stageOrder[lot.currentStage] ?? 0;
    return processTypeOptions.filter((pt) => (stageOrder[pt.stage] ?? 0) >= currentStageOrder);
  }, [lot, processTypeOptions]);

  const isCompletingOnOrBeforeToday = useMemo(() => {
    if (!procEndDate) return false;
    const endDate = new Date(procEndDate);
    if (isNaN(endDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate <= today;
  }, [procEndDate]);

  const mustLockInputToCurrentWeight = isCompletingOnOrBeforeToday && !editingProcessId;

  useEffect(() => {
    if (mustLockInputToCurrentWeight && lot) {
      setProcInputWeight(String(displayCurrentWeight));
    }
  }, [mustLockInputToCurrentWeight, lot, displayCurrentWeight]);

  const startEditProcess = (process: LotProcess) => {
    if (process.status !== 'IN_PROGRESS') {
      toast.warning('Only IN_PROGRESS process can be edited');
      return;
    }

    const processType = process.processType;
    if (!processType) {
      toast.error('Process type missing on this record');
      return;
    }

    setEditingProcessId(process.id);
    setProcessTypeId(String(processType.id));
    setVendorId(process.vendor ? String(process.vendor.id) : '');
    setVendorName(process.vendor?.name || '');
    setVSearch('');
    setProcInputWeight(process.inputWeight);
    setProcOutputWeight(process.outputWeight);
    setProcCostAmount(process.costAmount);
    setProcStartDate(process.processStartDate ? toLocalInputDate(new Date(process.processStartDate)) : '');
    setProcEndDate(process.processEndDate ? toLocalInputDate(new Date(process.processEndDate)) : '');
    setProcRemarks(process.remarks || '');
    
    if (isMobileView && editFormRef.current) {
      setTimeout(() => {
        editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 0);
    }
  };

  const resetProcessForm = () => {
    setEditingProcessId(null);
    setProcessTypeId('');
    setVendorId('');
    setVendorName('');
    setVSearch('');
    setVDropdownOpen(false);
    setProcInputWeight('');
    setProcOutputWeight('');
    setProcCostAmount('');
    setProcStartDate('');
    setProcEndDate('');
    setProcRemarks('');
  };

  const submitProcess = async (e: FormEvent) => {
    e.preventDefault();
    if (!lot || !processTypeId || !procStartDate) return;

    if (Number(procInputWeight || 0) > maxAllowedInputWeight) {
      toast.warning(`Input Weight cannot exceed Current Weight (${formatNumber(displayCurrentWeight)} cts)`);
      return;
    }

    if (effectiveStartMinDate && procStartDate < effectiveStartMinDate) {
      toast.warning(`Start date cannot be earlier than ${effectiveStartMinDate}`);
      return;
    }

    if (procEndDate && procEndDate < procStartDate) {
      toast.warning('End date cannot be earlier than start date');
      return;
    }

    if (isCompletingOnOrBeforeToday && procOutputWeight.trim() === '') {
      toast.warning('Output weight is required when process end date is today or earlier');
      return;
    }

    if (mustLockInputToCurrentWeight && Number(procInputWeight || 0) !== Number(displayCurrentWeight)) {
      toast.warning(`Input weight must match current lot weight (${formatNumber(displayCurrentWeight)} cts)`);
      return;
    }

    setProcSaving(true);
    try {
      const payload = {
        processTypeId: Number(processTypeId),
        vendorId: vendorId ? Number(vendorId) : undefined,
        inputWeight: procInputWeight,
        outputWeight: procOutputWeight.trim() === '' ? undefined : procOutputWeight,
        costAmount: procCostAmount || '0',
        processDate: procStartDate,
        processStartDate: procStartDate || null,
        processEndDate: procEndDate || null,
        remarks: procRemarks,
      };

      const res = editingProcessId
        ? await apiClient.put(`/api/lots/${lot.id}/processes/${editingProcessId}`, payload)
        : await apiClient.post(`/api/lots/${lot.id}/processes`, payload);

      if (!res.ok) {
        const b = await res.json();
        toast.error(toUserMessage(b.error || 'Failed to save process'));
        return;
      }

      resetProcessForm();
      await loadLot();
      toast.success(editingProcessId ? 'Process updated successfully.' : 'Process recorded successfully.');
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
      toast.warning('Enter at least one valid child weight');
      return;
    }

    setSplitSaving(true);
    try {
      const res = await apiClient.post(`/api/lots/${lot.id}/split`, {
        children,
      });

      if (!res.ok) {
        const body = await res.json();
        toast.error(toUserMessage(body.error || 'Failed to split lot'));
        return;
      }

      setSplitWeights(['']);
      await loadLot();
      toast.success('Lot split saved successfully.');
    } finally {
      setSplitSaving(false);
    }
  };

  const openDeleteProcessModal = (processId: number) => {
    setConfirmDeleteProcessId(processId);
  };

  const closeDeleteProcessModal = () => {
    if (deletingProcessId) return;
    setConfirmDeleteProcessId(null);
  };

  const deleteLastProcess = async () => {
    if (!lot || !confirmDeleteProcessId) return;

    const processId = confirmDeleteProcessId;
    setDeletingProcessId(processId);
    try {
      const res = await apiClient.delete(`/api/lots/${lot.id}/processes/${processId}`);
      if (!res.ok) {
        const body = await res.json();
        toast.error(toUserMessage(body.error || 'Failed to delete process'));
        return;
      }

      if (editingProcessId === processId) {
        resetProcessForm();
      }

      await loadLot();
      toast.success('Latest process deleted successfully.');
      setConfirmDeleteProcessId(null);
    } finally {
      setDeletingProcessId(null);
    }
  };

  if (!loading && (error || !lot)) {
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
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center gap-3 px-4">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Go back">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Lot Details</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {loading ? (
          <DetailPageSkeleton />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="bg-white border border-gray-200 rounded-lg p-5 xl:col-span-2 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Lot No</p>
                <p className="text-lg font-semibold text-gray-900">{lot!.lotNo}</p>
              </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-gray-500">Initial</p><p className="font-semibold">{formatNumber(lot!.initialWeight)} cts</p></div>
            <div><p className="text-gray-500">Current</p><p className="font-semibold">{formatNumber(displayCurrentWeight)} cts</p></div>
            <div><p className="text-gray-500">Status</p><p className="font-semibold">{lot!.status}</p></div>
            <div><p className="text-gray-500">Stage</p><p className="font-semibold">{lot!.currentStage}</p></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Source Purchase</p>
              <p className="font-semibold">
                {lot!.sourcePurchase ? `${lot!.sourcePurchase.purchaseNo} (${lot!.sourcePurchase.supplier?.name || '-'})` : '-'}
              </p>
            </div>
            <div><p className="text-gray-500">Inventory State</p><p className="font-semibold">{lot!.inventoryState}</p></div>
            <div><p className="text-gray-500">Current Location</p><p className="font-semibold">{lot!.currentLocation || '-'}</p></div>
            <div><p className="text-gray-500">Accumulated Cost</p><p className="font-semibold">INR {Number(lot!.accumulatedCost).toLocaleString('en-IN')}</p></div>
            <div><p className="text-gray-500">Parent Lot</p>
              <p className="font-semibold">
                {lot!.parentLot ? <Link className="text-blue-600" href={`/lots/${lot!.parentLot.id}`}>{lot!.parentLot.lotNo}</Link> : '-'}
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Financial Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-500">Total Spent On This Lot</p>
                <p className="mt-1 font-semibold text-gray-900">INR {costSummary.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-500">Gross Cost Added</p>
                <p className="mt-1 font-semibold text-gray-900">INR {costSummary.positiveSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-gray-500">Cost Per Carat</p>
                <p className="mt-1 font-semibold text-gray-900">INR {costSummary.costPerCarat.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Cost Ledger</h2>
              <p className="text-xs text-gray-500">{lot!.costs.length} entry(s)</p>
            </div>
            {lot!.costs.length === 0 ? (
              <p className="text-sm text-gray-600">No cost entries recorded yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full px-4 sm:px-0">
                  <table className="w-full min-w-[640px] text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="py-2 px-2 sm:px-3">Date</th>
                        <th className="px-2 sm:px-3">Category</th>
                        <th className="px-2 sm:px-3">Source</th>
                        <th className="px-2 sm:px-3 text-right">Amount</th>
                        <th className="px-2 sm:px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lot!.costs.map((entry) => (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 sm:px-3 whitespace-nowrap">{formatDate(entry.costDate)}</td>
                          <td className="px-2 sm:px-3 whitespace-nowrap">{entry.category}</td>
                          <td className="px-2 sm:px-3 whitespace-nowrap">{entry.sourceType || '-'}</td>
                          <td className={`px-2 sm:px-3 whitespace-nowrap text-right font-medium ${Number(entry.amount) < 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                            INR {Number(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 sm:px-3">{entry.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Lineage Tree</h2>
            <div className="rounded-lg border border-gray-200 p-3 text-sm bg-gray-50">
              <div className="font-medium text-gray-900">{lot!.lotNo}</div>
              {lot!.parentLot ? (
                <div className="mt-1 text-gray-700">
                  Parent: <Link className="text-blue-600" href={`/lots/${lot!.parentLot.id}`}>{lot!.parentLot.lotNo}</Link>
                </div>
              ) : (
                <div className="mt-1 text-gray-500">Parent: Root lot</div>
              )}

              {lot!.childLots.length > 0 ? (
                <div className="mt-3">
                  <div className="text-gray-600 mb-1">Children</div>
                  <ul className="space-y-1">
                    {lot!.childLots.map((child) => (
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
            <h2 className="font-semibold text-gray-900 mb-2">Process Timeline</h2>
            {timeline.length === 0 ? (
              <p className="text-gray-600 text-sm">No activity recorded yet.</p>
            ) : (
              <ol className="relative border-l border-gray-200 pl-4 space-y-4">
                {timeline.map((event) => {
                  if (event.kind === 'process') {
                    const p = event.data as LotProcess;
                    const dotColor = p.processType?.color || '#10b981';
                    return (
                      <li key={`proc-${p.id}`} className="relative">
                        <span className={timelineDotClass} style={{ backgroundColor: dotColor }} />
                        <p className="text-xs text-gray-500">{formatDate(p.processDate)}</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {p.processType?.name ?? 'Process'}
                          <span className="ml-2 text-xs font-normal text-gray-500">{p.processType?.stage}</span>
                        </p>
                        {p.vendor && <p className="text-xs text-gray-600">Vendor: {p.vendor.name}</p>}
                        {(p.processStartDate || p.processEndDate) && (
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>
                              {p.processStartDate && `Start: ${formatDate(p.processStartDate)}`}
                              {p.processStartDate && p.processEndDate && ' → '}
                              {p.processEndDate && `End: ${formatDate(p.processEndDate)}`}
                            </p>
                            {p.processStartDate && p.processEndDate && (
                              <p className="text-blue-600 font-semibold">
                                Duration: {Math.ceil((new Date(p.processEndDate).getTime() - new Date(p.processStartDate).getTime()) / (1000 * 60 * 60 * 24))} days
                              </p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-600">
                          In: {formatNumber(p.inputWeight)} cts → Out: {p.status === 'IN_PROGRESS' && Number(p.outputWeight) === 0 ? '--' : `${formatNumber(p.outputWeight)} cts`}
                          {!(p.status === 'IN_PROGRESS' && Number(p.outputWeight) === 0) && Number(p.lossWeight) !== 0 && (
                            <span className="ml-1 text-amber-600">Loss: {formatNumber(p.lossWeight)} cts</span>
                          )}
                        </p>
                        {Number(p.costAmount) > 0 && (
                          <p className="text-xs text-gray-600">Cost: INR {Number(p.costAmount).toLocaleString('en-IN')}</p>
                        )}
                        <p className="text-xs mt-0.5 flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${
                            p.status === 'COMPLETED' ? 'bg-green-600' :
                            p.status === 'IN_PROGRESS' ? 'bg-blue-600' : 'bg-gray-400'
                          }`}>{p.status}</span>
                          {p.status === 'COMPLETED' && p.processEndDate && (
                            <span className="text-green-600 text-[10px] font-semibold">Auto-completed</span>
                          )}
                          {p.status === 'IN_PROGRESS' ? (
                            <button
                              type="button"
                              onClick={() => startEditProcess(p)}
                              className="inline-flex items-center justify-center w-5 h-5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Edit process"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          ) : null}
                          {latestProcessId === p.id ? (
                            <button
                              type="button"
                              onClick={() => openDeleteProcessModal(p.id)}
                              disabled={deletingProcessId === p.id}
                              className="inline-flex items-center justify-center w-5 h-5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Delete latest process"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-7 0h8" />
                              </svg>
                            </button>
                          ) : null}
                        </p>
                        {p.remarks && <p className="text-xs text-gray-500 mt-0.5">Note: {p.remarks}</p>}
                      </li>
                    );
                  }
                  if (event.kind === 'split-out') {
                    const s = event.data as SplitAsSourceEntry;
                    return (
                      <li key={`sout-${s.id}`} className="relative">
                        <span className={`${timelineDotClass} bg-orange-400`} />
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
                      <span className={`${timelineDotClass} bg-sky-500`} />
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
            {lot!.childLots.length === 0 ? (
              <p className="text-gray-600 text-sm">No child lots yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full px-4 sm:px-0">
                  <table className="w-full min-w-[500px] text-xs sm:text-sm">
                    <thead><tr className="text-left border-b"><th className="py-2 px-2 sm:px-3">Lot</th><th className="px-2 sm:px-3">Initial</th><th className="px-2 sm:px-3">Current</th><th className="px-2 sm:px-3">Status</th></tr></thead>
                    <tbody>
                      {lot!.childLots.map((child) => (
                        <tr key={child.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 sm:px-3"><Link href={`/lots/${child.id}`} className="text-blue-600 break-words">{child.lotNo}</Link></td>
                          <td className="px-2 sm:px-3 whitespace-nowrap">{formatNumber(child.initialWeight)}</td>
                          <td className="px-2 sm:px-3 whitespace-nowrap">{formatNumber(child.currentWeight)}</td>
                          <td className="px-2 sm:px-3 whitespace-nowrap">{child.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        <form ref={editFormRef} onSubmit={submitProcess} className="bg-white border border-gray-200 rounded-lg p-5 h-fit space-y-3">
          <h2 className="font-semibold text-gray-900">{editingProcessId ? 'Edit Process' : 'Record Process'}</h2>
          <p className="text-sm text-gray-600">Updates lot weight and stage on save.</p>

          {/* Process type dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Process Type *</label>
            <select
              value={processTypeId}
              onChange={(e) => setProcessTypeId(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm"
              disabled={processTypeLoading}
              required
            >
              <option value="">{processTypeLoading ? 'Loading process types...' : 'Select process type'}</option>
              {allowedProcessTypeOptions.map((pt) => (
                <option key={pt.id} value={String(pt.id)}>
                  {pt.name} ({pt.stage})
                </option>
              ))}
            </select>
          </div>

          {/* Vendor search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Vendor (optional)</label>
            {vendorId ? (
              <div className="flex items-center justify-between rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100">
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
                  onFocus={() => setVDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setVDropdownOpen(false), 200)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                {vDropdownOpen && vOptions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded border border-gray-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    {vOptions.map((v) => (
                      <li key={v.id}
                        className="cursor-pointer px-3 py-2 text-gray-900 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-slate-800"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setVendorId(String(v.id));
                          setVendorName(v.name);
                          setVSearch('');
                          setVOptions([]);
                          setVDropdownOpen(false);
                        }}
                      >{v.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {lot && (
            <div className="rounded border border-blue-200 bg-blue-50 p-2 text-sm dark:border-blue-900/60 dark:bg-slate-800/80">
              <p className="text-gray-700 dark:text-gray-200">
                Current Weight:{' '}
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {formatNumber(displayCurrentWeight)} cts
                </span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Input Weight (cts) *</label>
              <input type="number" step="0.001" min="0" value={procInputWeight}
                onChange={(e) => setProcInputWeight(e.target.value)}
                className={`w-full px-3 py-2 border rounded text-sm ${mustLockInputToCurrentWeight ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                required
                max={maxAllowedInputWeight > 0 ? maxAllowedInputWeight : undefined}
                readOnly={mustLockInputToCurrentWeight}
              />
              {mustLockInputToCurrentWeight ? (
                <p className="mt-1 text-xs text-gray-500">Auto-filled from last process output (current lot weight).</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Weight (cts) {isCompletingOnOrBeforeToday ? '*' : ''}
              </label>
              <input type="number" step="0.001" min="0" value={procOutputWeight}
                onChange={(e) => setProcOutputWeight(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
                required={isCompletingOnOrBeforeToday}
              />
            </div>
          </div>

          {procInputWeight && procOutputWeight && (
            <p className="text-xs text-gray-600">
              Loss: <span className="font-semibold text-amber-600">
                {formatNumber(Math.max(0, Number(procInputWeight) - Number(procOutputWeight)))} cts
              </span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" value={procStartDate} onChange={(e) => setProcStartDate(e.target.value)}
                min={effectiveStartMinDate || undefined}
                className="w-full px-3 py-2 border rounded text-sm" required />
              {effectiveStartMinDate ? (
                <p className="mt-1 text-xs text-gray-500">On or after {effectiveStartMinDate}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={procEndDate} onChange={(e) => setProcEndDate(e.target.value)}
                min={procStartDate || undefined}
                className="w-full px-3 py-2 border rounded text-sm" />
              {procEndDate && procEndDate < procStartDate ? (
                <p className="mt-1 text-xs text-red-600">End date cannot be earlier than start date.</p>
              ) : null}
              {procEndDate && (
                (() => {
                  const endDate = new Date(procEndDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (endDate <= today) {
                    return <p className="mt-1 text-xs text-green-600 font-semibold">✓ Will auto-complete</p>;
                  } else {
                    return <p className="mt-1 text-xs text-blue-600">Auto-completes on date</p>;
                  }
                })()
              )}
            </div>
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

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={procSaving || !processTypeId || !procStartDate}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {procSaving ? <>Saving <AnimatedDots /></> : editingProcessId ? 'Update Process' : 'Record Process'}
            </button>
            {editingProcessId ? (
              <button
                type="button"
                onClick={resetProcessForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <form onSubmit={submitSplit} className="bg-white border border-gray-200 rounded-lg p-5 h-fit space-y-3">
          <h2 className="font-semibold text-gray-900">Split Lot</h2>
          <p className="text-sm text-gray-600">Enter child weights. Residual stays on source lot!.</p>

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
            Source current: <span className="font-semibold">{formatNumber(lot!.currentWeight)} cts</span>
          </div>

          <button
            type="submit"
            disabled={splitSaving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {splitSaving ? <>Saving split <AnimatedDots /></> : 'Save Split'}
          </button>
        </form>
          </div>
        )}
      </main>

      {confirmDeleteProcessId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Latest Process?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will remove the latest process, rollback lot weight/stage, and delete related process cost entries.
            </p>
            <p className="mt-1 text-sm text-red-600">This action cannot be undone.</p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteProcessModal}
                disabled={deletingProcessId !== null}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteLastProcess}
                disabled={deletingProcessId !== null}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingProcessId !== null ? <>Deleting <AnimatedDots /></> : 'Delete Process'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

       </div>
  );
}
