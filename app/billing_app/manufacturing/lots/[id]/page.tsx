'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';

interface JobReturn {
  id: number;
  returnedWeight: string;
  returnedPieces: number;
  laborCost: string;
  isFinalReturn: boolean;
  returnDate: string;
}

interface Job {
  id: number;
  lotId: number;
  vendorId: number | null;
  processName: string;
  billingType: 'PER_CARAT' | 'PER_PIECE' | 'FIXED' | string;
  billingRate: string;
  issuedWeight: string;
  issuedPieces: number;
  status: 'OPEN' | 'PARTIAL' | 'COMPLETED' | string;
  returns: JobReturn[];
  vendor?: {
    id: number;
    name: string;
  } | null;
}

interface LotDetail {
  id: number;
  lotNumber: string;
  name: string;
  purchaseId?: number | null;
  initialWeight: string;
  availableWeight: string;
  inProcessWeight: string;
  lostWeight: string;
  purchaseCost: string;
  totalLaborCost: string;
  jobs: Job[];
}

interface VendorOption {
  id: number;
  name: string;
}

export default function LotDetailPage({ params }: { params: { id: string } }) {
  const toast = useToast();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const lotId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [lot, setLot] = useState<LotDetail | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  const [vendorId, setVendorId] = useState('');
  const [processName, setProcessName] = useState('');
  const [billingType, setBillingType] = useState<'PER_CARAT' | 'PER_PIECE' | 'FIXED'>('PER_CARAT');
  const [billingRate, setBillingRate] = useState('');
  const [issuedWeight, setIssuedWeight] = useState('');
  const [issuedPieces, setIssuedPieces] = useState('0');

  const [returnedWeight, setReturnedWeight] = useState('');
  const [returnedPieces, setReturnedPieces] = useState('0');
  const [isFinalReturn, setIsFinalReturn] = useState(false);

  const [savingIssue, setSavingIssue] = useState(false);
  const [savingReturn, setSavingReturn] = useState(false);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');

  const openJobs = useMemo(() => {
    return (lot?.jobs || []).filter((job) => job.status === 'OPEN' || job.status === 'PARTIAL');
  }, [lot]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const loadVendors = useCallback(async () => {
    const res = await apiClient.get('/api/vendors?onlyActive=true');
    if (!res.ok) {
      setVendors([]);
      return;
    }
    const data = await res.json();
    setVendors(data.vendors || []);
  }, []);

  const loadLot = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/lots/${lotId}`);
      if (!res.ok) {
        setLot(null);
        return;
      }
      const data = await res.json();
      setLot(data.data || null);
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    if (!user || !Number.isFinite(lotId) || lotId <= 0) return;
    void Promise.all([loadLot(), loadVendors()]);
  }, [user, lotId, loadLot, loadVendors]);

  const onCreateVendor = async () => {
    const name = newVendorName.trim();
    if (!name) {
      toast.warning('Enter vendor name first');
      return;
    }

    setCreatingVendor(true);
    try {
      const res = await apiClient.post('/api/vendors', { name });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create vendor');
        return;
      }
      setNewVendorName('');
      await loadVendors();
      setVendorId(String(data.id));
      toast.success('Vendor created');
    } finally {
      setCreatingVendor(false);
    }
  };

  const onIssueJob = async (event: FormEvent) => {
    event.preventDefault();

    setSavingIssue(true);
    try {
      const payload = {
        vendorId: Number(vendorId),
        processName,
        billingType,
        billingRate,
        issuedWeight,
        issuedPieces: Number(issuedPieces || '0'),
      };

      const res = await apiClient.post(`/api/lots/${lotId}/issue`, payload);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to issue job');
        return;
      }

      setShowIssueForm(false);
      setVendorId('');
      setProcessName('');
      setBillingType('PER_CARAT');
      setBillingRate('');
      setIssuedWeight('');
      setIssuedPieces('0');
      await loadLot();
      toast.success('Job issued successfully');
    } finally {
      setSavingIssue(false);
    }
  };

  const onReceiveReturn = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeJobId) return;

    setSavingReturn(true);
    try {
      const payload = {
        returnedWeight,
        returnedPieces: Number(returnedPieces || '0'),
        isFinalReturn,
      };

      const res = await apiClient.post(`/api/jobs/${activeJobId}/return`, payload);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to receive return');
        return;
      }

      setReturnedWeight('');
      setReturnedPieces('0');
      setIsFinalReturn(false);
      setActiveJobId(null);
      await loadLot();
      toast.success('Return received successfully');
    } finally {
      setSavingReturn(false);
    }
  };

  if (!Number.isFinite(lotId) || lotId <= 0) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">Invalid lot id.</p>
      </div>
    );
  }

  if (!user && !isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/billing_app/manufacturing/lots" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to lots">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">{lot ? `${lot.name} (${lot.lotNumber})` : `Lot #${lotId}`}</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowIssueForm((v) => !v)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {showIssueForm ? 'Close' : 'Issue Job'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {loading || isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader />
          </div>
        ) : !lot ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">Lot not found.</div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <Metric label="Initial" value={`${Number(lot.initialWeight).toFixed(3)} ct`} />
              <Metric label="Available" value={`${Number(lot.availableWeight).toFixed(3)} ct`} />
              <Metric label="In Process" value={`${Number(lot.inProcessWeight).toFixed(3)} ct`} />
              <Metric label="Lost" value={`${Number(lot.lostWeight).toFixed(3)} ct`} />
              <Metric label="Labor" value={`₹${Number(lot.totalLaborCost).toFixed(2)}`} />
            </section>

            {showIssueForm ? (
              <form onSubmit={onIssueJob} className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                <h2 className="text-base font-semibold text-gray-900">Issue Job</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    <select
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Vendor (optional quick add)</label>
                    <div className="flex gap-2">
                      <input
                        value={newVendorName}
                        onChange={(e) => setNewVendorName(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Vendor name"
                      />
                      <button
                        type="button"
                        onClick={onCreateVendor}
                        disabled={creatingVendor}
                        className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-70"
                      >
                        {creatingVendor ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Process Name</label>
                    <input
                      value={processName}
                      onChange={(e) => setProcessName(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Laser / Sarin / Polishing"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type</label>
                    <select
                      value={billingType}
                      onChange={(e) => setBillingType(e.target.value as 'PER_CARAT' | 'PER_PIECE' | 'FIXED')}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="PER_CARAT">Per Carat</option>
                      <option value="PER_PIECE">Per Piece</option>
                      <option value="FIXED">Fixed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={billingRate}
                      onChange={(e) => setBillingRate(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issued Weight</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={issuedWeight}
                      onChange={(e) => setIssuedWeight(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issued Pieces</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={issuedPieces}
                      onChange={(e) => setIssuedPieces(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingIssue}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {savingIssue ? 'Issuing...' : 'Issue Job'}
                  </button>
                </div>
              </form>
            ) : null}

            <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Process Jobs</h2>
              </div>

              {lot.jobs.length === 0 ? (
                <p className="p-4 text-sm text-gray-600">No jobs yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Process</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vendor</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Issued</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Billing</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Returns</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lot.jobs.map((job) => (
                        <tr key={job.id} className="border-b border-gray-100 align-top">
                          <td className="px-4 py-3 text-sm text-gray-800">{job.processName}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{job.vendor?.name || (job.vendorId ? `#${job.vendorId}` : '-')}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{Number(job.issuedWeight).toFixed(3)} ct / {job.issuedPieces} pcs</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{job.billingType} @ {job.billingRate}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{job.status}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {job.returns.length === 0 ? (
                              <span className="text-gray-500">No returns</span>
                            ) : (
                              <div className="space-y-1">
                                {job.returns.map((entry) => (
                                  <div key={entry.id} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                                    {Number(entry.returnedWeight).toFixed(3)} ct / {entry.returnedPieces} pcs - {entry.isFinalReturn ? 'Final' : 'Partial'}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {(job.status === 'OPEN' || job.status === 'PARTIAL') ? (
                              <button
                                type="button"
                                onClick={() => setActiveJobId(job.id)}
                                className="rounded border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                              >
                                Receive Return
                              </button>
                            ) : (
                              <span className="text-gray-500">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {activeJobId ? (
              <form onSubmit={onReceiveReturn} className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                <h2 className="text-base font-semibold text-gray-900">Receive Return for Job #{activeJobId}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Returned Weight</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={returnedWeight}
                      onChange={(e) => setReturnedWeight(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Returned Pieces</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={returnedPieces}
                      onChange={(e) => setReturnedPieces(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Final Return</label>
                    <label className="flex items-center gap-2 rounded border px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isFinalReturn}
                        onChange={(e) => setIsFinalReturn(e.target.checked)}
                      />
                      Mark as final return
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveJobId(null)}
                    className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingReturn}
                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {savingReturn ? 'Saving...' : 'Save Return'}
                  </button>
                </div>
              </form>
            ) : null}

            {openJobs.length === 0 && lot.jobs.length > 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                All jobs for this lot are completed.
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
    </article>
  );
}
