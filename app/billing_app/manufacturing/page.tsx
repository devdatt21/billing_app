'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManufacturingIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/billing_app/manufacturing/lots');
  }, [router]);

  return null;
}
