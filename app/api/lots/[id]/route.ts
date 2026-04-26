export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

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
        jobs: {
          include: {
            vendor: { select: { id: true, name: true } },
            returns: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        materialMovements: {
          orderBy: { createdAt: 'desc' },
        },
        costMovements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    const jobs = lot.jobs.map((job) => {
      return {
        id: job.id,
        lotId: job.lotId,
        vendorId: job.vendorId,
        processName: job.processName,
        billingType: job.billingType,
        billingRate: job.billingRate.toString(),
        issuedWeight: job.issuedWeight.toString(),
        issuedPieces: job.issuedPieces,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        vendor: job.vendor,
        returns: job.returns.map((r) => ({
          id: r.id,
          returnedWeight: r.returnedWeight.toString(),
          returnedPieces: r.returnedPieces,
          laborCost: r.laborCost.toString(),
          isFinalReturn: r.isFinalReturn,
          returnDate: r.returnDate.toISOString(),
        })),
      };
    });

    const payload = {
      id: lot.id,
      lotNumber: lot.lotNo,
      name: lot.notes || lot.lotNo,
      purchaseId: lot.sourcePurchaseId,
      initialWeight: lot.initialWeight.toString(),
      availableWeight: lot.availableWeight.toString(),
      inProcessWeight: lot.inProcessWeight.toString(),
      finishedWeight: '0.000',
      lostWeight: lot.lostWeight.toString(),
      purchaseCost: lot.purchaseCost.toString(),
      totalLaborCost: lot.totalLaborCost.toString(),
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt,
      jobs,
      materialMovements: lot.materialMovements.map((m) => ({ ...m, weight: m.weight.toString() })),
      costMovements: lot.costMovements.map((c) => ({ ...c, amount: c.amount.toString() })),
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    console.error('GET /api/lots/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch lot' }, { status: 500 });
  }
}
