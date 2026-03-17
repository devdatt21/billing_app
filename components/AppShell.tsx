'use client';

import Link from 'next/link';
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
  { kind: 'link', label: 'Purchase Intake', href: '/purchases' },
  { kind: 'link', label: 'Lots & Genealogy', href: '/lots' },
  {
    kind: 'group',
    label: 'ERP Master Data',
    children: [
      { label: 'Suppliers', href: '/masters/suppliers' },
      { label: 'Vendors', href: '/masters/vendors' },
      { label: 'Customers', href: '/masters/customers' },
    ],
  },
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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showMasterData, setShowMasterData] = useState(true);
  const [showBilling, setShowBilling] = useState(true);

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
    <div className="min-h-screen bg-gray-50 lg:flex">
      {isMobile && mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={`inset-y-0 left-0 border-r border-gray-200 bg-white shadow-sm transition-all duration-200 ${
          isMobile
            ? `fixed z-50 h-screen w-72 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `sticky top-0 h-screen shrink-0 ${isCollapsed ? 'w-20' : 'w-72'}`
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              {!isCollapsed || isMobile ? <h2 className="text-lg font-bold text-gray-900">Diamond ERP</h2> : null}
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  aria-label="Close navigation"
                >
                  X
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCollapsed((prev) => !prev)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  aria-label={isCollapsed ? 'Unfold navigation' : 'Fold navigation'}
                >
                  {isCollapsed ? '>>' : '<<'}
                </button>
              )}
            </div>
            {!isCollapsed || isMobile ? <p className="text-xs text-gray-500">Module Navigation</p> : null}
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
                      active ? 'bg-blue-100 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                    }`}
                    title={!isMobile && isCollapsed ? item.label : undefined}
                    onClick={() => {
                      if (isMobile) {
                        setMobileNavOpen(false);
                      }
                    }}
                  >
                    {!isMobile && isCollapsed ? item.label.charAt(0) : item.label}
                  </Link>
                );
              }

              const isMasterGroup = item.label === 'ERP Master Data';
              const expanded = isMasterGroup ? showMasterData : showBilling;

              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isMasterGroup) {
                        setShowMasterData((prev) => !prev);
                      } else {
                        setShowBilling((prev) => !prev);
                      }
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100"
                    aria-expanded={expanded}
                    title={!isMobile && isCollapsed ? item.label : undefined}
                  >
                    {!isMobile && isCollapsed ? item.label.charAt(0) : item.label}
                  </button>

                  {(isMobile || !isCollapsed) && expanded ? (
                    <div className="mt-1 ml-3 space-y-1 border-l border-gray-200 pl-3">
                      {item.children.map((child) => {
                        const active = isActivePath(pathname, child.href, child.exact, child.excludePrefixes);
                        return (
                          <Link
                            key={child.label}
                            href={child.href}
                            className={`block rounded-md px-2 py-1 text-sm transition ${
                              active ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
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

          {!isCollapsed || isMobile ? (
            <div className="border-t border-gray-200 p-3">
              <div className="mb-2 text-xs text-gray-500">
                <p className="font-semibold text-gray-900">{user.name}</p>
                <p>{user.role}</p>
              </div>
              <button
                onClick={logout}
                className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
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
        {children}
      </div>
    </div>
  );
}
