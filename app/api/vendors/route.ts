export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { parseJobMeta } from '@/lib/manufacturing';

function sumVendorLabor(
  processes: Array<{
    costAmount: { toString: () => string };
    remarks: string | null;
    returns: Array<{ laborCost: { toString: () => string } }>;
  }>
): number {
  return processes.reduce((total, process) => {
    const directCost = Number(process.costAmount.toString());
    if (directCost > 0) {
      return total + directCost;
    }

    if (process.returns.length > 0) {
      return total + process.returns.reduce((sum, entry) => sum + Number(entry.laborCost.toString()), 0);
    }

    const meta = parseJobMeta(process.remarks);
    return total + meta.returns.reduce((sum, entry) => sum + Number(entry.laborCost || 0), 0);
  }, 0);
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('onlyActive') === 'true';

    const vendors = await prisma.vendor.findMany({
      where: {
        createdBy: user.userId,
        isDeleted: false,
        ...(onlyActive ? { isActive: true } : {}),
      },
      include: {
        lotProcesses: {
          where: { isDeleted: false },
          select: {
            id: true,
            status: true,
            inputWeight: true,
            outputWeight: true,
            lossWeight: true,
            costAmount: true,
            remarks: true,
            returns: {
              where: { isDeleted: false },
              select: {
                laborCost: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const vendorIds = vendors.map((vendor) => vendor.id);
    const payments = vendorIds.length > 0
      ? await prisma.payment.findMany({
          where: {
            createdBy: user.userId,
            partyType: 'VENDOR',
            partyRefId: { in: vendorIds },
            direction: 'OUTGOING',
            status: { not: 'CANCELLED' },
          },
          select: {
            partyRefId: true,
            amount: true,
            status: true,
          },
        })
      : [];

    const paidByVendor = new Map<number, number>();
    payments.forEach((payment) => {
      if (payment.status !== 'CLEARED') return;
      paidByVendor.set(
        payment.partyRefId,
        (paidByVendor.get(payment.partyRefId) || 0) + Number(payment.amount.toString())
      );
    });

    const data = vendors.map((vendor) => {
      const totalLabor = sumVendorLabor(vendor.lotProcesses);
      const paidAmount = paidByVendor.get(vendor.id) || 0;
      const openJobs = vendor.lotProcesses.filter((process) => process.status !== 'COMPLETED' && process.status !== 'CANCELLED').length;
      const completedJobs = vendor.lotProcesses.filter((process) => process.status === 'COMPLETED').length;
      const issuedWeight = vendor.lotProcesses.reduce((sum, process) => sum + Number(process.inputWeight.toString()), 0);
      const returnedWeight = vendor.lotProcesses.reduce((sum, process) => sum + Number(process.outputWeight.toString()), 0);
      const lostWeight = vendor.lotProcesses.reduce((sum, process) => sum + Number(process.lossWeight.toString()), 0);

      return {
        id: vendor.id,
        name: vendor.name,
        vendorType: vendor.vendorType,
        specialization: vendor.specialization,
        isActive: vendor.isActive,
        openJobs,
        completedJobs,
        issuedWeight: issuedWeight.toFixed(3),
        returnedWeight: returnedWeight.toFixed(3),
        lostWeight: lostWeight.toFixed(3),
        totalLabor: totalLabor.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        dueAmount: Math.max(totalLabor - paidAmount, 0).toFixed(2),
      };
    });

    return NextResponse.json({ vendors: data });
  } catch (error) {
    console.error('GET /api/vendors error:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body?.name ?? '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        vendorType: typeof body?.vendorType === 'string' ? body.vendorType.trim() : null,
        specialization: typeof body?.specialization === 'string' ? body.specialization.trim() : null,
        isActive: body?.isActive !== false,
        createdBy: user.userId,
        updatedBy: user.userId,
      },
      select: {
        id: true,
        name: true,
        vendorType: true,
        specialization: true,
        isActive: true,
      },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('POST /api/vendors error:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
