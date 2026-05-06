import Decimal from 'decimal.js';
import { ProcessStage } from '@prisma/client';

export type BillingType = 'PER_CARAT' | 'PER_PIECE' | 'FIXED';

export interface JobReturnEntry {
  id: number;
  returnedWeight: string;
  returnedPieces: number;
  laborCost: string;
  isFinalReturn: boolean;
  returnDate: string;
}

interface JobMeta {
  processName: string;
  billingType: BillingType;
  billingRate: string;
  issuedPieces: number;
  returns: JobReturnEntry[];
  nextReturnId: number;
}

const defaultMeta = (): JobMeta => ({
  processName: '',
  billingType: 'PER_CARAT',
  billingRate: '0',
  issuedPieces: 0,
  returns: [],
  nextReturnId: 1,
});

export function parseJobMeta(remarks: string | null | undefined): JobMeta {
  if (!remarks) {
    return defaultMeta();
  }

  try {
    const parsed = JSON.parse(remarks) as Partial<JobMeta>;
    return {
      processName: String(parsed.processName ?? ''),
      billingType: (parsed.billingType as BillingType) ?? 'PER_CARAT',
      billingRate: String(parsed.billingRate ?? '0'),
      issuedPieces: Number(parsed.issuedPieces ?? 0),
      returns: Array.isArray(parsed.returns)
        ? parsed.returns.map((entry, index) => ({
            id: Number(entry.id ?? index + 1),
            returnedWeight: String(entry.returnedWeight ?? '0'),
            returnedPieces: Number(entry.returnedPieces ?? 0),
            laborCost: String(entry.laborCost ?? '0'),
            isFinalReturn: Boolean(entry.isFinalReturn),
            returnDate: String(entry.returnDate ?? new Date().toISOString()),
          }))
        : [],
      nextReturnId: Number(parsed.nextReturnId ?? 1),
    };
  } catch {
    return defaultMeta();
  }
}

export function serializeJobMeta(meta: JobMeta): string {
  return JSON.stringify(meta);
}

export function makeLotNumber(input: string): string {
  const trimmed = input.trim();
  if (trimmed) {
    return trimmed;
  }

  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `LOT-${Date.now()}-${random}`;
}

export function toDecimal(value: string, field: string): Decimal {
  try {
    return new Decimal(value);
  } catch {
    throw new Error(`Invalid ${field}`);
  }
}

export function getLaborCost(
  billingType: BillingType,
  billingRate: Decimal,
  weightBasis: Decimal,
  returnedPieces: number
): Decimal {
  if (billingType === 'PER_CARAT') {
    return weightBasis.mul(billingRate);
  }

  if (billingType === 'PER_PIECE') {
    return new Decimal(returnedPieces).mul(billingRate);
  }

  return billingRate;
}

export function stageToCostCategory(stage: ProcessStage): 'CUTTING' | 'SARIN' | 'POLISHING' | 'MISC' {
  if (stage === 'CUTTING') return 'CUTTING';
  if (stage === 'SARIN_MEASUREMENT') return 'SARIN';
  if (stage === 'POLISHING') return 'POLISHING';
  return 'MISC';
}

export function stageFromProcessName(name: string): ProcessStage {
  const normalized = name.trim().toLowerCase();

  if (normalized.includes('sarin')) {
    return 'SARIN_MEASUREMENT';
  }

  if (normalized.includes('polish')) {
    return 'POLISHING';
  }

  if (normalized.includes('ready')) {
    return 'READY_INVENTORY';
  }

  return 'CUTTING';
}
