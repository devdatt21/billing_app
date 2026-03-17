export const LOT_STATUS = [
  'PURCHASED',
  'IN_PROCESS',
  'AT_VENDOR',
  'READY',
  'SOLD',
  'CLOSED',
  'HOLD',
] as const;

export const INVENTORY_STATE = [
  'ROUGH',
  'WIP',
  'READY_POLISHED',
  'SOLD',
  'LOSS',
  'RETURNED',
] as const;

export const PROCESS_STAGE = [
  'CUTTING',
  'SARIN_MEASUREMENT',
  'POLISHING',
  'READY_INVENTORY',
  'SOLD',
] as const;

export type LotStatus = (typeof LOT_STATUS)[number];
export type InventoryState = (typeof INVENTORY_STATE)[number];
export type ProcessStage = (typeof PROCESS_STAGE)[number];

// Core Phase 1 rule: sold/closed lots cannot move back into manufacturing stages.
const TERMINAL_STATUSES = new Set<LotStatus>(['SOLD', 'CLOSED']);

export function canTransitionFromTerminalStatus(currentStatus: LotStatus, nextStage: ProcessStage): boolean {
  if (!TERMINAL_STATUSES.has(currentStatus)) {
    return true;
  }

  return nextStage === 'SOLD';
}

export function computeProcessLoss(inputWeight: number, outputWeight: number): number {
  return inputWeight - outputWeight;
}

export function isValidProcessLoss(loss: number): boolean {
  return loss >= 0;
}