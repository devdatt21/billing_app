import { z } from 'zod';

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

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type CompanyInput = z.infer<typeof CompanySchema>;
