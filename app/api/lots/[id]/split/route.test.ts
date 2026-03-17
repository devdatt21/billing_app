// @ts-nocheck
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
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  getUserFromHeaders: jest.fn(),
}));

describe('POST /api/lots/[id]/split', () => {
  const mockedPrisma = prisma as unknown as {
    lot: { findUnique: jest.Mock<any> };
    $transaction: jest.Mock<any>;
  };

  const mockedGetUserFromHeaders = getUserFromHeaders as jest.Mock;

  function makeRequest(payload: unknown): NextRequest {
    return new NextRequest('http://localhost/api/lots/1/split', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserFromHeaders.mockReturnValue({
      userId: 100,
      email: 'admin@billing.app',
      role: 'ADMIN',
    });
  });

  it('creates child lots and split records in one transaction (happy path)', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      lotNo: 'LOT/25-26/0001',
      currentWeight: '10.000',
      status: 'IN_PROCESS',
      inventoryState: 'WIP',
      currentStage: 'CUTTING',
      currentLocation: 'Factory',
    });

    const tx = {
      lot: {
        update: jest.fn().mockResolvedValue({ id: 1, currentWeight: '7.000', status: 'IN_PROCESS' }),
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: 11, lotNo: 'LOT/25-26/0001-S1', currentWeight: '2.000' })
          .mockResolvedValueOnce({ id: 12, lotNo: 'LOT/25-26/0001-S2', currentWeight: '1.000' }),
      },
      lotSplit: {
        create: jest.fn().mockResolvedValue({ id: 200 }),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (callback: (arg0: typeof tx) => Promise<unknown>) => callback(tx));

    const response = await POST(makeRequest({
      children: [
        { weight: '2.000' },
        { weight: '1.000' },
      ],
      remarks: 'Split for processing',
    }), { params: { id: '1' } });

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(tx.lot.update).toHaveBeenCalledTimes(1);
    expect(tx.lot.create).toHaveBeenCalledTimes(2);
    expect(tx.lotSplit.create).toHaveBeenCalledTimes(2);

    expect(tx.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          currentWeight: expect.anything(),
        }),
      })
    );

    expect(body.summary.sourceWeightBefore).toBe('10');
    expect(body.summary.childWeightTotal).toBe('3');
    expect(body.summary.residualWeight).toBe('7');
    expect(body.childLots).toHaveLength(2);
  });

  it('rejects split when child-weight total exceeds source lot weight', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      lotNo: 'LOT/25-26/0001',
      currentWeight: '5.000',
      status: 'IN_PROCESS',
      inventoryState: 'WIP',
      currentStage: 'CUTTING',
      currentLocation: 'Factory',
    });

    const response = await POST(makeRequest({
      children: [
        { weight: '4.000' },
        { weight: '2.000' },
      ],
    }), { params: { id: '1' } });

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/cannot exceed source lot current weight/i);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('closes source lot when residual weight becomes zero', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      lotNo: 'LOT/25-26/0001',
      currentWeight: '3.000',
      status: 'IN_PROCESS',
      inventoryState: 'WIP',
      currentStage: 'CUTTING',
      currentLocation: 'Factory',
    });

    const tx = {
      lot: {
        update: jest.fn().mockResolvedValue({ id: 1, currentWeight: '0.000', status: 'CLOSED' }),
        create: jest.fn().mockResolvedValue({ id: 11, lotNo: 'LOT/25-26/0001-S1', currentWeight: '3.000' }),
      },
      lotSplit: {
        create: jest.fn().mockResolvedValue({ id: 201 }),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (callback: (arg0: typeof tx) => Promise<unknown>) => callback(tx));

    const response = await POST(makeRequest({
      children: [{ weight: '3.000' }],
    }), { params: { id: '1' } });

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(tx.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CLOSED',
        }),
      })
    );
    expect(body.summary.residualWeight).toBe('0');
  });

  it('returns 409 when child lot number conflicts with unique constraint', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      lotNo: 'LOT/25-26/0001',
      currentWeight: '5.000',
      status: 'IN_PROCESS',
      inventoryState: 'WIP',
      currentStage: 'CUTTING',
      currentLocation: 'Factory',
    });

    mockedPrisma.$transaction.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['lotNo'] },
    });

    const response = await POST(makeRequest({
      children: [{ lotNo: 'LOT/25-26/0001-S1', weight: '1.000' }],
    }), { params: { id: '1' } });

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('lotNo must be unique');
  });

  it('returns 403 when user role cannot split lots', async () => {
    mockedGetUserFromHeaders.mockReturnValue({
      userId: 200,
      email: 'user@billing.app',
      role: 'USER',
    });

    const response = await POST(
      makeRequest({ children: [{ weight: '1.000' }] }),
      { params: { id: '1' } }
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/Insufficient permissions/i);
    expect(mockedPrisma.lot.findUnique).not.toHaveBeenCalled();
  });

  it('returns 400 when source lot has zero available weight', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      lotNo: 'LOT/25-26/0001',
      currentWeight: '0.000',
      status: 'IN_PROCESS',
      inventoryState: 'WIP',
      currentStage: 'CUTTING',
      currentLocation: 'Factory',
    });

    const response = await POST(
      makeRequest({ children: [{ weight: '1.000' }] }),
      { params: { id: '1' } }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/no available weight/i);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 when children array is empty', async () => {
    mockedGetUserFromHeaders.mockReturnValue({
      userId: 100,
      email: 'admin@billing.app',
      role: 'ADMIN',
    });

    const response = await POST(
      makeRequest({ children: [] }),
      { params: { id: '1' } }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/at least one child lot is required/i);
    expect(mockedPrisma.lot.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});
