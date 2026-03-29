import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'carbonshine',
    template: '%s | carbonshine',
  },
  description: 'carbonshine ERP for purchase, lot genealogy, and billing operations',
  icons: {
    icon: '/carbonshinediamondlogo-removebg.png',
    shortcut: '/carbonshinediamondlogo-removebg.png',
    apple: '/carbonshinediamondlogo-removebg.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
