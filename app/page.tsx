'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect } from 'react';
import Loader from '@/components/Loader';

const throughputBars = [56, 72, 64, 88, 76, 92, 68];
const revenueBars = [42, 58, 49, 73, 65, 79, 70, 84];
const linePath = 'M 0 76 C 40 40, 70 52, 100 34 S 170 18, 220 44 S 300 72, 360 26';

function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-sm text-gray-600">{hint}</p>
    </div>
  );
}

function MiniBarChart({ values, color }: { values: number[]; color: string }) {
  return (
    <div className="flex h-40 items-end gap-2">
      {values.map((value, index) => (
        <div key={`${color}-${index}`} className="flex-1 rounded-t-md bg-gray-100">
          <div
            className={`w-full rounded-t-md ${color}`}
            style={{ height: `${value}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <Loader fullScreen text="Loading..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="bg-white rounded-lg shadow-md border border-gray-200 p-6 sm:p-8 mb-6">
          <Image
            src="/carbonshinelogo-removebg.png"
            alt="carbonshine"
            width={220}
            height={48}
            priority
            className="h-10 w-auto"
          />
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">Welcome back, {user.name}</h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base text-gray-600">
            This is the ERP landing dashboard. Charts are dummy placeholders for now and will be connected to live purchase, lot,
            billing, and process data once the ERP modules are fully ready.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard title="Rough Lots In Process" value="128" hint="Placeholder KPI for live lot workflow tracking." />
          <MetricCard title="Open Purchase Entries" value="24" hint="Dummy intake volume until purchase analytics are wired." />
          <MetricCard title="Billing This Week" value="Rs 18.4L" hint="Static billing summary for dashboard layout validation." />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Throughput Trend</h2>
                <p className="text-sm text-gray-600">Dummy chart for lot movement across stages</p>
              </div>
              <span className="text-xs font-medium text-gray-500">Last 7 days</span>
            </div>
            <div className="h-44 w-full rounded-lg bg-gradient-to-b from-blue-50 to-white p-3">
              <svg viewBox="0 0 360 100" className="h-full w-full">
                <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
                <path d={linePath} fill="none" stroke="#93c5fd" strokeWidth="10" strokeLinecap="round" opacity="0.35" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Stage Output Mix</h2>
                <p className="text-sm text-gray-600">Dummy chart for process output distribution</p>
              </div>
              <span className="text-xs font-medium text-gray-500">Current cycle</span>
            </div>
            <MiniBarChart values={throughputBars} color="bg-blue-500" />
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Revenue Projection</h2>
                <p className="text-sm text-gray-600">Placeholder visual for billing and sales forecasting</p>
              </div>
              <span className="text-xs font-medium text-gray-500">Projected</span>
            </div>
            <MiniBarChart values={revenueBars} color="bg-emerald-500" />
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Implementation Notes</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                Live KPIs will come from purchases, lots, genealogy, and billing services.
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                Current visuals are static so we can stabilize layout before binding APIs.
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                Left navigation remains the primary way to enter each module.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
