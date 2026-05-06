'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Loader from '@/components/Loader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api-client';

interface VendorDetail {
  vendor: {
    id: number;
    name: string;
    code?: string | null;
    vendorType?: string | null;
    specialization?: string | null;
    phone?: string | null;
    email?: string | null;
    city?: string | null;
    state?: string | null;
    paymentTerms?: string | null;
    isActive: boolean;
  };
  summary: {
    openJobs: number;
    completedJobs: number;
    issuedWeight: string;
    returnedWeight: string;
    lossWeight: string;
    totalLabor: string;
    paidAmount: string;
    pendingPayments: string;
    dueAmount: string;
  };
  work: Array<{
    id: number;
    lotId: number;
    lotNumber: string;
    lotName: string;
    processName: string;
    status: string;
    billingType: string;
    billingRate: string;
    issuedWeight: string;
    returnedWeight: string;
    lossWeight: string;
    issuedPieces: number;
    laborCost: string;
    sentToVendorAt?: string | null;
    returnedAt?: string | null;
    createdAt: string;
  }>;
  payments: Array<{
    id: number;
    paymentNo?: string | null;
    status: string;
    amount: string;
    paymentDate: string;
    referenceNo?: string | null;
    notes?: string | null;
  }>;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function money(value: string | number): string {
  return `Rs ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateLabel(value?: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN');
}

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'payments'>('jobs');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: todayISO(),
    referenceNo: '',
    notes: '',
    status: 'CLEARED',
  });

  const loadVendor = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/vendors/${params.id}`);
      if (!res.ok) {
        setData(null);
        return;
      }

      const payload = await res.json();
      setData(payload);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    loadVendor();
  }, [user, loadVendor]);

  const recordPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (Number(paymentForm.amount) <= 0) {
      toast.warning('Enter a valid payment amount');
      return;
    }

    setSavingPayment(true);
    try {
      const res = await apiClient.post(`/api/vendors/${params.id}/payments`, {
        amount: paymentForm.amount,
        paymentDate: paymentForm.paymentDate,
        referenceNo: paymentForm.referenceNo || null,
        notes: paymentForm.notes || null,
        status: paymentForm.status,
      });

      const payload = await res.json();
      if (!res.ok) {
        toast.error(payload.error || 'Failed to record payment');
        return;
      }

      setPaymentForm({
        amount: '',
        paymentDate: todayISO(),
        referenceNo: '',
        notes: '',
        status: 'CLEARED',
      });
      setShowPaymentForm(false);
      await loadVendor();
      toast.success('Payment recorded');
    } finally {
      setSavingPayment(false);
    }
  };

  if (!user && !isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/vendors" className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Back to Vendors">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              {data?.vendor.name || 'Vendor'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPaymentForm((value) => !value)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {showPaymentForm ? 'Close' : 'Record Payment'}
            </button>
            <button
              type="button"
              onClick={loadVendor}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {loading || isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader />
          </div>
        ) : !data ? (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">
            Vendor not found.
          </div>
        ) : (
          <div className="space-y-5">
            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{data.vendor.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {[data.vendor.vendorType, data.vendor.specialization].filter(Boolean).join(' / ') || 'General vendor'}
                  </p>
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${data.vendor.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {data.vendor.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-4">
                <div><span className="text-gray-500">Phone:</span> {data.vendor.phone || '-'}</div>
                <div><span className="text-gray-500">Email:</span> {data.vendor.email || '-'}</div>
                <div><span className="text-gray-500">Location:</span> {[data.vendor.city, data.vendor.state].filter(Boolean).join(', ') || '-'}</div>
                <div><span className="text-gray-500">Terms:</span> {data.vendor.paymentTerms || '-'}</div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Open / Completed</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{data.summary.openJobs} / {data.summary.completedJobs}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Work Value</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{money(data.summary.totalLabor)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Paid</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{money(data.summary.paidAmount)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Due</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{money(data.summary.dueAmount)}</p>
              </div>
            </section>

            {showPaymentForm ? (
              <form onSubmit={recordPayment} className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                <h2 className="text-base font-semibold text-gray-900">Record Payment</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Payment Date</label>
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={paymentForm.status}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, status: event.target.value }))}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    >
                      <option value="CLEARED">Cleared</option>
                      <option value="PENDING">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Reference No</label>
                    <input
                      value={paymentForm.referenceNo}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, referenceNo: event.target.value }))}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                    <input
                      value={paymentForm.notes}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPayment}
                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                  >
                    {savingPayment ? 'Saving...' : 'Save Payment'}
                  </button>
                </div>
              </form>
            ) : null}

            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setActiveTab('jobs')}
                  className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-6 ${
                    activeTab === 'jobs'
                      ? 'border-blue-600 bg-white text-blue-600'
                      : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  Job History
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-6 ${
                    activeTab === 'payments'
                      ? 'border-blue-600 bg-white text-blue-600'
                      : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  Payments
                </button>
              </div>

              {activeTab === 'jobs' ? (
                data.work.length === 0 ? (
                  <p className="p-4 text-sm text-gray-600">No work assigned to this vendor yet.</p>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead className="border-b bg-gray-50 text-left text-gray-700">
                          <tr>
                            <th className="px-4 py-3">Lot</th>
                            <th className="px-4 py-3">Process</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Issued</th>
                            <th className="px-4 py-3 text-right">Returned</th>
                            <th className="px-4 py-3 text-right">Loss</th>
                            <th className="px-4 py-3 text-right">Labor</th>
                            <th className="px-4 py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.work.map((job) => (
                            <tr key={job.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <Link href={`/manufacturing/lots/${job.lotId}`} className="font-medium text-blue-600 hover:text-blue-700">
                                  {job.lotNumber}
                                </Link>
                                <div className="text-xs text-gray-500">{job.lotName}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{job.processName}</div>
                                <div className="text-xs text-gray-500">{job.billingType} @ {job.billingRate}</div>
                              </td>
                              <td className="px-4 py-3">{job.status}</td>
                              <td className="px-4 py-3 text-right">{Number(job.issuedWeight).toFixed(3)} ct</td>
                              <td className="px-4 py-3 text-right">{Number(job.returnedWeight).toFixed(3)} ct</td>
                              <td className="px-4 py-3 text-right">{Number(job.lossWeight).toFixed(3)} ct</td>
                              <td className="px-4 py-3 text-right">{money(job.laborCost)}</td>
                              <td className="px-4 py-3">{dateLabel(job.sentToVendorAt || job.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-gray-50/50">
                      {data.work.map((job) => (
                        <div key={job.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-800 text-base">{job.processName}</div>
                              <div className="text-xs text-gray-500">{job.lotNumber} - {job.lotName}</div>
                            </div>
                            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {job.status}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600">
                            <span className="block">Billing: <span className="font-medium text-gray-800">{job.billingType} @ {job.billingRate}</span></span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-2">
                            <div>
                              <span className="text-gray-500 block text-xs">Issued</span>
                              <span className="font-medium text-gray-800">{Number(job.issuedWeight).toFixed(3)} ct</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs">Returned</span>
                              <span className="font-medium text-gray-800">{Number(job.returnedWeight).toFixed(3)} ct</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs">Loss</span>
                              <span className="font-medium text-gray-800">{Number(job.lossWeight).toFixed(3)} ct</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-xs">Labor Cost</span>
                              <span className="font-medium text-gray-800">{money(job.laborCost)}</span>
                            </div>
                          </div>

                          <div className="text-xs text-gray-600 border-t border-gray-100 pt-2">
                            {dateLabel(job.sentToVendorAt || job.createdAt)}
                          </div>

                          <div className="pt-2 flex justify-end">
                            <Link
                              href={`/manufacturing/lots/${job.lotId}`}
                              className="rounded border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 w-full text-center"
                            >
                              View Lot
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )
              ) : data.payments.length === 0 ? (
                <p className="p-4 text-sm text-gray-600">No payments recorded.</p>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="border-b bg-gray-50 text-left text-gray-700">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Payment No</th>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Notes</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{dateLabel(payment.paymentDate)}</td>
                            <td className="px-4 py-3">{payment.paymentNo || '-'}</td>
                            <td className="px-4 py-3">{payment.referenceNo || '-'}</td>
                            <td className="px-4 py-3">{payment.status}</td>
                            <td className="px-4 py-3">{payment.notes || '-'}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{money(payment.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-gray-50/50">
                    {data.payments.map((payment) => (
                      <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="font-semibold text-gray-800 text-base">{money(payment.amount)}</div>
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {payment.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-2">
                          <div>
                            <span className="text-gray-500 block text-xs">Date</span>
                            <span className="font-medium text-gray-800">{dateLabel(payment.paymentDate)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-xs">Payment No</span>
                            <span className="font-medium text-gray-800">{payment.paymentNo || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-xs">Reference</span>
                            <span className="font-medium text-gray-800">{payment.referenceNo || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-xs">Notes</span>
                            <span className="font-medium text-gray-800">{payment.notes || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
