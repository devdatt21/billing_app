export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

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

    // Get the latest invoice number
    const latestInvoice = await prisma.invoice.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        invoiceNo: true,
      },
    });

    // Generate next invoice number in format SJ/25-26/01
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 0-11, so add 1
    const currentYear = currentDate.getFullYear();
    
    // Determine financial year (April to March)
    let fyStart, fyEnd;
    if (currentMonth >= 4) {
      // April onwards - current year to next year
      fyStart = currentYear % 100; // Last 2 digits
      fyEnd = (currentYear + 1) % 100;
    } else {
      // Jan-March - previous year to current year
      fyStart = (currentYear - 1) % 100;
      fyEnd = currentYear % 100;
    }
    
    let nextNumber = `SJ/${fyStart.toString().padStart(2, '0')}-${fyEnd.toString().padStart(2, '0')}/01`;
    
    if (latestInvoice?.invoiceNo) {
      // Check if it matches our format SJ/YY-YY/NN
      const match = latestInvoice.invoiceNo.match(/^SJ\/(\d{2})-(\d{2})\/(\d+)$/);
      if (match) {
        const [, prevFyStart, prevFyEnd, prevNum] = match;
        // Check if same financial year
        if (prevFyStart === fyStart.toString().padStart(2, '0') && 
            prevFyEnd === fyEnd.toString().padStart(2, '0')) {
          // Increment the number
          const nextNum = parseInt(prevNum) + 1;
          nextNumber = `SJ/${fyStart.toString().padStart(2, '0')}-${fyEnd.toString().padStart(2, '0')}/${nextNum.toString().padStart(2, '0')}`;
        }
        // If different FY, nextNumber already set to 01
      }
    }

    return NextResponse.json({ nextNumber }, { status: 200 });
  } catch (error) {
    console.error('Error generating next invoice number:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice number' },
      { status: 500 }
    );
  }
}
