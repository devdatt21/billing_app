export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.replace('Bearer ', ''));
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const roleFilter = searchParams.get('role') as 'seller' | 'buyer' | null;
    
    // Build base filter based on role
    const baseFilter: any = {};
    
    if (roleFilter === 'seller') {
      // Seller companies: only show companies owned by logged-in user (isOrganization = true)
      baseFilter.isOrganization = true;
      baseFilter.createdBy = userId;
    } else if (roleFilter === 'buyer') {
      // Buyer companies: only show companies added by the user (isOrganization = false)
      baseFilter.isOrganization = false;
      baseFilter.createdBy = userId;
    } else {
      // No filter: show all companies created by user
      baseFilter.createdBy = userId;
    }

    if (!query || query.length < 2) {
      // Return recent/most used companies if no query
      const companies = await prisma.company.findMany({
        where: baseFilter,
        take: limit,
        orderBy: {
          updatedAt: 'desc',
        },
      });
      
      return NextResponse.json(companies);
    }
    
    // Fuzzy search by name, GSTIN, or phone with role filter
    const companies = await prisma.company.findMany({
      where: {
        ...baseFilter,
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            gstin: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            phone: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            city: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });
    
    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error searching companies:', error);
    return NextResponse.json(
      { error: 'Failed to search companies' },
      { status: 500 }
    );
  }
}
