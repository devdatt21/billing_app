import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!query || query.length < 2) {
      // Return recent/most used companies if no query
      const companies = await prisma.company.findMany({
        take: limit,
        orderBy: {
          updatedAt: 'desc',
        },
      });
      
      return NextResponse.json(companies);
    }
    
    // Fuzzy search by name, GSTIN, or phone
    // Note: For production, consider using pg_trgm extension for better fuzzy matching
    const companies = await prisma.company.findMany({
      where: {
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
