export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const fy = getFinancialYearParts();

    // Find the highest purchaseNo and lotNo for the current FY, including soft-deleted
    // Get all lotNos for this FY (including soft-deleted)
    const allLots = await prisma.lot.findMany({
      where: {
        createdBy: user.userId,
        lotNo: {
          startsWith: `LOT/${fy.start}-${fy.end}/`,
        },
      },
      select: { lotNo: true },
    });

    let maxLotSeq = 0;
    for (const lot of allLots) {
      const match = lot.lotNo.match(/^LOT\/(\d{2})-(\d{2})\/(\d+)$/);
      if (match && match[1] === fy.start && match[2] === fy.end) {
        const seq = parseInt(match[3], 10);
        if (!isNaN(seq) && seq > maxLotSeq) maxLotSeq = seq;
      }
    }
    const lotSeq = maxLotSeq + 1;

    // Get all purchaseNos for this FY (including soft-deleted)
    const allPurchases = await prisma.purchase.findMany({
      where: {
        createdBy: user.userId,
        purchaseNo: {
          startsWith: `PUR/${fy.start}-${fy.end}/`,
        },
      },
      select: { purchaseNo: true },
    });

    let maxPurchaseSeq = 0;
    for (const purchase of allPurchases) {
      const match = purchase.purchaseNo.match(/^PUR\/(\d{2})-(\d{2})\/(\d+)$/);
      if (match && match[1] === fy.start && match[2] === fy.end) {
        const seq = parseInt(match[3], 10);
        if (!isNaN(seq) && seq > maxPurchaseSeq) maxPurchaseSeq = seq;
      }
    }
    const purchaseSeq = maxPurchaseSeq + 1;

    const purchaseNo = `PUR/${fy.start}-${fy.end}/${purchaseSeq.toString().padStart(2, '0')}`;
    const lotNo = `LOT/${fy.start}-${fy.end}/${lotSeq.toString().padStart(4, '0')}`;

    return NextResponse.json({ purchaseNo, lotNo }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to generate next numbers' }, { status: 500 });
  }
}
