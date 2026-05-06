export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { parseJobMeta } from '@/lib/manufacturing';

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
            returns: {
              where: { isDeleted: false },
              orderBy: { returnDate: 'asc' },
            },
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

    const jobs = lot.processes.map((process) => {
      const meta = parseJobMeta(process.remarks);
      const returns = process.returns.length > 0
        ? process.returns.map((entry) => ({
            id: entry.id,
            returnedWeight: entry.returnedWeight.toString(),
            returnedPieces: entry.returnedPieces,
            laborCost: entry.laborCost.toString(),
            isFinalReturn: entry.isFinalReturn,
            returnDate: entry.returnDate.toISOString(),
          }))
        : meta.returns;
      
      let mappedStatus: string = process.status;
      if (process.status === 'IN_PROGRESS') {
        mappedStatus = returns.length > 0 ? 'PARTIAL' : 'OPEN';
      }

      return {
        id: process.id,
        lotId: process.lotId,
        vendorId: process.vendorId,
        processName: meta.processName,
        billingType: meta.billingType,
        billingRate: meta.billingRate,
        issuedWeight: process.inputWeight.toString(),
        issuedPieces: meta.issuedPieces,
        status: mappedStatus,
        createdAt: process.createdAt,
        updatedAt: process.updatedAt,
        vendor: process.vendor,
        returns,
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

export async function DELETE(
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
    });

    if (!lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    await prisma.lot.update({
      where: { id },
      data: { isDeleted: true, updatedBy: user.userId },
    });

    return NextResponse.json({ message: 'Lot deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/lots/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete lot' }, { status: 500 });
  }
}
