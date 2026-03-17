export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CompanySchema } from '@/lib/validations';
import { getUserFromHeaders } from '@/lib/auth-helpers';

interface PrismaErrorLike {
  code?: string;
  meta?: { target?: string[] };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const company = await prisma.company.findFirst({
      where: { id, isDeleted: false },
    });
    
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Check if company exists
    const existingCompany = await prisma.company.findFirst({
      where: { id, isDeleted: false },
    });
    
    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
    
    // Validate input
    const validated = CompanySchema.parse(body);
    
    // Trim stateCode to prevent whitespace issues
    if (validated.stateCode) {
      validated.stateCode = validated.stateCode.trim();
    }
    
    // Update company
    const company = await prisma.company.update({
      where: { id },
      data: validated,
    });
    
    return NextResponse.json(company);
  } catch (error: unknown) {
    console.error('Error updating company:', error);
    const prismaError = error as PrismaErrorLike;
    
    // Handle Prisma unique constraint violation
    if (prismaError.code === 'P2002') {
      const target = prismaError.meta?.target?.[0];
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
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Check if company exists
    const existingCompany = await prisma.company.findFirst({
      where: { id, isDeleted: false },
      include: {
        invoicesAsSeller: true,
        invoicesAsBuyer: true,
      },
    });
    
    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
    
    // Check if company is used in invoices
    if (existingCompany.invoicesAsSeller.length > 0 || existingCompany.invoicesAsBuyer.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete company that has invoices' },
        { status: 400 }
      );
    }
    
    // Soft-delete company
    await prisma.company.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      } as unknown as Prisma.CompanyUpdateInput,
    });
    
    return NextResponse.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}
