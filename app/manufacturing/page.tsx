'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManufacturingIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/manufacturing/lots');
  }, [router]);

  return null;
}
