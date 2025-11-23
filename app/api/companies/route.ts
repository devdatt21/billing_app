export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CompanySchema } from '@/lib/validations';
import { getUserFromHeaders } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get user from headers
    const user = getUserFromHeaders(request);
    
    // Validate input
    const validated = CompanySchema.parse(body);
    
    // Create company
    const company = await prisma.company.create({
      data: {
        ...validated,
        createdBy: user?.userId || null,
      },
    });
    
    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    console.error('Error creating company:', error);
    
    // Handle Prisma unique constraint violation
    if (error.code === 'P2002') {
      const target = error.meta?.target?.[0];
      if (target === 'gstin') {
        return NextResponse.json(
          { error: 'A company with this GSTIN already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `This ${target} is already in use` },
        { status: 409 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Get user from headers
    const user = getUserFromHeaders(request);
    
    // Build filter: admins see all, users see only their own
    const whereClause = user?.role === 'ADMIN' ? {} : {
      createdBy: user?.userId,
    };
    
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.company.count({ where: whereClause }),
    ]);
    
    return NextResponse.json({
      companies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
