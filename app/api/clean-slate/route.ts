export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

function isConfirmationValid(value: unknown): boolean {
  return String(value ?? '')
    .trim()
    .toLowerCase() === 'clean slate';
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (!isConfirmationValid((body as { confirmation?: string }).confirmation)) {
      return NextResponse.json(
        { error: 'Type "clean slate" to confirm this action.' },
        { status: 400 }
      );
    }

    const now = new Date();

    const summary = await prisma.$transaction(async (tx) => {
      const ownedLots = await tx.lot.findMany({
        where: { createdBy: user.userId, isDeleted: false },
        select: { id: true },
      });
      const lotIds = ownedLots.map((lot) => lot.id);

      const lotProcessesSoftDeleted = await tx.lotProcess.updateMany({
        where: {
          isDeleted: false,
          OR: [
            { createdBy: user.userId },
            ...(lotIds.length > 0 ? [{ lotId: { in: lotIds } }] : []),
          ],
        },
        data: {
          isDeleted: true,
          deletedAt: now,
          status: 'CANCELLED',
          updatedBy: user.userId,
        },
      });

      const lotCostsSoftDeleted = await tx.lotCost.updateMany({
        where: {
          isDeleted: false,
          OR: [
            { createdBy: user.userId },
            ...(lotIds.length > 0 ? [{ lotId: { in: lotIds } }] : []),
          ],
        },
        data: {
          isDeleted: true,
          deletedAt: now,
        },
      });

      const lotSplitsSoftDeleted = await tx.lotSplit.updateMany({
        where: {
          isDeleted: false,
          OR: [
            { createdBy: user.userId },
            ...(lotIds.length > 0
              ? [
                  { sourceLotId: { in: lotIds } },
                  { childLotId: { in: lotIds } },
                ]
              : []),
          ],
        },
        data: {
          isDeleted: true,
          deletedAt: now,
        },
      });

      const lotsSoftDeleted = await tx.lot.updateMany({
        where: { createdBy: user.userId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: now,
          status: 'CLOSED',
          updatedBy: user.userId,
        },
      });

      const purchasesSoftDeleted = await tx.purchase.updateMany({
        where: { createdBy: user.userId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: now,
          status: 'CANCELLED',
          updatedBy: user.userId,
        },
      });

      const suppliersSoftDeleted = await tx.supplier.updateMany({
        where: { createdBy: user.userId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: now,
          isActive: false,
          updatedBy: user.userId,
        },
      });

      const vendorsSoftDeleted = await tx.vendor.updateMany({
        where: { createdBy: user.userId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: now,
          isActive: false,
          updatedBy: user.userId,
        },
      });

      const customersSoftDeleted = await tx.customer.updateMany({
        where: { createdBy: user.userId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: now,
          isActive: false,
          updatedBy: user.userId,
        },
      });

      const processTypesSoftDeleted = await tx.processType.updateMany({
        where: { createdBy: user.userId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: now,
          isActive: false,
          updatedBy: user.userId,
        },
      });

      const companiesSoftDeleted = await tx.company.updateMany({
        where: { createdBy: user.userId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: now,
        },
      });

      const purchaseInvoicesSoftDeleted = await tx.purchaseInvoice.updateMany({
        where: { uploadedBy: user.userId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: now,
        },
      });

      const invoicesCancelled = await tx.invoice.updateMany({
        where: { createdBy: user.userId, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED' },
      });

      const salesCancelled = await tx.sale.updateMany({
        where: { createdBy: user.userId, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED', updatedBy: user.userId },
      });

      const paymentsCancelled = await tx.payment.updateMany({
        where: { createdBy: user.userId, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED', updatedBy: user.userId },
      });

      return {
        lotProcessesSoftDeleted: lotProcessesSoftDeleted.count,
        lotCostsSoftDeleted: lotCostsSoftDeleted.count,
        lotSplitsSoftDeleted: lotSplitsSoftDeleted.count,
        lotsSoftDeleted: lotsSoftDeleted.count,
        purchasesSoftDeleted: purchasesSoftDeleted.count,
        suppliersSoftDeleted: suppliersSoftDeleted.count,
        vendorsSoftDeleted: vendorsSoftDeleted.count,
        customersSoftDeleted: customersSoftDeleted.count,
        processTypesSoftDeleted: processTypesSoftDeleted.count,
        companiesSoftDeleted: companiesSoftDeleted.count,
        purchaseInvoicesSoftDeleted: purchaseInvoicesSoftDeleted.count,
        invoicesCancelled: invoicesCancelled.count,
        salesCancelled: salesCancelled.count,
        paymentsCancelled: paymentsCancelled.count,
      };
    });

    return NextResponse.json({
      message: 'Clean slate completed. User-owned data has been cleared successfully.',
      summary,
    });
  } catch (error) {
    console.error('Clean slate failed:', error);
    return NextResponse.json({ error: 'Failed to complete clean slate.' }, { status: 500 });
  }
}
