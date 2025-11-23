import { calcTaxAmounts, calcInvoiceTotals } from './calcTax';

describe('calcTaxAmounts', () => {
  it('should calculate tax with HALF_UP rounding for sample invoice values', () => {
    // Example from the sample invoice: taxable = 389486.22, sgst = 0.75%, cgst = 0.75%
    const result = calcTaxAmounts('389486.22', '0.75', '0.75', 'HALF_UP');
    
    // 389486.22 * 0.0075 = 2921.14665 -> HALF_UP -> 2921.15
    expect(result.sgstAmount).toBe('2921.15');
    expect(result.cgstAmount).toBe('2921.15');
    expect(result.totalTax).toBe('5842.30');
    expect(result.taxableValue).toBe('389486.22');
    // 389486.22 + 5842.30 = 395328.52
    expect(result.totalAmount).toBe('395328.52');
    expect(result.rounding).toBe('0.00');
  });

  it('should calculate tax with TRUNCATE rounding', () => {
    const result = calcTaxAmounts('389486.22', '0.75', '0.75', 'TRUNCATE');
    
    // 389486.22 * 0.0075 = 2921.14665 -> TRUNCATE -> 2921.14
    expect(result.sgstAmount).toBe('2921.14');
    expect(result.cgstAmount).toBe('2921.14');
    expect(result.totalTax).toBe('5842.28');
    expect(result.totalAmount).toBe('395328.50');
  });

  it('should handle different tax rates', () => {
    const result = calcTaxAmounts('10000', '9', '9', 'HALF_UP');
    
    // 10000 * 0.09 = 900
    expect(result.sgstAmount).toBe('900.00');
    expect(result.cgstAmount).toBe('900.00');
    expect(result.totalTax).toBe('1800.00');
    expect(result.totalAmount).toBe('11800.00');
  });

  it('should handle edge case with small amounts', () => {
    const result = calcTaxAmounts('100.50', '2.5', '2.5', 'HALF_UP');
    
    // 100.50 * 0.025 = 2.5125 -> HALF_UP -> 2.51
    expect(result.sgstAmount).toBe('2.51');
    expect(result.cgstAmount).toBe('2.51');
    expect(result.totalTax).toBe('5.02');
    expect(result.totalAmount).toBe('105.52');
  });

  it('should handle rounding differences correctly', () => {
    // Test case where rounding creates a difference
    const result = calcTaxAmounts('999.99', '1.5', '1.5', 'HALF_UP');
    
    // 999.99 * 0.015 = 14.99985 -> HALF_UP -> 15.00
    expect(result.sgstAmount).toBe('15.00');
    expect(result.cgstAmount).toBe('15.00');
    expect(result.totalTax).toBe('30.00');
    // 999.99 + 30.00 = 1029.99
    expect(result.totalAmount).toBe('1029.99');
  });

  it('should work with string inputs', () => {
    const result = calcTaxAmounts('5000.00', '6', '6', 'HALF_UP');
    
    expect(result.sgstAmount).toBe('300.00');
    expect(result.cgstAmount).toBe('300.00');
    expect(result.totalTax).toBe('600.00');
    expect(result.totalAmount).toBe('5600.00');
  });
});

describe('calcInvoiceTotals', () => {
  it('should calculate totals for multiple line items', () => {
    const lines = [
      { qty: '106.417', rate: '3660.00' },
    ];
    
    const result = calcInvoiceTotals(lines, '0.75', '0.75', 'HALF_UP');
    
    // 106.417 * 3660 = 389486.22
    expect(result.subtotal).toBe('389486.22');
    expect(result.sgstAmount).toBe('2921.15');
    expect(result.cgstAmount).toBe('2921.15');
    expect(result.totalAmount).toBe('395328.52');
  });

  it('should handle multiple line items', () => {
    const lines = [
      { qty: '10', rate: '100.00' },
      { qty: '5', rate: '200.00' },
      { qty: '2.5', rate: '150.00' },
    ];
    
    const result = calcInvoiceTotals(lines, '9', '9', 'HALF_UP');
    
    // 10*100 + 5*200 + 2.5*150 = 1000 + 1000 + 375 = 2375
    expect(result.subtotal).toBe('2375.00');
    expect(result.lineAmounts).toEqual(['1000.00', '1000.00', '375.00']);
    // 2375 * 0.09 = 213.75
    expect(result.sgstAmount).toBe('213.75');
    expect(result.cgstAmount).toBe('213.75');
    expect(result.totalTax).toBe('427.50');
    expect(result.totalAmount).toBe('2802.50');
  });

  it('should handle decimal quantities and rates', () => {
    const lines = [
      { qty: '12.345', rate: '67.89' },
    ];
    
    const result = calcInvoiceTotals(lines, '2.5', '2.5', 'HALF_UP');
    
    // 12.345 * 67.89 = 838.14405 -> 838.14
    expect(result.subtotal).toBe('838.14');
    expect(result.lineAmounts).toEqual(['838.14']);
  });
});
