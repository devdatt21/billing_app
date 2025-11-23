import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ReactPDF from '@react-pdf/renderer';
import InvoicePDF from '@/components/InvoicePDF';
import { getUserFromHeaders, canAccessResource } from '@/lib/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        seller: true,
        buyer: true,
        lines: {
          orderBy: { id: 'asc' },
        },
      },
    });
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Check access: admins can see all, users only their own
    const user = getUserFromHeaders(request);
    if (!canAccessResource(user, invoice.createdBy)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Convert Date and Decimal types to strings for PDF component
    const invoiceData = {
      ...invoice,
      date: invoice.date.toISOString().split('T')[0],
      subtotal: invoice.subtotal.toString(),
      sgstRate: invoice.sgstRate.toString(),
      cgstRate: invoice.cgstRate.toString(),
      sgstAmount: invoice.sgstAmount.toString(),
      cgstAmount: invoice.cgstAmount.toString(),
      totalTax: invoice.totalTax.toString(),
      rounding: invoice.rounding.toString(),
      totalAmount: invoice.totalAmount.toString(),
      lines: invoice.lines.map(line => ({
        ...line,
        qty: line.qty.toString(),
        rate: line.rate.toString(),
        amount: line.amount.toString(),
      })),
    };

    // Generate PDF using react-pdf
    const stream = await ReactPDF.renderToStream(
      InvoicePDF({ invoice: invoiceData })
    );
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);
    
    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNo.replace(/\//g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
