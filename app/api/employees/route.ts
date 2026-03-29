import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromHeaders(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500);
    const q = url.searchParams.get('q')?.toLowerCase() || '';

    const where: any = {
      createdBy: user.userId,
      isDeleted: false,
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        phone: true,
        designation: true,
        department: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      take: limit,
    });

    return NextResponse.json({ employees }, { status: 200 });
  } catch (error) {
    console.error('GET /api/employees error:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromHeaders(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      name,
      code,
      email,
      phone,
      designation,
      department,
      joinDate,
      addressLine1,
      addressLine2,
      city,
      state,
      stateCode,
      bankName,
      bankAccount,
      ifsc,
      panNumber,
      aadharNumber,
      isActive,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Employee name is required' }, { status: 400 });
    }

    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        designation: designation?.trim() || null,
        department: department?.trim() || null,
        joinDate: joinDate ? new Date(joinDate) : null,
        addressLine1: addressLine1?.trim() || null,
        addressLine2: addressLine2?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        stateCode: stateCode?.trim() || null,
        bankName: bankName?.trim() || null,
        bankAccount: bankAccount?.trim() || null,
        ifsc: ifsc?.trim() || null,
        panNumber: panNumber?.trim() || null,
        aadharNumber: aadharNumber?.trim() || null,
        isActive: isActive !== false,
        createdBy: user.userId,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/employees error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: `${error.meta?.target?.[0] || 'Field'} already exists` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
