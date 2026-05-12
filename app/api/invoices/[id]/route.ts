export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/auth-helpers';
import { calcInvoiceTotals, RoundingMode } from '@/utils/calcTax';
import { numberToWords } from '@/utils/formatting';
import Decimal from 'decimal.js';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }
    
    const invoice = await prisma.invoice.findFirst({
      where: { id, createdBy: user.userId },  // Row-level security: user only sees their own invoices
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
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
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
    const user = getUserFromHeaders(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { heading, seller, buyer, deliveryNote, terms, lines, sgstPct, cgstPct, roundingMode } = body;

    // Verify invoice exists and belongs to user
    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, createdBy: user.userId },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Update or create seller
    let sellerId = seller?.id;
    if (!sellerId && seller) {
      const updatedSeller = await prisma.company.upsert({
        where: { gstin: seller.gstin || `temp-${Date.now()}-seller` },
        update: seller,
        create: seller,
      });
      sellerId = updatedSeller.id;
    }

    // Update or create buyer
    let buyerId = buyer?.id;
    if (!buyerId && buyer) {
      const updatedBuyer = await prisma.company.upsert({
        where: { gstin: buyer.gstin || `temp-${Date.now()}-buyer` },
        update: buyer,
        create: buyer,
      });
      buyerId = updatedBuyer.id;
    }

    if (!sellerId || !buyerId) {
      return NextResponse.json(
        { error: 'Seller and buyer must be provided' },
        { status: 400 }
      );
    }

    // Calculate totals
    const envRoundingMode: RoundingMode = process.env.TAX_ROUNDING_MODE === 'TRUNCATE' ? 'TRUNCATE' : 'HALF_UP';
    const rounding: RoundingMode = roundingMode || envRoundingMode;
    const totals = calcInvoiceTotals(
      lines,
      sgstPct,
      cgstPct,
      rounding
    );

    // Convert amount to words
    const amountInWords = numberToWords(totals.totalAmount);

    // Update invoice in transaction
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // Update invoice
      const inv = await tx.invoice.update({
        where: { id },
        data: {
          heading: heading || 'TAX INVOICE',
          sellerId,
          buyerId,
          deliveryNote: deliveryNote || null,
          terms: terms || null,
          subtotal: new Decimal(totals.subtotal),
          sgstRate: new Decimal(sgstPct),
          cgstRate: new Decimal(cgstPct),
          sgstAmount: new Decimal(totals.sgstAmount),
          cgstAmount: new Decimal(totals.cgstAmount),
          totalTax: new Decimal(totals.totalTax),
          rounding: new Decimal(totals.rounding),
          totalAmount: new Decimal(totals.totalAmount),
          amountInWords,
        },
        include: {
          seller: true,
          buyer: true,
        },
      });

      // Delete existing lines
      await tx.invoiceLine.deleteMany({
        where: { invoiceId: id },
      });

      // Create new invoice lines
      await Promise.all(
        lines.map((line: any) =>
          tx.invoiceLine.create({
            data: {
              invoiceId: inv.id,
              description: line.description,
              hsn: line.hsn || null,
              qty: new Decimal(line.qty),
              unit: line.unit || null,
              rate: new Decimal(line.rate),
              amount: new Decimal(line.qty) * new Decimal(line.rate),
            },
          })
        )
      );

      return inv;
    });

    // Fetch complete updated invoice with lines
    const completeInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        seller: true,
        buyer: true,
        lines: {
          orderBy: { id: 'asc' },
        },
      },
    });

    return NextResponse.json(completeInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}
