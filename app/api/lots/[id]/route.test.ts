// @ts-nocheck
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { GET } from './route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    lot: {
      findUnique: jest.fn(),
    },
  },
}));

describe('GET /api/lots/[id]', () => {
  const mockedPrisma = prisma as unknown as {
    lot: { findUnique: jest.Mock<any> };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid lot id', async () => {
    const response = await GET({} as any, { params: { id: 'abc' } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid lot ID');
    expect(mockedPrisma.lot.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when lot is missing', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue(null);

    const response = await GET({} as any, { params: { id: '999' } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Lot not found');
  });

  it('returns lot detail with lineage and history includes', async () => {
    mockedPrisma.lot.findUnique.mockResolvedValue({
      id: 1,
      lotNo: 'LOT/25-26/0001',
      parentLot: { id: 10, lotNo: 'LOT/25-26/0000' },
      childLots: [{ id: 11, lotNo: 'LOT/25-26/0001-S1' }],
      splitAsSource: [{ id: 100, childLot: { id: 11, lotNo: 'LOT/25-26/0001-S1' } }],
      splitAsChild: [],
      costs: [],
      processes: [],
      sourcePurchase: null,
    });

    const response = await GET({} as any, { params: { id: '1' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(1);
    expect(body.lotNo).toBe('LOT/25-26/0001');
    expect(body.parentLot.lotNo).toBe('LOT/25-26/0000');
    expect(body.childLots).toHaveLength(1);

    expect(mockedPrisma.lot.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        include: expect.objectContaining({
          parentLot: expect.anything(),
          childLots: expect.anything(),
          splitAsSource: expect.anything(),
          splitAsChild: expect.anything(),
          costs: expect.anything(),
          processes: expect.anything(),
        }),
      })
    );
  });
});
