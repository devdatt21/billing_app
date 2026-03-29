'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, user, isLoading: authLoading, error: authError } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setIsSubmitting(true);

    try {
      console.log('Attempting login with:', email);
      await login(email, password);
      console.log('Login successful, redirecting...');
      // Force navigation after successful login
      window.location.href = '/';
    } catch (err: unknown) {
      console.error('Login error:', err);
      const loginError = err as { requiresVerification?: boolean; message?: string };
      
      // Check if error is due to unverified email
      if (loginError.requiresVerification) {
        setNeedsVerification(true);
        setError(loginError.message || 'Please verify your email before logging in.');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 py-12 px-4 sm:px-6 lg:px-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="max-w-md w-full">
        <div className="mb-6 text-center">
          <div className="flex justify-center">
            <Image
              src="/carbonshinelogo-removebg.png"
              alt="carbonshine"
              width={620}
              height={148}
              priority
              className="h-28 w-auto sm:h-32"
            />
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-100">Sign In</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Manage purchases, lots, and billing in one place.</p>
        </div>

        <form className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {(error || authError) && (
            <div className={`rounded-md p-4 ${needsVerification ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
              <div className="flex flex-col">
                <h3 className={`text-sm font-medium ${needsVerification ? 'text-yellow-800 dark:text-yellow-200' : 'text-red-800 dark:text-red-200'}`}>
                  {error || authError}
                </h3>
                {needsVerification && (
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(email)}`}
                    className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    Verify your email →
                  </Link>
                )}
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="flex flex-col space-y-2">
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
              >
                Forgot password?
              </Link>
            </div>
            <div className="text-center">
              <Link
                href="/signup"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
              >
                Don&apos;t have an account? Sign up
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
