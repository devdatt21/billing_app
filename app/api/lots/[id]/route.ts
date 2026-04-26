export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { parseJobMeta } from '@/lib/manufacturing';

function resolveJobStatus(isCompleted: boolean, returnsCount: number): 'OPEN' | 'PARTIAL' | 'COMPLETED' {
  if (isCompleted) {
    return 'COMPLETED';
  }
  if (returnsCount > 0) {
    return 'PARTIAL';
  }
  return 'OPEN';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = Number(params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid lot ID' }, { status: 400 });
    }

    const lot = await prisma.lot.findFirst({
      where: { id, createdBy: user.userId, isDeleted: false },
      include: {
        processes: {
          where: { isDeleted: false },
          include: {
            vendor: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    const jobs = lot.processes.map((process) => {
      const meta = parseJobMeta(process.remarks);
      return {
        id: process.id,
        lotId: process.lotId,
        vendorId: process.vendorId,
        processName: meta.processName || process.processTypeId.toString(),
        billingType: meta.billingType,
        billingRate: meta.billingRate,
        issuedWeight: process.inputWeight.toString(),
        issuedPieces: meta.issuedPieces,
        status: resolveJobStatus(process.status === 'COMPLETED', meta.returns.length),
        createdAt: process.createdAt,
        updatedAt: process.updatedAt,
        vendor: process.vendor,
        returns: meta.returns,
      };
    });

    const inProcessWeight = lot.processes.reduce((acc, process) => {
      const issued = Number(process.inputWeight);
      const returned = Number(process.outputWeight) + Number(process.lossWeight);
      return acc + Math.max(issued - returned, 0);
    }, 0);

    const totalLaborCost = lot.processes.reduce((acc, process) => {
      return acc + Number(process.costAmount);
    }, 0);

    const payload = {
      id: lot.id,
      lotNumber: lot.lotNo,
      name: lot.notes || lot.lotNo,
      purchaseId: lot.sourcePurchaseId,
      initialWeight: lot.initialWeight.toString(),
      availableWeight: lot.currentWeight.toString(),
      inProcessWeight: inProcessWeight.toFixed(3),
      finishedWeight: '0.000',
      lostWeight: lot.processes.reduce((acc, process) => acc + Number(process.lossWeight), 0).toFixed(3),
      purchaseCost: lot.accumulatedCost.toString(),
      totalLaborCost: totalLaborCost.toFixed(2),
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt,
      jobs,
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    console.error('GET /api/lots/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch lot' }, { status: 500 });
  }
}
