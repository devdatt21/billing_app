import { NextRequest } from 'next/server';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { GET } from './route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    lot: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('GET /api/lots', () => {
  type LotListItem = {
    id: number;
    lotNo: string;
    _count: { childLots: number };
  };

  const mockedPrisma = prisma as unknown as {
    lot: {
      findMany: jest.MockedFunction<() => Promise<LotListItem[]>>;
      count: jest.MockedFunction<() => Promise<number>>;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns lot list with pagination', async () => {
    mockedPrisma.lot.findMany.mockResolvedValue([
      { id: 1, lotNo: 'LOT/25-26/0001', _count: { childLots: 1 } },
    ]);
    mockedPrisma.lot.count.mockResolvedValue(1);

    const request = new NextRequest('http://localhost/api/lots?page=1&limit=10');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.lots).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  it('applies filters for q, status, stage and sourceType', async () => {
    mockedPrisma.lot.findMany.mockResolvedValue([]);
    mockedPrisma.lot.count.mockResolvedValue(0);

    const request = new NextRequest('http://localhost/api/lots?q=LOT%2F25&status=IN_PROCESS&stage=CUTTING&sourceType=PURCHASE');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockedPrisma.lot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'IN_PROCESS',
          currentStage: 'CUTTING',
          sourceType: 'PURCHASE',
          OR: expect.any(Array),
        }),
      })
    );
  });
});
