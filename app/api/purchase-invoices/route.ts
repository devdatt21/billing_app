export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    const vendorName = formData.get('vendorName') as string;
    const invoiceDate = formData.get('invoiceDate') as string;
    const amount = formData.get('amount') as string;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!invoiceNumber || !vendorName || !invoiceDate || !amount) {
      return NextResponse.json(
        { error: 'Invoice number, vendor name, date, and amount are required' },
        { status: 400 }
      );
    }

    // Validate file type (PDF, images)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(buffer, file.name);

    // Save to database
    const purchaseInvoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber,
        vendorName,
        invoiceDate: new Date(invoiceDate),
        amount: parseFloat(amount),
        description: description || null,
        category: category || null,
        fileUrl: uploadResult.secureUrl,
        publicId: uploadResult.publicId,
        fileSize: uploadResult.bytes,
        fileName: file.name,
        uploadedBy: userId,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Purchase invoice uploaded successfully',
        invoice: purchaseInvoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload purchase invoice' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const vendorName = searchParams.get('vendorName');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build filter conditions
    const where: Prisma.PurchaseInvoiceWhereInput = { isDeleted: false };

    // Date range filter
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) {
        where.invoiceDate.gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = endDateTime;
      }
    }

    // Vendor filter
    if (vendorName) {
      where.vendorName = {
        contains: vendorName,
        mode: 'insensitive',
      };
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Search across invoice number and vendor name
    if (search) {
      where.OR = [
        {
          invoiceNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          vendorName: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Fetch invoices
    const invoices = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        invoiceDate: 'desc',
      },
    });

    return NextResponse.json({ invoices }, { status: 200 });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase invoices' },
      { status: 500 }
    );
  }
}
