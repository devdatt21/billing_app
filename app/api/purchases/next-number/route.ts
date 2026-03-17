export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getFinancialYearParts(date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (month >= 4) {
    return {
      start: (year % 100).toString().padStart(2, '0'),
      end: ((year + 1) % 100).toString().padStart(2, '0'),
    };
  }

  return {
    start: ((year - 1) % 100).toString().padStart(2, '0'),
    end: (year % 100).toString().padStart(2, '0'),
  };
}

function getNextSequence(current: string | null, pattern: RegExp): number {
  if (!current) return 1;
  const match = current.match(pattern);
  if (!match) return 1;
  const value = parseInt(match[3], 10);
  return Number.isNaN(value) ? 1 : value + 1;
}

export async function GET() {
  try {
    const fy = getFinancialYearParts();

    const [latestPurchase, latestLot] = await Promise.all([
      prisma.purchase.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { purchaseNo: true },
      }),
      prisma.lot.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { lotNo: true },
      }),
    ]);

    const purchasePattern = /^PUR\/(\d{2})-(\d{2})\/(\d+)$/;
    const lotPattern = /^LOT\/(\d{2})-(\d{2})\/(\d+)$/;

    let purchaseSeq = 1;
    let lotSeq = 1;

    if (latestPurchase?.purchaseNo) {
      const match = latestPurchase.purchaseNo.match(purchasePattern);
      if (match && match[1] === fy.start && match[2] === fy.end) {
        purchaseSeq = getNextSequence(latestPurchase.purchaseNo, purchasePattern);
      }
    }

    if (latestLot?.lotNo) {
      const match = latestLot.lotNo.match(lotPattern);
      if (match && match[1] === fy.start && match[2] === fy.end) {
        lotSeq = getNextSequence(latestLot.lotNo, lotPattern);
      }
    }

    const purchaseNo = `PUR/${fy.start}-${fy.end}/${purchaseSeq.toString().padStart(2, '0')}`;
    const lotNo = `LOT/${fy.start}-${fy.end}/${lotSeq.toString().padStart(4, '0')}`;

    return NextResponse.json({ purchaseNo, lotNo }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to generate next numbers' }, { status: 500 });
  }
}
