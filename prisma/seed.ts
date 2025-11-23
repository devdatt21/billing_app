import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create seller company (SHIL-P-DIAM from sample invoice)
  const seller = await prisma.company.upsert({
    where: { gstin: '24DBJPG2119H1ZZ' },
    update: {},
    create: {
      name: 'SHIL-P-DIAM',
      gstin: '24DBJPG2119H1ZZ',
      addressLine1: 'Floor No. GF to 2nd Floor, 27,28, Sarita Darshan Society',
      addressLine2: 'Amroli Road, Surat-395004',
      city: 'Surat',
      state: 'Gujarat',
      stateCode: '24',
      bankName: 'Kotak Mahindra Bank',
      bankAccount: '9157261166',
      ifsc: 'KKBK0000885',
      phone: null,
    },
  });

  console.log('Created seller:', seller.name);

  // Create buyer company (Ashmira Diamonds from sample invoice)
  const buyer = await prisma.company.upsert({
    where: { gstin: '24ABCCA5360K1ZQ' },
    update: {},
    create: {
      name: 'Ashmira Diamonds',
      gstin: '24ABCCA5360K1ZQ',
      addressLine1: 'Ground Floor, Office No 29 Akshar Diamond Market',
      addressLine2: 'Varachha Road, Surat',
      city: 'Surat',
      state: 'Gujarat',
      stateCode: '24',
      phone: null,
    },
  });

  console.log('Created buyer:', buyer.name);

  // Create sample invoice (from PDF) - use upsert to avoid duplicates
  const invoice = await prisma.invoice.upsert({
    where: { invoiceNo: 'SJ/25-26/11' },
    update: {},
    create: {
      invoiceNo: 'SJ/25-26/11',
      date: new Date('2025-11-12'),
      sellerId: seller.id,
      buyerId: buyer.id,
      deliveryNote: null,
      terms: null,
      subtotal: new Decimal('389486.22'),
      sgstRate: new Decimal('0.75'),
      cgstRate: new Decimal('0.75'),
      sgstAmount: new Decimal('2921.15'),
      cgstAmount: new Decimal('2921.15'),
      totalTax: new Decimal('5842.30'),
      rounding: new Decimal('0.00'),
      totalAmount: new Decimal('395328.52'),
      amountInWords: 'Three Lakh Ninety Five Thousand Three Hundred Twenty Eight Rupees and Fifty Two Paise Only',
      createdBy: null,
    },
  });

  console.log('Created invoice:', invoice.invoiceNo);

  // Create invoice line (from PDF) - check if exists first
  const existingLine = await prisma.invoiceLine.findFirst({
    where: { invoiceId: invoice.id },
  });

  if (!existingLine) {
    const line = await prisma.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        description: 'Uncut & Polish Diamond',
        hsn: '71023910',
        qty: new Decimal('106.417'),
        unit: 'Cts',
        rate: new Decimal('3660.00'),
        amount: new Decimal('389486.22'),
      },
    });
    console.log('Created invoice line:', line.description);
  } else {
    console.log('Invoice line already exists');
  }

  // Create a few more sample companies for testing search - use upsert
  const additionalCompanies = [
    {
      gstin: '24AABCD1234E1Z5',
      name: 'Diamond Exports Ltd',
      addressLine1: 'Plot 123, Diamond District',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      phone: '+91-9876543210',
    },
    {
      gstin: '24XYZAB5678F1W9',
      name: 'Gold Trading Co',
      addressLine1: '456 Gold Street',
      city: 'Ahmedabad',
      state: 'Gujarat',
      stateCode: '24',
      phone: '+91-9123456789',
    },
    {
      gstin: '29PQRST9012G1H3',
      name: 'Jewelry Wholesalers Pvt Ltd',
      addressLine1: 'Tower A, Jewelry Hub',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
      phone: '+91-8765432109',
    },
  ];

  for (const company of additionalCompanies) {
    await prisma.company.upsert({
      where: { gstin: company.gstin },
      update: {},
      create: company,
    });
  }

  console.log('Created additional sample companies');

  // Create test users
  const adminPassword = await bcrypt.hash('admin123', 12);
  const userPassword = await bcrypt.hash('user123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@test.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      name: 'Regular User',
      email: 'user@test.com',
      password: userPassword,
      role: 'USER',
    },
  });

  console.log('Created test users:');
  console.log('  Admin: admin@test.com / admin123');
  console.log('  User: user@test.com / user123');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
