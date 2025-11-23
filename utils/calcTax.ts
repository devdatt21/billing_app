import Decimal from "decimal.js";

export type RoundingMode = "HALF_UP" | "TRUNCATE";

export function calcTaxAmounts(
  taxableValue: string | number,
  sgstPct: string | number,
  cgstPct: string | number,
  rounding: RoundingMode = "HALF_UP"
) {
  // Use Decimal for deterministic arithmetic
  const tv = new Decimal(taxableValue);
  const sRate = new Decimal(sgstPct).dividedBy(100);
  const cRate = new Decimal(cgstPct).dividedBy(100);

  const rawSgst = tv.mul(sRate);
  const rawCgst = tv.mul(cRate);

  const round = (d: Decimal) => {
    if (rounding === "HALF_UP") return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return d.toDecimalPlaces(2, Decimal.ROUND_DOWN);
  };

  const sgstAmount = round(rawSgst);
  const cgstAmount = round(rawCgst);

  const totalTax = sgstAmount.plus(cgstAmount);
  const totalBeforeRounding = tv.plus(totalTax);
  // rounding/adjustment to 2 decimals
  const totalAmount = round(totalBeforeRounding);

  // rounding difference kept as 'rounding' (positive or negative)
  const roundingDiff = totalAmount.minus(totalBeforeRounding);

  return {
    taxableValue: tv.toFixed(2),
    sgstAmount: sgstAmount.toFixed(2),
    cgstAmount: cgstAmount.toFixed(2),
    totalTax: totalTax.toFixed(2),
    rounding: roundingDiff.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
  };
}

/**
 * Calculate invoice totals from line items
 */
export function calcInvoiceTotals(
  lines: Array<{ qty: string | number; rate: string | number }>,
  sgstPct: string | number,
  cgstPct: string | number,
  roundingMode: RoundingMode = "HALF_UP"
) {
  // Calculate line amounts and subtotal
  const lineAmounts = lines.map(line => {
    // Handle empty or invalid values by defaulting to 0
    const qtyValue = line.qty === '' || line.qty === null || line.qty === undefined ? '0' : line.qty;
    const rateValue = line.rate === '' || line.rate === null || line.rate === undefined ? '0' : line.rate;
    
    const qty = new Decimal(qtyValue);
    const rate = new Decimal(rateValue);
    return qty.mul(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  });

  const subtotal = lineAmounts.reduce((sum, amt) => sum.plus(amt), new Decimal(0));

  // Calculate taxes
  const taxCalc = calcTaxAmounts(subtotal.toString(), sgstPct, cgstPct, roundingMode);

  return {
    subtotal: subtotal.toFixed(2),
    lineAmounts: lineAmounts.map(amt => amt.toFixed(2)),
    ...taxCalc,
  };
}
