export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { ReceiveManufacturingReturnSchema } from '@/lib/validations';
import { getLaborCost, parseJobMeta, serializeJobMeta, stageToCostCategory, toDecimal } from '@/lib/manufacturing';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const jobId = Number(params.jobId);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const body = await request.json();
    const validated = ReceiveManufacturingReturnSchema.parse(body);

    const returnedWeight = toDecimal(validated.returnedWeight, 'returned weight');
    if (returnedWeight.lte(0)) {
      return NextResponse.json({ error: 'Returned weight must be greater than 0' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const job = await tx.lotProcess.findFirst({
        where: {
          id: jobId,
          createdBy: user.userId,
          isDeleted: false,
        },
        include: {
          lot: true,
          processType: true,
        },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      if (job.status === 'COMPLETED') {
        throw new Error('cannot add returns to a completed job');
      }

      const meta = parseJobMeta(job.remarks);
      const issuedWeight = toDecimal(job.inputWeight.toString(), 'issued weight');
      const alreadyReturnedDecimal = meta.returns.reduce(
        (acc, entry) => acc.add(entry.returnedWeight),
        toDecimal('0', 'returned weight')
      );
      const totalReturned = alreadyReturnedDecimal.add(returnedWeight);

      if (totalReturned.gt(issuedWeight)) {
        throw new Error('total returned weight cannot exceed issued weight');
      }

      const billingRate = toDecimal(meta.billingRate, 'billing rate');
      const laborCost = getLaborCost(meta.billingType, billingRate, issuedWeight, validated.returnedPieces);

      const returnDate = new Date();
      meta.returns.push({
        id: meta.nextReturnId,
        returnedWeight: returnedWeight.toString(),
        returnedPieces: validated.returnedPieces,
        laborCost: laborCost.toString(),
        isFinalReturn: validated.isFinalReturn,
        returnDate: returnDate.toISOString(),
      });
      meta.nextReturnId += 1;

      const nextOutput = toDecimal(job.outputWeight.toString(), 'output weight').add(returnedWeight);
      let nextLoss = toDecimal(job.lossWeight.toString(), 'loss weight');
      let nextStatus: 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS';

      let lotLostWeightToAdd = toDecimal('0', 'loss weight');
      let lotInProcessWeightToSub = returnedWeight;

      if (validated.isFinalReturn) {
        const computedLoss = issuedWeight.sub(totalReturned);
        if (computedLoss.gt(0)) {
          nextLoss = computedLoss;
          lotLostWeightToAdd = computedLoss;
          lotInProcessWeightToSub = lotInProcessWeightToSub.add(computedLoss);
        }
        nextStatus = 'COMPLETED';
      }

      await tx.lotProcess.update({
        where: { id: job.id },
        data: {
          outputWeight: new Prisma.Decimal(nextOutput.toString()),
          lossWeight: new Prisma.Decimal(nextLoss.toString()),
          status: nextStatus,
          returnedAt: validated.isFinalReturn ? returnDate : null,
          costAmount: new Prisma.Decimal(toDecimal(job.costAmount.toString(), 'cost amount').add(laborCost).toString()),
          remarks: serializeJobMeta(meta),
          updatedBy: user.userId,
        },
      });

      await tx.lot.update({
        where: { id: job.lotId },
        data: {
          availableWeight: new Prisma.Decimal(toDecimal(job.lot.availableWeight.toString(), 'available weight').add(returnedWeight).toString()),
          inProcessWeight: new Prisma.Decimal(toDecimal(job.lot.inProcessWeight.toString(), 'in process weight').sub(lotInProcessWeightToSub).toString()),
          lostWeight: new Prisma.Decimal(toDecimal(job.lot.lostWeight.toString(), 'lost weight').add(lotLostWeightToAdd).toString()),
          totalLaborCost: new Prisma.Decimal(toDecimal(job.lot.totalLaborCost.toString(), 'total labor cost').add(laborCost).toString()),
          status: validated.isFinalReturn ? 'READY' : 'IN_PROCESS',
          inventoryState: validated.isFinalReturn ? 'READY_POLISHED' : 'WIP',
          updatedBy: user.userId,
        },
      });

      await tx.materialMovement.create({
        data: {
          lotId: job.lotId,
          movementType: 'RETURN',
          fromBucket: 'VENDOR_WIP',
          toBucket: 'SAFE',
          weight: new Prisma.Decimal(returnedWeight.toString()),
        },
      });

      if (validated.isFinalReturn && lotLostWeightToAdd.gt(0)) {
        await tx.materialMovement.create({
          data: {
            lotId: job.lotId,
            movementType: 'LOSS',
            fromBucket: 'VENDOR_WIP',
            toBucket: 'LOST',
            weight: new Prisma.Decimal(lotLostWeightToAdd.toString()),
          },
        });
      }

      if (laborCost.gt(0)) {
        await tx.lotCost.create({
          data: {
            lotId: job.lotId,
            category: stageToCostCategory(job.processType.stage),
            sourceType: 'JOB_RETURN',
            sourceRefId: job.id,
            amount: new Prisma.Decimal(laborCost.toString()),
            costDate: returnDate,
            remarks: `${meta.processName || 'Process'} labor`,
            createdBy: user.userId,
          },
        });

        await tx.costMovement.create({
          data: {
            lotId: job.lotId,
            costType: 'LABOR_COST',
            amount: new Prisma.Decimal(laborCost.toString()),
          },
        });
      }
    });

    return NextResponse.json({ message: 'return received successfully' });
  } catch (error) {
    console.error('POST /api/jobs/[jobId]/return error:', error);
    if (error instanceof Error) {
      const status = error.message === 'Job not found' ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Failed to receive return' }, { status: 500 });
  }
}
