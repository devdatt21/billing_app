import { NextRequest } from 'next/server';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    supplier: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  getUserFromHeaders: jest.fn(),
}));

describe('POST /api/purchases', () => {
  type SupplierSummary = { id: number; name: string };
  type PurchaseWithLotResult = {
    id: number;
    purchaseNo: string;
    supplier: SupplierSummary;
    lots: Array<{
      id: number;
      lotNo: string;
      costs: Array<{ id: number; category: string; amount: string }>;
    }>;
  };
  type TransactionClient = {
    purchase: {
      create: jest.MockedFunction<() => Promise<{ id: number }>>;
      findUnique: jest.MockedFunction<() => Promise<PurchaseWithLotResult>>;
    };
    lot: {
      create: jest.MockedFunction<() => Promise<{ id: number }>>;
    };
    lotCost: {
      create: jest.MockedFunction<() => Promise<{ id: number }>>;
    };
  };

  const mockedPrisma = prisma as unknown as {
    supplier: {
      findUnique: jest.MockedFunction<() => Promise<SupplierSummary | null>>;
    };
    $transaction: jest.MockedFunction<
      <TResult>(callback: (tx: TransactionClient) => Promise<TResult>) => Promise<TResult>
    >;
  };

  const mockedGetUserFromHeaders = getUserFromHeaders as jest.Mock;

  const validPayload = {
    purchaseNo: 'PUR/25-26/01',
    lotNo: 'LOT/25-26/0001',
    supplierId: 1,
    purchaseDate: '2026-03-16',
    referenceNo: 'REF-01',
    roughWeight: '1.250',
    totalAmount: '1000.00',
    remarks: 'Initial purchase',
    status: 'RECEIVED',
  };

  function makeRequest(payload = validPayload): NextRequest {
    return new NextRequest('http://localhost/api/purchases', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserFromHeaders.mockReturnValue({ userId: 10, email: 'admin@billing.app', role: 'ADMIN' });
  });

  it('returns 403 for non-write roles', async () => {
    mockedGetUserFromHeaders.mockReturnValue({ userId: 20, email: 'user@billing.app', role: 'USER' });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/Insufficient permissions/i);
    expect(mockedPrisma.supplier.findUnique).not.toHaveBeenCalled();
  });

  it('creates purchase, linked lot, and initial lot-cost entry in one transaction', async () => {
    mockedPrisma.supplier.findUnique.mockResolvedValue({ id: 1, name: 'ABC Supplier' });

    const tx: TransactionClient = {
      purchase: {
        create: jest.fn<() => Promise<{ id: number }>>().mockResolvedValue({ id: 101 }),
        findUnique: jest.fn<() => Promise<PurchaseWithLotResult>>().mockResolvedValue({
          id: 101,
          purchaseNo: validPayload.purchaseNo,
          supplier: { id: 1, name: 'ABC Supplier' },
          lots: [
            {
              id: 201,
              lotNo: validPayload.lotNo,
              costs: [
                { id: 301, category: 'PURCHASE', amount: '1000.00' },
              ],
            },
          ],
        }),
      },
      lot: {
        create: jest.fn<() => Promise<{ id: number }>>().mockResolvedValue({ id: 201 }),
      },
      lotCost: {
        create: jest.fn<() => Promise<{ id: number }>>().mockResolvedValue({ id: 301 }),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(tx.purchase.create).toHaveBeenCalledTimes(1);
    expect(tx.lot.create).toHaveBeenCalledTimes(1);
    expect(tx.lotCost.create).toHaveBeenCalledTimes(1);

    expect(tx.lot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: 'PURCHASE',
          sourcePurchaseId: 101,
          lotNo: validPayload.lotNo,
        }),
      })
    );

    expect(tx.lotCost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'PURCHASE',
          sourceType: 'PURCHASE',
          sourceRefId: 101,
          amount: expect.anything(),
        }),
      })
    );

    expect(body.id).toBe(101);
    expect(body.lots).toHaveLength(1);
    expect(body.lots[0].costs).toHaveLength(1);
  });

  it('rejects zero rough weight', async () => {
    mockedPrisma.supplier.findUnique.mockResolvedValue({ id: 1, name: 'ABC Supplier' });

    const response = await POST(makeRequest({ ...validPayload, roughWeight: '0' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Rough weight must be greater than 0/i);
  });

  it('rejects negative total amount', async () => {
    mockedPrisma.supplier.findUnique.mockResolvedValue({ id: 1, name: 'ABC Supplier' });

    const response = await POST(makeRequest({ ...validPayload, totalAmount: '-1' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/cannot be negative/i);
  });

  it('returns 404 when supplier is missing', async () => {
    mockedPrisma.supplier.findUnique.mockResolvedValue(null);

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/Supplier not found/i);
  });

  it('returns 409 for duplicate purchase number', async () => {
    mockedPrisma.supplier.findUnique.mockResolvedValue({ id: 1, name: 'ABC Supplier' });
    mockedPrisma.$transaction.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['purchaseNo'] },
    });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('purchaseNo must be unique');
  });

  it('returns 409 for duplicate lot number', async () => {
    mockedPrisma.supplier.findUnique.mockResolvedValue({ id: 1, name: 'ABC Supplier' });
    mockedPrisma.$transaction.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['lotNo'] },
    });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('lotNo must be unique');
  });
});
