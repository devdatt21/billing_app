export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateInvoiceSchema } from '@/lib/validations';
import { calcInvoiceTotals, RoundingMode } from '@/utils/calcTax';
import { numberToWords } from '@/utils/formatting';
import Decimal from 'decimal.js';
import { getUserFromHeaders } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get user from headers
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const createdByUserId = user?.userId || null;
    
    // Validate input
    const validated = CreateInvoiceSchema.parse(body);
    
    // Check or create seller
    let sellerId = validated.sellerId;
    if (!sellerId && validated.seller) {
      const seller = await prisma.company.upsert({
        where: { gstin: validated.seller.gstin || `temp-${Date.now()}-seller` },
        update: validated.seller,
        create: validated.seller,
      });
      sellerId = seller.id;
    }
    
    // Check or create buyer
    let buyerId = validated.buyerId;
    if (!buyerId && validated.buyer) {
      const buyer = await prisma.company.upsert({
        where: { gstin: validated.buyer.gstin || `temp-${Date.now()}-buyer` },
        update: validated.buyer,
        create: validated.buyer,
      });
      buyerId = buyer.id;
    }
    
    if (!sellerId || !buyerId) {
      return NextResponse.json(
        { error: 'Seller and buyer must be provided' },
        { status: 400 }
      );
    }
    
    // Calculate totals
    const envRoundingMode: RoundingMode = process.env.TAX_ROUNDING_MODE === 'TRUNCATE' ? 'TRUNCATE' : 'HALF_UP';
    const roundingMode: RoundingMode = validated.roundingMode || envRoundingMode;
    const totals = calcInvoiceTotals(
      validated.lines,
      validated.sgstPct,
      validated.cgstPct,
      roundingMode
    );
    
    // Convert amount to words
    const amountInWords = numberToWords(totals.totalAmount);
    
    // Create invoice with lines in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNo: validated.invoiceNo,
          date: validated.date,
          heading: validated.heading || 'TAX INVOICE',
          sellerId,
          buyerId,
          deliveryNote: validated.deliveryNote || null,
          terms: validated.terms || null,
          subtotal: new Decimal(totals.subtotal),
          sgstRate: new Decimal(validated.sgstPct),
          cgstRate: new Decimal(validated.cgstPct),
          sgstAmount: new Decimal(totals.sgstAmount),
          cgstAmount: new Decimal(totals.cgstAmount),
          totalTax: new Decimal(totals.totalTax),
          rounding: new Decimal(totals.rounding),
          totalAmount: new Decimal(totals.totalAmount),
          amountInWords,
          createdBy: createdByUserId,
        },
        include: {
          seller: true,
          buyer: true,
        },
      });
      
      // Create invoice lines
      await Promise.all(
        validated.lines.map((line, index) =>
          tx.invoiceLine.create({
            data: {
              invoiceId: inv.id,
              description: line.description,
              hsn: line.hsn || null,
              qty: new Decimal(line.qty),
              unit: line.unit || null,
              rate: new Decimal(line.rate),
              amount: new Decimal(totals.lineAmounts[index]),
            },
          })
        )
      );
      
      // Fetch complete invoice with lines
      return tx.invoice.findUnique({
        where: { id: inv.id },
        include: {
          seller: true,
          buyer: true,
          lines: true,
        },
      });
    });
    
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Get user from headers
    const user = getUserFromHeaders(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const whereClause = { createdBy: user.userId };  // Row-level security: user only sees their own invoices
    
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          seller: true,
          buyer: true,
          lines: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);
    
    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
