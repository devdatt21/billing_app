export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { IssueManufacturingJobSchema } from '@/lib/validations';
import { parseJobMeta, serializeJobMeta, stageFromProcessName, toDecimal } from '@/lib/manufacturing';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const lotId = Number(params.id);
    if (!Number.isFinite(lotId) || lotId <= 0) {
      return NextResponse.json({ error: 'Invalid lot ID' }, { status: 400 });
    }

    const body = await request.json();
    const validated = IssueManufacturingJobSchema.parse(body);

    const issuedWeight = toDecimal(validated.issuedWeight, 'issued weight');
    if (issuedWeight.lte(0)) {
      return NextResponse.json({ error: 'Issued weight must be greater than 0' }, { status: 400 });
    }

    const billingRate = toDecimal(validated.billingRate, 'billing rate');
    if (billingRate.lt(0)) {
      return NextResponse.json({ error: 'Billing rate cannot be negative' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const lot = await tx.lot.findFirst({
        where: {
          id: lotId,
          createdBy: user.userId,
          isDeleted: false,
        },
      });

      if (!lot) {
        throw new Error('Lot not found');
      }

      const vendor = await tx.vendor.findFirst({
        where: {
          id: validated.vendorId,
          createdBy: user.userId,
          isDeleted: false,
        },
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const availableWeight = toDecimal(lot.availableWeight.toString(), 'available weight');
      if (issuedWeight.gt(availableWeight)) {
        throw new Error('Insufficient available weight in lot');
      }

      const stage = stageFromProcessName(validated.processName);
      const existingProcessType = await tx.processType.findFirst({
        where: {
          createdBy: user.userId,
          name: validated.processName,
          isDeleted: false,
        },
      });

      let processTypeId = existingProcessType?.id;
      if (!processTypeId) {
        const maxSequence = await tx.processType.aggregate({
          _max: { sequence: true },
          where: { createdBy: user.userId, isDeleted: false },
        });

        const created = await tx.processType.create({
          data: {
            name: validated.processName,
            stage,
            sequence: (maxSequence._max.sequence ?? 0) + 1,
            isActive: true,
            createdBy: user.userId,
            updatedBy: user.userId,
          },
        });
        processTypeId = created.id;
      }

      const meta = parseJobMeta(null);
      meta.processName = validated.processName;
      meta.billingType = validated.billingType;
      meta.billingRate = billingRate.toString();
      meta.issuedPieces = validated.issuedPieces;
      meta.returns = [];
      meta.nextReturnId = 1;

      await tx.lotProcess.create({
        data: {
          lotId,
          processTypeId,
          vendorId: validated.vendorId,
          status: 'IN_PROGRESS',
          inputWeight: new Prisma.Decimal(issuedWeight.toString()),
          outputWeight: new Prisma.Decimal('0'),
          lossWeight: new Prisma.Decimal('0'),
          processDate: new Date(),
          sentToVendorAt: new Date(),
          costAmount: new Prisma.Decimal('0'),
          remarks: serializeJobMeta(meta),
          createdBy: user.userId,
          updatedBy: user.userId,
        },
      });

      await tx.lot.update({
        where: { id: lotId },
        data: {
          availableWeight: new Prisma.Decimal(availableWeight.sub(issuedWeight).toString()),
          status: 'IN_PROCESS',
          inventoryState: 'WIP',
          currentStage: stage,
          updatedBy: user.userId,
        },
      });
    });

    return NextResponse.json({ message: 'job issued successfully' });
  } catch (error) {
    console.error('POST /api/lots/[id]/issue error:', error);
    if (error instanceof Error) {
      const status = error.message === 'Lot not found' ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Failed to issue job' }, { status: 500 });
  }
}
