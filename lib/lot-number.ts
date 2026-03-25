export function buildSplitLotNo(parentLotNo: string, suffix: number): string {
  return `${parentLotNo}-S${suffix}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSplitSuffix(parentLotNo: string, candidateLotNo: string): number | null {
  const pattern = new RegExp(`^${escapeRegExp(parentLotNo)}-S(\\d+)$`);
  const match = pattern.exec(candidateLotNo);
  if (!match) return null;

  const suffix = Number(match[1]);
  return Number.isInteger(suffix) && suffix > 0 ? suffix : null;
}

export function getNextSplitLotNo(parentLotNo: string, usedLotNos: Set<string>): string {
  let maxSuffix = 0;
  for (const lotNo of usedLotNos) {
    const suffix = parseSplitSuffix(parentLotNo, lotNo);
    if (suffix && suffix > maxSuffix) {
      maxSuffix = suffix;
    }
  }

  let nextSuffix = maxSuffix + 1;
  let candidate = buildSplitLotNo(parentLotNo, nextSuffix);

  while (usedLotNos.has(candidate)) {
    nextSuffix += 1;
    candidate = buildSplitLotNo(parentLotNo, nextSuffix);
  }

  return candidate;
}
