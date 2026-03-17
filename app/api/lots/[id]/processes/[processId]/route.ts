export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function canWriteProcess(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'ADMIN' || r === 'ACCOUNTANT';
}

// PATCH /api/lots/[id]/processes/[processId]
// Body: { action: 'complete' | 'cancel', outputWeight?, returnedAt?, remarks? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; processId: string } }
) {
  try {
    const user = getUserFromHeaders(request);
    if (!canWriteProcess(user?.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const lotId = parseId(params.id);
    const processId = parseId(params.processId);
    if (!lotId || !processId) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const existing = await prisma.lotProcess.findUnique({
      where: { id: processId },
      include: { processType: { select: { stage: true } } },
    });

    if (!existing || existing.lotId !== lotId) {
      return NextResponse.json({ error: 'Process record not found' }, { status: 404 });
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      return NextResponse.json(
        { error: `Process is already ${existing.status.toLowerCase()}` },
        { status: 422 }
      );
    }

    const body = await request.json();
    const action: string = body.action ?? 'complete';

    if (action === 'cancel') {
      const updated = await prisma.lotProcess.update({
        where: { id: processId },
        data: {
          status: 'CANCELLED',
          remarks: body.remarks?.trim() || existing.remarks,
          updatedBy: user?.userId || null,
        },
        include: {
          processType: { select: { id: true, name: true, stage: true } },
          vendor: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json(updated);
    }

    // action === 'complete'
    const returnedAt = body.returnedAt ? new Date(body.returnedAt) : new Date();
    if (isNaN(returnedAt.getTime())) {
      return NextResponse.json({ error: 'Invalid returnedAt date' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.lotProcess.update({
        where: { id: processId },
        data: {
          status: 'COMPLETED',
          returnedAt,
          remarks: body.remarks?.trim() || existing.remarks,
          updatedBy: user?.userId || null,
        },
        include: {
          processType: { select: { id: true, name: true, stage: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      // Return lot to IN_HOUSE inventory state if it was with vendor
      const lot = await tx.lot.findUnique({ where: { id: lotId }, select: { inventoryState: true } });
      if (lot) {
        await tx.lot.update({
          where: { id: lotId },
          data: {
            inventoryState: 'WIP',
            updatedBy: user?.userId || null,
          },
        });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update process';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
