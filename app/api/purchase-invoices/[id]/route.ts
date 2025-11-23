import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id: parseInt(params.id) },
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

    if (!invoice) {
      return NextResponse.json(
        { error: 'Purchase invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find invoice
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Purchase invoice not found' },
        { status: 404 }
      );
    }

    // Check if user uploaded this invoice or is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (invoice.uploadedBy !== userId && user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to delete this invoice' },
        { status: 403 }
      );
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(invoice.publicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await prisma.purchaseInvoice.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json(
      { message: 'Purchase invoice deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase invoice' },
      { status: 500 }
    );
  }
}
