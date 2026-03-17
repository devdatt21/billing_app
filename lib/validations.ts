import { z } from 'zod';

const phone10NullableSchema = z.preprocess(
  (value) => {
    if (value == null) return null;
    if (typeof value !== 'string') return value;
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.length === 0 ? null : digitsOnly;
  },
  z.union([
    z.null(),
    z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  ])
);

export const CompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  gstin: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  ifsc: z.string().optional().nullable(),
  isOrganization: z.boolean().optional().default(false),
});

export const InvoiceLineSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  hsn: z.string().optional().nullable(),
  qty: z.union([z.string(), z.number()]).transform(val => String(val)),
  unit: z.string().optional().nullable(),
  rate: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const CreateInvoiceSchema = z.object({
  invoiceNo: z.string().min(1, 'Invoice number is required'),
  date: z.string().or(z.date()).transform(val => {
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
  heading: z.string().optional().default('TAX INVOICE'),
  sellerId: z.number().optional(),
  buyerId: z.number().optional(),
  seller: CompanySchema.optional(),
  buyer: CompanySchema.optional(),
  deliveryNote: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  lines: z.array(InvoiceLineSchema).min(1, 'At least one line item is required'),
  sgstPct: z.union([z.string(), z.number()]).transform(val => String(val)),
  cgstPct: z.union([z.string(), z.number()]).transform(val => String(val)),
  roundingMode: z.enum(['HALF_UP', 'TRUNCATE']).optional(),
  createdBy: z.number().optional(),
});

export const SupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  code: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  phone: phone10NullableSchema,
  email: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  openingDue: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? '0' : String(v))),
  isActive: z.boolean().optional().default(true),
});

export const VendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  code: z.string().optional().nullable(),
  vendorType: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const CustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  code: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  openingDue: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? '0' : String(v))),
  isActive: z.boolean().optional().default(true),
});

export const ProcessTypeSchema = z.object({
  name: z.string().min(1, 'Process type name is required'),
  stage: z.enum(['CUTTING', 'SARIN_MEASUREMENT', 'POLISHING', 'READY_INVENTORY', 'SOLD']),
  sequence: z.number().int().min(1),
  isActive: z.boolean().optional().default(true),
  description: z.string().optional().nullable(),
});

export const CreatePurchaseSchema = z.object({
  purchaseNo: z.string().min(1, 'Purchase number is required'),
  lotNo: z.string().optional(),
  supplierId: z.number().int().positive('Supplier is required'),
  purchaseDate: z.string().or(z.date()).transform((val) => {
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
  referenceNo: z.string().optional().nullable(),
  roughWeight: z.union([z.string(), z.number()]).transform((v) => String(v)),
  totalAmount: z.union([z.string(), z.number()]).transform((v) => String(v)),
  remarks: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'RECEIVED', 'POSTED', 'CANCELLED']).optional(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type CompanyInput = z.infer<typeof CompanySchema>;
export type SupplierInput = z.infer<typeof SupplierSchema>;
export type VendorInput = z.infer<typeof VendorSchema>;
export type CustomerInput = z.infer<typeof CustomerSchema>;
export type ProcessTypeInput = z.infer<typeof ProcessTypeSchema>;
export type CreatePurchaseInput = z.infer<typeof CreatePurchaseSchema>;
