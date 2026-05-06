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
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
    }

    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        createdBy: user.userId,
        isDeleted: false,
      },
      include: {
        lotProcesses: {
          where: { isDeleted: false },
          include: {
            lot: {
              select: {
                id: true,
                lotNo: true,
                notes: true,
              },
            },
            processType: {
              select: {
                name: true,
                stage: true,
              },
            },
            returns: {
              where: { isDeleted: false },
              orderBy: { returnDate: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const payments = await prisma.payment.findMany({
      where: {
        createdBy: user.userId,
        partyType: 'VENDOR',
        partyRefId: vendor.id,
      },
      orderBy: { paymentDate: 'desc' },
    });

    const work = vendor.lotProcesses.map((process) => {
      const meta = parseJobMeta(process.remarks);
      const returns = process.returns.length > 0
        ? process.returns.map((entry) => ({
            id: entry.id,
            returnedWeight: entry.returnedWeight.toString(),
            returnedPieces: entry.returnedPieces,
            lossWeight: entry.lossWeight.toString(),
            laborCost: entry.laborCost.toString(),
            isFinalReturn: entry.isFinalReturn,
            returnDate: entry.returnDate.toISOString(),
          }))
        : meta.returns.map((entry) => ({
            ...entry,
            lossWeight: '0',
          }));
      const laborCost = Number(process.costAmount.toString()) || returns.reduce(
        (sum, entry) => sum + Number(entry.laborCost || 0),
        0
      );

      return {
        id: process.id,
        lotId: process.lotId,
        lotNumber: process.lot?.lotNo || `#${process.lotId}`,
        lotName: process.lot?.notes || process.lot?.lotNo || `Lot #${process.lotId}`,
        processName: meta.processName || process.processType?.name || 'Process',
        stage: process.processType?.stage || null,
        status: process.status,
        billingType: meta.billingType,
        billingRate: meta.billingRate,
        issuedWeight: process.inputWeight.toString(),
        returnedWeight: process.outputWeight.toString(),
        lossWeight: process.lossWeight.toString(),
        issuedPieces: meta.issuedPieces,
        laborCost: laborCost.toFixed(2),
        sentToVendorAt: process.sentToVendorAt,
        returnedAt: process.returnedAt,
        createdAt: process.createdAt,
        returns,
      };
    });

    const totalLabor = work.reduce((sum, item) => sum + Number(item.laborCost), 0);
    const paidAmount = payments
      .filter((payment) => payment.direction === 'OUTGOING' && payment.status === 'CLEARED')
      .reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);
    const pendingPayments = payments
      .filter((payment) => payment.direction === 'OUTGOING' && payment.status === 'PENDING')
      .reduce((sum, payment) => sum + Number(payment.amount.toString()), 0);

    return NextResponse.json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        code: vendor.code,
        vendorType: vendor.vendorType,
        specialization: vendor.specialization,
        phone: vendor.phone,
        email: vendor.email,
        addressLine1: vendor.addressLine1,
        addressLine2: vendor.addressLine2,
        city: vendor.city,
        state: vendor.state,
        stateCode: vendor.stateCode,
        paymentTerms: vendor.paymentTerms,
        isActive: vendor.isActive,
      },
      summary: {
        openJobs: work.filter((item) => item.status !== 'COMPLETED' && item.status !== 'CANCELLED').length,
        completedJobs: work.filter((item) => item.status === 'COMPLETED').length,
        issuedWeight: work.reduce((sum, item) => sum + Number(item.issuedWeight), 0).toFixed(3),
        returnedWeight: work.reduce((sum, item) => sum + Number(item.returnedWeight), 0).toFixed(3),
        lossWeight: work.reduce((sum, item) => sum + Number(item.lossWeight), 0).toFixed(3),
        totalLabor: totalLabor.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        pendingPayments: pendingPayments.toFixed(2),
        dueAmount: Math.max(totalLabor - paidAmount, 0).toFixed(2),
      },
      work,
      payments: payments.map((payment) => ({
        id: payment.id,
        paymentNo: payment.paymentNo,
        direction: payment.direction,
        status: payment.status,
        amount: payment.amount.toString(),
        paymentDate: payment.paymentDate,
        referenceNo: payment.referenceNo,
        notes: payment.notes,
      })),
    });
  } catch (error) {
    console.error('GET /api/vendors/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}
