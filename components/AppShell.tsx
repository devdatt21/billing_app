'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type NavSubItem = {
  label: string;
  href: string;
  exact?: boolean;
  excludePrefixes?: string[];
};

type NavItem =
  | {
      kind: 'link';
      label: string;
      href: string;
    }
  | {
      kind: 'group';
      label: string;
      children: NavSubItem[];
    };

const navItems: NavItem[] = [
  {
    kind: 'group',
    label: 'Billing Module',
    children: [
      { label: 'Invoices', href: '/billing_app/invoices', excludePrefixes: ['/billing_app/invoices/create'] },
      { label: 'Create Invoice', href: '/billing_app/invoices/create', exact: true },
      { label: 'Companies', href: '/billing_app/companies' },
      { label: 'Purchase Invoices', href: '/billing_app/purchase-invoices' },
    ],
  },
  {
    kind: 'group',
    label: 'Manufacturing Module',
    children: [
      { label: 'Lots', href: '/billing_app/manufacturing/lots' },
    ],
  },
  { kind: 'link', label: 'Clean Slate', href: '/billing_app/clean-slate' },
];

const publicRoutes = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/resend-verification',
]);

function isActivePath(pathname: string, href: string, exact = false, excludePrefixes: string[] = []): boolean {
  if (excludePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }

  if (href === '/') {
    return pathname === '/';
  }

  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getNavIcon(label: string, className = 'h-4 w-4') {
  const normalized = label.toLowerCase();

  if (normalized.includes('purchase intake')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2m0 0L7 13h10l2-8H5.4M7 13l-1 5h12M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
    );
  }

  if (normalized.includes('lots')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7L12 3 4 7m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    );
  }

  if (normalized.includes('manufacturing')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    );
  }

  if (normalized.includes('master')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    );
  }

  if (normalized.includes('billing')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-5v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showBilling, setShowBilling] = useState(true);
  const [showManufacturing, setShowManufacturing] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      setThemeReady(true);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [theme, themeReady]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');

    const syncLayoutMode = (matches: boolean) => {
      setIsMobile(matches);
      setIsCollapsed(matches);
      if (!matches) {
        setMobileNavOpen(false);
      }
    };

    syncLayoutMode(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      syncLayoutMode(event.matches);
    };

    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, []);

  const hideShell = publicRoutes.has(pathname) || !user;

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-slate-950 dark:text-gray-100 lg:flex">
      {isMobile && mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={`inset-y-0 left-0 border-r border-gray-200 bg-white shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
          isMobile
            ? `fixed z-50 h-screen w-72 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `sticky top-0 h-screen shrink-0 ${isCollapsed ? 'w-20' : 'w-72'}`
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 bg-gradient-to-tl from-white via-sky-100 to-cyan-100 px-3 py-3 dark:border-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-cyan-900/40">
            <div
              className={`flex items-center gap-2 h-10 ${
                !isMobile && isCollapsed ? 'justify-center' : 'justify-between'
              }`}
            >
              {!isCollapsed || isMobile ? (
                <>
                  <Link
                    href="/"
                    className="inline-flex items-center"
                    onClick={() => {
                      if (isMobile) {
                        setMobileNavOpen(false);
                      }
                    }}
                    aria-label="carbonshine home"
                  >
                    <Image
                      src="/carbonshinelogo-removebg.png"
                      alt="carbonshine"
                      width={220}
                      height={48}
                      priority
                      className="h-10 w-auto"
                    />
                  </Link>
                  {/* Collapse button when expanded (desktop only) */}
                  {!isMobile && (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setIsCollapsed(true)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700"
                        aria-label="Collapse sidebar"
                        title="Collapse sidebar"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className="mx-auto flex h-12 w-full items-center justify-center cursor-pointer"
                  aria-label="Expand sidebar"
                  onClick={() => setIsCollapsed(false)}
                >
                  <Image
                    src="/carbonshinediamondlogo-removebg.png"
                    alt="favicon diamond"
                    width={44}
                    height={44}
                    className="h-11 w-11 object-contain"
                  />
                </button>
              )}
              {isMobile ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-100 dark:hover:bg-slate-800"
                    aria-label="Close navigation"
                  >
                    X
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-3" aria-label="Main navigation">
            {navItems.map((item) => {
              if (item.kind === 'link') {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                        : 'text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800'
                    }`}
                    title={!isMobile && isCollapsed ? item.label : undefined}
                    onClick={() => {
                      if (isMobile) {
                        setMobileNavOpen(false);
                      }
                    }}
                  >
                    {!isMobile && isCollapsed ? (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200">
                        {getNavIcon(item.label)}
                      </span>
                    ) : (
                      item.label
                    )}
                  </Link>
                );
              }

              const isBillingGroup = item.label === 'Billing Module';
              const isManufacturingGroup = item.label === 'Manufacturing Module';
              const expanded = isBillingGroup ? showBilling : isManufacturingGroup ? showManufacturing : true;

              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isMobile && isCollapsed) {
                        setIsCollapsed(false);
                        if (isBillingGroup) {
                          setShowBilling(true);
                        } else if (isManufacturingGroup) {
                          setShowManufacturing(true);
                        }
                        return;
                      }

                      if (isBillingGroup) {
                        setShowBilling((prev) => !prev);
                      } else if (isManufacturingGroup) {
                        setShowManufacturing((prev) => !prev);
                      }
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800"
                    aria-expanded={expanded}
                    title={!isMobile && isCollapsed ? item.label : undefined}
                  >
                    {!isMobile && isCollapsed ? (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200">
                        {getNavIcon(item.label)}
                      </span>
                    ) : (
                      item.label
                    )}
                  </button>

                  {(isMobile || !isCollapsed) && expanded ? (
                    <div className="mt-1 ml-3 space-y-1 border-l border-gray-200 pl-3 dark:border-slate-700">
                      {item.children.map((child) => {
                        const active = isActivePath(pathname, child.href, child.exact, child.excludePrefixes);
                        return (
                          <Link
                            key={child.label}
                            href={child.href}
                            className={`block rounded-md px-2 py-1 text-sm transition ${
                              active
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
                            }`}
                            onClick={() => {
                              if (isMobile) {
                                setMobileNavOpen(false);
                              }
                            }}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 p-3 dark:border-slate-800">
            {!isCollapsed || isMobile ? (
              <>
                <div className="mb-2 grid grid-cols-4 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <div className="relative col-span-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {getInitials(user.name)}
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-emerald-500" />
                  </div>
                  <div className="col-span-2 min-w-0 text-xs text-gray-500 dark:text-gray-400">
                    <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
                    <p className="truncate">Owner</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
                    className="col-span-1 inline-flex h-8 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100 dark:hover:bg-slate-700"
                    aria-label="Toggle theme"
                    title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                  >
                    {theme === 'light' ? 'Dark' : 'Light'}
                  </button>
                </div>
                <button
                  onClick={logout}
                  className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white"
                  title={`${user.name} (${user.role})`}
                >
                  {getInitials(user.name)}
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-emerald-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className={`min-w-0 flex-1 ${isMobile && !mobileNavOpen ? 'pb-24' : ''}`}>
        {isMobile && !mobileNavOpen ? (
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-blue-700 lg:hidden"
            aria-label="Open navigation menu"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Menu</span>
          </button>
        ) : null}
        <div className="theme-content min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
