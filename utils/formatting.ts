import { toWords } from 'number-to-words';

/**
 * Convert a number to words for amount display (Indian system)
 * Example: 395328.52 -> "INR Three Lakh Ninety Five Thousand Three Hundred Twenty Eight and Fifty Two Paise Only"
 */
export function numberToWords(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) return 'INR Zero Only';
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convertToWords = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertToWords(n % 100) : '');
    if (n < 100000) return convertToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convertToWords(n % 1000) : '');
    if (n < 10000000) return convertToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convertToWords(n % 100000) : '');
    return convertToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convertToWords(n % 10000000) : '');
  };
  
  let result = 'INR ';
  
  if (rupees > 0) {
    result += convertToWords(rupees);
  } else {
    result += 'Zero';
  }
  
  if (paise > 0) {
    result += ' and ' + convertToWords(paise) + ' Paise';
  }
  
  result += ' Only';
  
  return result;
}

/**
 * Format number as Indian currency
 * Example: 389486.22 -> "₹3,89,486.22"
 */
export function formatIndianCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) return '₹0.00';
  
  const [integer, decimal] = num.toFixed(2).split('.');
  
  // Indian number formatting: last 3 digits, then groups of 2
  const lastThree = integer.slice(-3);
  const otherNumbers = integer.slice(0, -3);
  
  let formatted = '';
  if (otherNumbers) {
    formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    formatted = lastThree;
  }
  
  return `₹${formatted}.${decimal}`;
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
