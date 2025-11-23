# Billing App - Mobile-First Invoice Management System

A production-ready Next.js application for creating, managing, and exporting invoices with precise tax calculations (SGST/CGST), reusable vendor management, and mobile-first responsive design.

## 🚀 Features

- **Mobile-First Design**: Optimized for 360-430px widths with big tappable inputs and sticky action bars
- **Precise Tax Calculations**: Deterministic SGST/CGST calculations using Decimal.js with configurable rounding
- **Professional PDF Export**: Generate invoices as PDFs matching exact sample layout using Puppeteer
- **Reusable Vendor Database**: Search and reuse company information with fuzzy search and typeahead
- **Real-Time Calculations**: Live invoice totals with automatic amount-to-words conversion
- **PostgreSQL + Prisma**: Robust relational database with type-safe ORM
- **TypeScript**: Full type safety across frontend and backend
- **API Routes**: RESTful API built with Next.js route handlers

## 📋 Requirements

- Node.js 20+ (LTS recommended)
- PostgreSQL 15+
- npm or pnpm

## 🛠️ Quick Start

### 1. Clone and Install Dependencies

```bash
cd billing_app
npm install
```

### 2. Setup PostgreSQL Database

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify container is running
docker ps
```

**Option B: Local PostgreSQL**

Install PostgreSQL and create a database:

```sql
CREATE DATABASE billing_app;
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and update DATABASE_URL if needed
# Default: postgresql://postgres:postgres@localhost:5432/billing_app?schema=public
```

### 4. Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npm run db:migrate

# Seed with sample data (from PDF invoice)
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
billing_app/
├── app/                      # Next.js app router
│   ├── api/                  # API route handlers
│   │   ├── companies/        # Company CRUD endpoints
│   │   ├── invoices/         # Invoice CRUD endpoints
│   │   └── search/           # Search endpoints
│   ├── invoices/
│   │   └── create/           # Invoice creation page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Homepage
├── components/               # React components
│   ├── CompanySelect.tsx     # Searchable company dropdown
│   ├── InvoiceLineEditor.tsx # Line item editor
│   └── InvoiceSummary.tsx    # Invoice total summary
├── lib/                      # Shared libraries
│   ├── prisma.ts             # Prisma client instance
│   └── validations.ts        # Zod schemas
├── prisma/                   # Prisma ORM
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Seed data (from PDF)
├── utils/                    # Utility functions
│   ├── calcTax.ts            # Tax calculation engine
│   ├── calcTax.test.ts       # Tax calculation tests
│   └── formatting.ts         # Number/currency formatting
├── docker-compose.yml        # PostgreSQL container
├── Dockerfile                # App containerization
└── package.json              # Dependencies
```

## 🧪 Testing

Run unit tests for tax calculations:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Tax Calculation Tests

The `calcTax.test.ts` file includes comprehensive tests for:
- HALF_UP rounding (default)
- TRUNCATE rounding
- Edge cases with small amounts
- Multiple line items
- Sample invoice values from the PDF

## 🔧 Configuration

### Tax Rounding Mode

Configure the default tax rounding mode in `.env`:

```env
# Options: HALF_UP (default), TRUNCATE
TAX_ROUNDING_MODE=HALF_UP
```

**HALF_UP**: Rounds to nearest even (banker's rounding) - most accurate for financial calculations  
**TRUNCATE**: Always rounds down - use if required by local regulations

### Database Connection

Update `DATABASE_URL` in `.env` to change database connection:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

## 📊 Database Schema

### Core Models

**Company** - Vendors and buyers
- name, gstin, phone
- addressLine1, addressLine2, city, state, stateCode
- bankName, bankAccount, ifsc

**Invoice** - Invoice headers
- invoiceNo (unique), date
- sellerId, buyerId (foreign keys to Company)
- subtotal, sgstRate, cgstRate
- sgstAmount, cgstAmount, totalTax
- rounding, totalAmount, amountInWords

**InvoiceLine** - Invoice line items
- invoiceId (foreign key)
- description, hsn, qty, unit, rate, amount

**User** - User accounts (for future auth)

## 🔌 API Endpoints

### Invoices

```
POST   /api/invoices          Create new invoice
GET    /api/invoices          List invoices (paginated)
GET    /api/invoices/[id]     Get invoice by ID
GET    /api/invoices/[id]/pdf Generate and download invoice PDF
```

### Companies

```
POST   /api/companies         Create new company
GET    /api/companies         List companies (paginated)
```

### Search

```
GET    /api/search/companies?q=...  Fuzzy search companies
```

## 🎨 UI Components

### CompanySelect

Mobile-friendly dropdown with:
- Server-side fuzzy search
- 300ms debouncing
- Keyboard navigation (Arrow keys, Enter, Escape)
- Recent/most-used items first
- Displays GSTIN, city, phone in each row

**Props:**
```typescript
value: Company | null
onChange: (company: Company | null) => void
label: string
placeholder?: string
roleFilter?: 'seller' | 'buyer'
debounceMs?: number (default: 300)
required?: boolean
```

### InvoiceLineEditor

Inline editing of line items with:
- Add/remove/reorder lines
- Automatic amount calculation (qty × rate)
- Validation for negative values
- Mobile-optimized inputs

### InvoiceSummary

Displays:
- Subtotal
- SGST/CGST amounts with rates
- Total tax
- Rounding adjustment (if non-zero)
- Final total (large, bold)
- Amount in words

## 📱 Mobile Optimizations

- Single-column responsive layout
- 16px minimum font size (prevents iOS zoom)
- Big tappable inputs (min 44px touch target)
- Sticky action bar at bottom
- Debounced search inputs
- Optimized for 360-430px widths

## 🎯 Tax Calculation Logic

### Example from Sample Invoice

**Input:**
- Taxable Value: ₹389,486.22
- SGST Rate: 0.75%
- CGST Rate: 0.75%

**Calculation (HALF_UP):**
```
SGST: 389486.22 × 0.0075 = 2921.14665 → 2921.15
CGST: 389486.22 × 0.0075 = 2921.14665 → 2921.15
Total Tax: 2921.15 + 2921.15 = 5842.30
Total: 389486.22 + 5842.30 = 395328.52
```

### Why Decimal.js?

JavaScript's native `Number` type uses floating-point arithmetic which can cause precision errors:

```javascript
0.1 + 0.2 === 0.3  // false! (0.30000000000000004)
```

Decimal.js provides deterministic, exact decimal arithmetic for financial calculations.

## � PDF Generation

The app generates professional PDF invoices matching the exact layout of the sample invoice. See [PDF_GENERATION.md](./PDF_GENERATION.md) for detailed documentation.

**Quick Usage:**
1. Navigate to any invoice detail page
2. Click the green "PDF" button
3. PDF will be automatically downloaded

**Features:**
- Exact layout matching sample invoice
- Indian currency formatting
- Company logos and bank details
- Tax breakdown and amount in words
- Server-side generation with Puppeteer

## �🚢 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Docker Deployment

```bash
# Build image
docker build -t billing-app .

# Run with docker-compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### Environment Variables for Production

```env
DATABASE_URL="postgresql://..."
TAX_ROUNDING_MODE=HALF_UP
NODE_ENV=production
```

## 📝 Database Management

```bash
# Open Prisma Studio (GUI)
npm run db:studio

# Create new migration
npm run db:migrate

# Deploy migrations (production)
npm run db:deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## 🔍 Troubleshooting

### TypeScript/Lint Errors During Development

The errors you see are normal during initial setup before running `npm install`. After installing dependencies, all imports will resolve correctly.

### Database Connection Issues

1. Ensure PostgreSQL is running:
   ```bash
   docker ps  # Check if postgres container is up
   ```

2. Test connection:
   ```bash
   npx prisma db push
   ```

3. Check `.env` DATABASE_URL format

### Migration Issues

If migrations fail, try:
```bash
npx prisma migrate reset  # WARNING: deletes data
npx prisma migrate dev
```

## 🎓 Architecture Decisions

### 1. Mobile-First Approach
**Why:** Primary use case is field data entry on mobile devices  
**Trade-off:** Desktop UI could be more space-efficient

### 2. Server-Side Tax Calculation
**Why:** Single source of truth, prevents client tampering  
**Trade-off:** Requires API call, but cached results mitigate latency

### 3. Decimal.js for Arithmetic
**Why:** Financial calculations require exact decimal precision  
**Trade-off:** Slightly larger bundle (~30KB), but critical for accuracy

### 4. Prisma ORM
**Why:** Type-safe database access, excellent DX, migration management  
**Trade-off:** Adds abstraction layer, but significantly reduces bugs

### 5. PostgreSQL for All Data
**Why:** Relational data model, ACID compliance, excellent search with pg_trgm  
**Trade-off:** Could use MongoDB for attachments, but KISS principle applied

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Decimal.js Documentation](https://mikemcl.github.io/decimal.js/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Sample invoice data from `Sp-25-26-11.pdf`
- Built with Next.js 14 App Router
- Styled with Tailwind CSS
- Database powered by PostgreSQL + Prisma

---

**Need Help?** Open an issue or check the troubleshooting section above.

**Happy Invoicing! 📄✨**
