'use client';

interface LoaderProps {
  /** Size of the loader: 'sm' (20px), 'md' (32px), 'lg' (48px) */
  size?: 'sm' | 'md' | 'lg';
  /** Optional text to display below the loader */
  text?: string;
  /** Whether to center the loader in a full-screen container */
  fullScreen?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
};

export default function Loader({ 
  size = 'lg', 
  text, 
  fullScreen = false,
  className = '' 
}: LoaderProps) {
  const spinner = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`animate-spin ${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full`}
      />
      {text && (
        <p className={`mt-3 text-gray-700 dark:text-gray-300 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/** Inline loader for buttons and small spaces */
export function InlineLoader({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full ${className}`}
    />
  );
}
