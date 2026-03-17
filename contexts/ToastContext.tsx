'use client';

import { createContext, ReactNode, useContext, useMemo } from 'react';
import { Toaster, toast } from 'react-hot-toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ToastContextType>(() => ({
    showToast: (message: string, type: ToastType = 'info') => {
      if (type === 'success') {
        toast.success(message, { duration: 3500 });
        return;
      }
      if (type === 'error') {
        toast.error(message, { duration: 7000 });
        return;
      }
      if (type === 'warning') {
        toast(message, { icon: '⚠️', duration: 4500 });
        return;
      }
      toast(message, { duration: 3500 });
    },
    success: (message: string) => toast.success(message, { duration: 3500 }),
    error: (message: string) => toast.error(message, { duration: 7000 }),
    warning: (message: string) => toast(message, { icon: '⚠️', duration: 4500 }),
    info: (message: string) => toast(message, { duration: 3500 }),
  }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            zIndex: 99999,
            maxWidth: '420px',
            borderRadius: '10px',
            color: '#ffffff',
            background: '#334155',
          },
          success: {
            style: {
              background: '#16a34a',
              color: '#ffffff',
            },
          },
          error: {
            duration: 7000,
            style: {
              background: '#dc2626',
              color: '#ffffff',
            },
          },
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
