import { NextRequest } from 'next/server';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    lot: {
      findUnique: jest.fn(),
    },
    processType: {
      findUnique: jest.fn(),
    },
    vendor: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  getUserFromHeaders: jest.fn(),
}));

describe('POST /api/lots/[id]/processes', () => {
  const mockedPrisma = prisma as unknown as {
    lot: { findUnique: jest.Mock };
    processType: { findUnique: jest.Mock };
    vendor: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockedGetUser = getUserFromHeaders as jest.Mock;

  function makeRequest(payload: unknown): NextRequest {
    return new NextRequest('http://localhost/api/lots/1/processes', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUser.mockReturnValue({ userId: 1, email: 'admin@billing.app', role: 'ADMIN' });
  });

  it('creates a process record and updates lot weight and stage (happy path)', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      lotNo: 'LOT/25-26/0001',
      currentWeight: '10.000',
      accumulatedCost: '50000',
      status: 'IN_PROCESS',
      inventoryState: 'WIP',
      currentStage: 'CUTTING',
    });

    mockedPrisma.processType.findUnique.mockResolvedValue({
      id: 2,
      stage: 'POLISHING',
      isActive: true,
    });

    const tx = {
      lotProcess: {
        create: jest.fn().mockResolvedValue({
          id: 10,
          lotId: 1,
          processTypeId: 2,
          vendorId: null,
          status: 'IN_PROGRESS',
          inputWeight: '10.000',
          outputWeight: '9.500',
          lossWeight: '0.500',
          costAmount: '1000',
          processDate: new Date('2026-03-16T00:00:00Z'),
          processType: { id: 2, name: 'Polishing', stage: 'POLISHING' },
          vendor: null,
        }),
      },
      lot: {
        update: jest.fn().mockResolvedValue({ id: 1, currentWeight: '9.500' }),
      },
      lotCost: {
        create: jest.fn().mockResolvedValue({ id: 5 }),
      },
    };

    mockedPrisma.$transaction.mockImplementation(
      async (callback: (arg0: typeof tx) => Promise<unknown>) => callback(tx)
    );

    const res = await POST(makeRequest({
      processTypeId: 2,
      inputWeight: '10.000',
      outputWeight: '9.500',
      processDate: '2026-03-16',
      costAmount: '1000',
      remarks: 'Polishing run',
    }), { params: { id: '1' } });

    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('IN_PROGRESS');
    expect(body.lossWeight).toBe('0.500');
    expect(tx.lotProcess.create).toHaveBeenCalledTimes(1);
    expect(tx.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ currentStage: 'POLISHING' }),
      })
    );
    expect(tx.lotCost.create).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when role is USER', async () => {
    mockedGetUser.mockReturnValue({ userId: 99, email: 'user@billing.app', role: 'USER' });

    const res = await POST(makeRequest({ processTypeId: 2, inputWeight: '5', outputWeight: '4' }), {
      params: { id: '1' },
    });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/insufficient permissions/i);
    expect(mockedPrisma.lot.findUnique).not.toHaveBeenCalled();
  });

  it('returns 422 when lot status is SOLD', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      currentWeight: '5.000',
      accumulatedCost: '0',
      status: 'SOLD',
      inventoryState: 'SOLD',
    });

    const res = await POST(makeRequest({ processTypeId: 2, inputWeight: '5', outputWeight: '4' }), {
      params: { id: '1' },
    });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/sold/i);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 422 when lot current weight is zero', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      currentWeight: '0.000',
      accumulatedCost: '0',
      status: 'IN_PROCESS',
      inventoryState: 'WIP',
    });

    const res = await POST(makeRequest({ processTypeId: 2, inputWeight: '0.000', outputWeight: '0.000' }), {
      params: { id: '1' },
    });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/no available weight/i);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 when inputWeight exceeds lot current weight', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      currentWeight: '3.000',
      accumulatedCost: '0',
      status: 'IN_PROCESS',
      inventoryState: 'WIP',
    });

    mockedPrisma.processType.findUnique.mockResolvedValue({
      id: 2,
      stage: 'CUTTING',
      isActive: true,
    });

    const res = await POST(makeRequest({ processTypeId: 2, inputWeight: '5.000', outputWeight: '4.000' }), {
      params: { id: '1' },
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/cannot exceed lot current weight/i);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 when outputWeight exceeds inputWeight', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      currentWeight: '10.000',
      accumulatedCost: '0',
      status: 'IN_PROCESS',
      inventoryState: 'WIP',
    });

    mockedPrisma.processType.findUnique.mockResolvedValue({
      id: 2,
      stage: 'CUTTING',
      isActive: true,
    });

    const res = await POST(makeRequest({ processTypeId: 2, inputWeight: '5.000', outputWeight: '6.000' }), {
      params: { id: '1' },
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/outputWeight cannot exceed inputWeight/i);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});
