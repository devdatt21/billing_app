import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromHeaders(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employeeId = Number(params.id);
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

    // Check ownership
    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, createdBy: user.userId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Employee name is required' }, { status: 400 });
    }

    const employee = await prisma.employee.update({
      where: { id: employeeId },
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
        updatedBy: user.userId,
      },
    });

    return NextResponse.json(employee, { status: 200 });
  } catch (error: unknown) {
    console.error('PUT /api/employees/[id] error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target[0] : 'Field';
      return NextResponse.json({ error: `${target || 'Field'} already exists` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromHeaders(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employeeId = Number(params.id);

    // Check ownership
    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, createdBy: user.userId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Soft delete
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: user.userId,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/employees/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
