import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define interfaces
interface Company {
  id: number;
  name: string;
  gstin?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
}

interface InvoiceLine {
  id: number;
  description: string;
  hsn?: string | null;
  qty: string;
  unit?: string | null;
  rate: string;
  amount: string;
}

interface Invoice {
  id: number;
  invoiceNo: string;
  date: string;
  heading?: string | null;
  seller: Company;
  buyer: Company;
  deliveryNote?: string | null;
  terms?: string | null;
  lines: InvoiceLine[];
  subtotal: string;
  sgstRate: string;
  cgstRate: string;
  sgstAmount: string;
  cgstAmount: string;
  totalTax: string;
  rounding: string;
  totalAmount: string;
  amountInWords?: string | null;
}

// Styles matching the HTML invoice structure
const styles = StyleSheet.create({
  page: {
    padding: 15,
    fontSize: 9,
    fontFamily: 'Times-Roman',
    backgroundColor: '#ffffff',
  },
  
  // Main container
  container: {
    border: '1pt solid #000',
  },
  
  // Header
  header: {
    textAlign: 'center',
    fontFamily: 'Times-Bold',
    fontSize: 14,
    padding: 6,
    borderBottom: '1pt solid #000',
  },
  
  // Top section grid
  topSection: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
  },
  
  // Left column (seller + buyer)
  leftColumn: {
    width: '50%',
    borderRight: '1pt solid #000',
  },
  
  // Right column (invoice details)
  rightColumn: {
    width: '50%',
  },
  
  // Seller section
  sellerSection: {
    padding: 8,
    borderBottom: '1pt solid #000',
    minHeight: 100,
  },
  
  sellerName: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    marginBottom: 3,
  },
  
  addressLine: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  
  // Buyer section
  buyerSection: {
    padding: 8,
  },
  
  buyerLabel: {
    fontFamily: 'Times-Bold',
    fontSize: 8,
    marginBottom: 3,
  },
  
  buyerName: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    marginBottom: 2,
  },
  
  // Detail rows (right column)
  detailRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
    minHeight: 22,
  },
  
  detailCell: {
    width: '50%',
    padding: 5,
    paddingTop: 3,
    paddingBottom: 3,
    fontSize: 8,
    justifyContent: 'flex-start',
  },
  
  detailCellBorder: {
    borderRight: '1pt solid #000',
  },
  
  detailLabel: {
    fontFamily: 'Times-Bold',
    fontSize: 7,
    marginBottom: 1,
  },
  
  detailValue: {
    fontFamily: 'Times-Bold',
    fontSize: 8,
  },
  
  // Items table
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
    borderTop: '1pt solid #000',
    backgroundColor: '#ffffff',
    textAlign: 'center',
  },
  
  tableHeaderCell: {
    padding: 5,
    fontSize: 7,
    textAlign: 'center',
    fontFamily: 'Times-Roman',
  },
  
  tableRow: {
    flexDirection: 'row',
    minHeight: 28,
  },
  
  tableCell: {
    padding: 4,
    fontSize: 8,
  },
  
  tableCellBorder: {
    borderRight: '1pt solid #000',
  },
  
  // Column widths
  col1: { width: '5%' },
  col2: { width: '35%' },
  col3: { width: '12%' },
  col4: { width: '12%' },
  col5: { width: '10%' },
  col6: { width: '8%' },
  col7: { width: '18%' },
  
  // Tax labels in item description
  taxLabels: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    textAlign: 'right',
    fontSize: 8,
  },
  
  taxLabelRow: {
    marginTop: 2,
  },
  
  lessLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    fontSize: 8,
  },
  
  // Tax values in amount column
  taxValues: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    textAlign: 'right',
    fontSize: 8,
  },
  
  // Total row
  totalRow: {
    flexDirection: 'row',
    borderTop: '1pt solid #000',
    borderBottom: '1pt solid #000',
    backgroundColor: '#ffffff',
  },
  
  totalCell: {
    padding: 5,
    fontSize: 9,
    fontFamily: 'Times-Bold',
  },
  
  // Amount in words
  amountInWordsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 6,
    borderBottom: '1pt solid #000',
  },
  
  amountInWordsLabel: {
    fontSize: 7,
    marginBottom: 2,
  },
  
  amountInWordsText: {
    fontSize: 9,
    fontFamily: 'Times-Bold',
  },
  
  eoe: {
    fontSize: 7,
    alignSelf: 'flex-start',
  },
  
  // Tax analysis table
  taxTableHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
    backgroundColor: '#ffffff',
  },
  
  taxTableHeaderCell: {
    padding: 4,
    fontSize: 7,
    textAlign: 'center',
    borderRight: '1pt solid #000',
  },
  
  taxTableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
  },
  
  taxTableCell: {
    padding: 4,
    fontSize: 8,
    textAlign: 'center',
    borderRight: '1pt solid #000',
  },
  
  // Tax amount in words
  taxAmountWords: {
    padding: 6,
    borderBottom: '1pt solid #000',
    fontSize: 8,
  },
  
  // Footer section
  footerSection: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
  },
  
  declarationSection: {
    width: '50%',
    padding: 8,
    borderRight: '1pt solid #000',
  },
  
  bankDetailsSection: {
    width: '50%',
    padding: 8,
  },
  
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Times-Bold',
    textDecoration: 'underline',
    marginBottom: 4,
  },
  
  declarationText: {
    fontSize: 7,
    lineHeight: 1.4,
  },
  
  bankTitle: {
    fontSize: 8,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginBottom: 6,
  },
  
  bankDetailRow: {
    flexDirection: 'row',
    fontSize: 7,
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  
  bankDetailRight: {
    fontSize: 7,
    textAlign: 'right',
    marginTop: 3,
  },
  
  // Signature section
  signatureSection: {
    flexDirection: 'row',
    height: 80,
  },
  
  customerSignature: {
    width: '50%',
    padding: 8,
    borderRight: '1pt solid #000',
    borderBottom: '1pt solid #000',
  },
  
  authorizedSignature: {
    width: '50%',
    padding: 8,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottom: '1pt solid #000',
  },
  
  signatureLabel: {
    fontSize: 7,
  },
  
  companyLabel: {
    fontSize: 7,
    fontFamily: 'Times-Bold',
  },
  
  // Bottom footer
  bottomFooter: {
    textAlign: 'center',
    fontSize: 7,
    padding: 4,
    borderTop: '1pt solid #000',
  },
  
  // Utility styles
  bold: {
    fontFamily: 'Times-Bold',
  },
  
  textRight: {
    textAlign: 'right',
  },
  
  textCenter: {
    textAlign: 'center',
  },
});

// Helper function for Indian currency format
const formatIndianCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rs. 0.00';
  
  const [integer, decimal] = num.toFixed(2).split('.');
  const lastThree = integer.slice(-3);
  const otherNumbers = integer.slice(0, -3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + 
                    (otherNumbers ? ',' : '') + lastThree;
  return `Rs. ${formatted}.${decimal}`;
};

// Helper function to convert number to words (Indian system)
const numberToWords = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const [rupees, paise] = num.toFixed(2).split('.');
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convertToWords = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertToWords(n % 100) : '');
    if (n < 100000) return convertToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convertToWords(n % 1000) : '');
    if (n < 10000000) return convertToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convertToWords(n % 100000) : '');
    return convertToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convertToWords(n % 10000000) : '');
  };
  
  let words = 'INR ' + convertToWords(parseInt(rupees));
  if (parseInt(paise) > 0) {
    words += ' and ' + convertToWords(parseInt(paise)) + ' Paise';
  }
  return words + ' Only';
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

const InvoicePDF = ({ invoice }: { invoice: Invoice }) => {
  // Check if inter-state (IGST) or intra-state (CGST+SGST)
  // Trim state codes to handle whitespace issues
  const sellerStateCode = invoice.seller.stateCode?.trim();
  const buyerStateCode = invoice.buyer.stateCode?.trim();
  const isInterState = sellerStateCode && buyerStateCode && sellerStateCode !== buyerStateCode;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          
          {/* Header */}
          <Text style={styles.header}>{invoice.heading || 'Tax Invoice'}</Text>
          
          {/* Top Section Grid */}
          <View style={styles.topSection}>
            
            {/* Left Column: Seller & Buyer */}
            <View style={styles.leftColumn}>
              
              {/* Seller Details */}
              <View style={styles.sellerSection}>
                <Text style={styles.sellerName}>{invoice.seller.name}</Text>
                {invoice.seller.addressLine1 && (
                  <Text style={styles.addressLine}>{invoice.seller.addressLine1}</Text>
                )}
                {invoice.seller.addressLine2 && (
                  <Text style={styles.addressLine}>{invoice.seller.addressLine2}</Text>
                )}
                {invoice.seller.city && (
                  <Text style={styles.addressLine}>
                    {invoice.seller.city}-{invoice.seller.state}
                  </Text>
                )}
                <Text style={styles.addressLine}>
                  GSTIN/UIN: {invoice.seller.gstin || 'N/A'}
                </Text>
                <Text style={styles.addressLine}>
                  State Name : {invoice.seller.state}, Code : {invoice.seller.stateCode}
                </Text>
              </View>
              
              {/* Buyer Details */}
              <View style={styles.buyerSection}>
                <Text style={styles.buyerLabel}>Buyer (Bill to)</Text>
                <Text style={styles.buyerName}>{invoice.buyer.name}</Text>
                {invoice.buyer.addressLine1 && (
                  <Text style={styles.addressLine}>{invoice.buyer.addressLine1}</Text>
                )}
                {invoice.buyer.addressLine2 && (
                  <Text style={styles.addressLine}>{invoice.buyer.addressLine2}</Text>
                )}
                {invoice.buyer.city && (
                  <Text style={styles.addressLine}>
                    {invoice.buyer.city}, {invoice.buyer.state}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  <Text style={[styles.addressLine, { width: 60 }]}>GSTIN/UIN</Text>
                  <Text style={styles.addressLine}>: {invoice.buyer.gstin || 'N/A'}</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={[styles.addressLine, { width: 60 }]}>State Name</Text>
                  <Text style={styles.addressLine}>
                    : {invoice.buyer.state}, Code : {invoice.buyer.stateCode}
                  </Text>
                </View>
              </View>
              
            </View>
            
            {/* Right Column: Invoice Details */}
            <View style={styles.rightColumn}>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailCell, styles.detailCellBorder]}>
                  <Text style={styles.detailLabel}>Invoice No.</Text>
                  <Text style={styles.detailValue}>{invoice.invoiceNo}</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Dated</Text>
                  <Text style={styles.detailValue}>{formatDate(invoice.date)}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailCell, styles.detailCellBorder]}>
                  <Text style={styles.detailLabel}>Delivery Note</Text>
                  <Text style={styles.detailValue}>{invoice.deliveryNote || ''}</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Mode/Terms of Payment</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailCell, styles.detailCellBorder]}>
                  <Text style={styles.detailLabel}>Reference No. & Date.</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Other References</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailCell, styles.detailCellBorder]}>
                  <Text style={styles.detailLabel}>Buyer&apos;s Order No.</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Dated</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailCell, styles.detailCellBorder]}>
                  <Text style={styles.detailLabel}>Dispatch Doc No.</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Delivery Note Date</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailCell, styles.detailCellBorder]}>
                  <Text style={styles.detailLabel}>Dispatched through</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Destination</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Terms of Delivery</Text>
                  <Text style={styles.detailValue}>{invoice.terms || ''}</Text>
                </View>
              </View>
              
            </View>
            
          </View>
          
          {/* Items Table */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.tableCellBorder, styles.col1]}>Sl{'\n'}No.</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellBorder, styles.col2]}>Description of Goods</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellBorder, styles.col3]}>HSN/SAC</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellBorder, styles.col4]}>Quantity</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellBorder, styles.col5]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellBorder, styles.col6]}>per</Text>
            <Text style={[styles.tableHeaderCell, styles.col7]}>Amount</Text>
          </View>
          
          {/* Table Body - Line Items */}
          {invoice.lines.map((line, lineIndex) => (
            <View key={lineIndex} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellBorder, styles.col1, styles.textCenter]}>{lineIndex + 1}</Text>
              
              <View style={[styles.tableCell, styles.tableCellBorder, styles.col2]}>
                <Text style={styles.bold}>{line.description || 'Item'}</Text>
              </View>
              
              <Text style={[styles.tableCell, styles.tableCellBorder, styles.col3, styles.textCenter]}>
                {line.hsn || '-'}
              </Text>
              
              <View style={[styles.tableCell, styles.tableCellBorder, styles.col4, styles.textCenter]}>
                <Text style={styles.bold}>
                  {parseFloat(line.qty || '0').toFixed(3)} {line.unit || 'Pcs'}
                </Text>
              </View>
              
              <Text style={[styles.tableCell, styles.tableCellBorder, styles.col5, styles.textRight]}>
                {formatIndianCurrency(line.rate || '0')}
              </Text>
              
              <Text style={[styles.tableCell, styles.tableCellBorder, styles.col6, styles.textCenter]}>
                {line.unit || 'Pcs'}
              </Text>
              
              <View style={[styles.tableCell, styles.col7]}>
                <Text style={[styles.textRight, styles.bold]}>
                  {formatIndianCurrency(line.amount || '0')}
                </Text>
              </View>
            </View>
          ))}
          
          {/* Filler rows to maintain table fullness */}
          {Array.from({ length: Math.max(0, 6 - invoice.lines.length) }).map((_, i) => (
            <View key={`filler-${i}`} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellBorder, styles.col1]} />
              <View style={[styles.tableCell, styles.tableCellBorder, styles.col2]} />
              <Text style={[styles.tableCell, styles.tableCellBorder, styles.col3]} />
              <View style={[styles.tableCell, styles.tableCellBorder, styles.col4]} />
              <Text style={[styles.tableCell, styles.tableCellBorder, styles.col5]} />
              <Text style={[styles.tableCell, styles.tableCellBorder, styles.col6]} />
              <View style={[styles.tableCell, styles.col7]} />
            </View>
          ))}
          
          {/* Total Row */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalCell, styles.tableCellBorder, styles.col1]}></Text>
            <Text style={[styles.totalCell, styles.tableCellBorder, styles.col2, styles.textRight]}>Total</Text>
            <Text style={[styles.totalCell, styles.tableCellBorder, styles.col3]}></Text>
            <Text style={[styles.totalCell, styles.tableCellBorder, styles.col4, styles.textCenter]}>
              {invoice.lines.reduce((sum, line) => sum + parseFloat(line.qty), 0).toFixed(3)}{invoice.lines[0]?.unit || 'Pcs'}
            </Text>
            <Text style={[styles.totalCell, styles.tableCellBorder, styles.col5]}></Text>
            <Text style={[styles.totalCell, styles.tableCellBorder, styles.col6]}></Text>
            <Text style={[styles.totalCell, styles.col7, styles.textRight]}>
              {formatIndianCurrency(invoice.totalAmount)}
            </Text>
          </View>
          
          {/* Amount in Words */}
          <View style={styles.amountInWordsSection}>
            <View>
              <Text style={styles.amountInWordsLabel}>Amount Chargeable (in words)</Text>
              <Text style={styles.amountInWordsText}>
                {invoice.amountInWords || numberToWords(invoice.totalAmount)}
              </Text>
            </View>
            <Text style={styles.eoe}>E. & O.E</Text>
          </View>
          
          {/* Tax Analysis Table */}
          {isInterState ? (
            // IGST Table
            <>
              <View style={styles.taxTableHeader}>
                <Text style={[styles.taxTableHeaderCell, { width: '30%' }]}>HSN/SAC</Text>
                <Text style={[styles.taxTableHeaderCell, { width: '20%' }]}>Taxable Value</Text>
                <Text style={[styles.taxTableHeaderCell, { width: '15%' }]}>IGST{'\n'}Rate</Text>
                <Text style={[styles.taxTableHeaderCell, { width: '15%' }]}>IGST{'\n'}Amount</Text>
                <Text style={[styles.taxTableHeaderCell, { width: '20%', borderRight: 0 }]}>Total Tax{'\n'}Amount</Text>
              </View>
              
              <View style={styles.taxTableRow}>
                <Text style={[styles.taxTableCell, { width: '30%', textAlign: 'left', paddingLeft: 4 }]}>
                  {invoice.lines[0]?.hsn || '-'}
                </Text>
                <Text style={[styles.taxTableCell, { width: '20%', textAlign: 'right', paddingRight: 4 }]}>
                  {formatIndianCurrency(invoice.subtotal)}
                </Text>
                <Text style={[styles.taxTableCell, { width: '15%' }]}>
                  {(parseFloat(invoice.cgstRate) + parseFloat(invoice.sgstRate)).toFixed(2)}%
                </Text>
                <Text style={[styles.taxTableCell, { width: '15%', textAlign: 'right', paddingRight: 4 }]}>
                  {formatIndianCurrency(invoice.totalTax)}
                </Text>
                <Text style={[styles.taxTableCell, { width: '20%', textAlign: 'right', paddingRight: 4, borderRight: 0 }]}>
                  {formatIndianCurrency(invoice.totalTax)}
                </Text>
              </View>
              
              <View style={[styles.taxTableRow, { backgroundColor: '#f0f0f0' }]}>
                <Text style={[styles.taxTableCell, styles.bold, { width: '30%', textAlign: 'right', paddingRight: 4 }]}>Total</Text>
                <Text style={[styles.taxTableCell, styles.bold, { width: '20%', textAlign: 'right', paddingRight: 4 }]}>
                  {formatIndianCurrency(invoice.subtotal)}
                </Text>
                <Text style={[styles.taxTableCell, { width: '15%' }]}></Text>
                <Text style={[styles.taxTableCell, styles.bold, { width: '15%', textAlign: 'right', paddingRight: 4 }]}>
                  {formatIndianCurrency(invoice.totalTax)}
                </Text>
                <Text style={[styles.taxTableCell, styles.bold, { width: '20%', textAlign: 'right', paddingRight: 4, borderRight: 0 }]}>
                  {formatIndianCurrency(invoice.totalTax)}
                </Text>
              </View>
            </>
          ) : (
            // CGST + SGST Table
            <>
              {/* Header Row with merged structure */}
              <View style={{ flexDirection: 'row', borderBottom: '1pt solid #000', backgroundColor: '#ffffff' }}>
                <View style={{ width: '20%', borderRight: '1pt solid #000' }}>
                  <Text style={[styles.taxTableHeaderCell, { borderRight: 0, borderBottom: 0 }]}>HSN/SAC</Text>
                </View>
                <View style={{ width: '15%', borderRight: '1pt solid #000' }}>
                  <Text style={[styles.taxTableHeaderCell, { borderRight: 0, borderBottom: 0 }]}>Taxable{'\n'}Value</Text>
                </View>
                <View style={{ width: '22%', borderRight: '1pt solid #000' }}>
                  <Text style={[styles.taxTableHeaderCell, { borderRight: 0, borderBottom: '1pt solid #000', paddingBottom: 2 }]}>CGST</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={[styles.taxTableHeaderCell, { width: '50%', borderRight: '1pt solid #000', borderBottom: 0, paddingTop: 2 }]}>Rate</Text>
                    <Text style={[styles.taxTableHeaderCell, { width: '50%', borderRight: 0, borderBottom: 0, paddingTop: 2 }]}>Amount</Text>
                  </View>
                </View>
                <View style={{ width: '22%', borderRight: '1pt solid #000' }}>
                  <Text style={[styles.taxTableHeaderCell, { borderRight: 0, borderBottom: '1pt solid #000', paddingBottom: 2 }]}>SGST/UTGST</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={[styles.taxTableHeaderCell, { width: '50%', borderRight: '1pt solid #000', borderBottom: 0, paddingTop: 2 }]}>Rate</Text>
                    <Text style={[styles.taxTableHeaderCell, { width: '50%', borderRight: 0, borderBottom: 0, paddingTop: 2 }]}>Amount</Text>
                  </View>
                </View>
                <View style={{ width: '21%' }}>
                  <Text style={[styles.taxTableHeaderCell, { borderRight: 0, borderBottom: 0 }]}>Total{'\n'}Tax Amount</Text>
                </View>
              </View>
              
              <View style={styles.taxTableRow}>
                <Text style={[styles.taxTableCell, { width: '20%', textAlign: 'left', paddingLeft: 4 }]}>
                  {invoice.lines[0]?.hsn || '-'}
                </Text>
                <Text style={[styles.taxTableCell, { width: '15%', textAlign: 'right', paddingRight: 4 }]}>
                  {formatIndianCurrency(invoice.subtotal)}
                </Text>
                <Text style={[styles.taxTableCell, { width: '11%' }]}>{invoice.cgstRate}%</Text>
                <Text style={[styles.taxTableCell, { width: '11%', textAlign: 'right', paddingRight: 4 }]}>
                  {formatIndianCurrency(invoice.cgstAmount)}
                </Text>
                <Text style={[styles.taxTableCell, { width: '11%' }]}>{invoice.sgstRate}%</Text>
                <Text style={[styles.taxTableCell, { width: '11%', textAlign: 'right', paddingRight: 4 }]}>
                  {formatIndianCurrency(invoice.sgstAmount)}
                </Text>
                <Text style={[styles.taxTableCell, { width: '21%', textAlign: 'right', paddingRight: 4, borderRight: 0 }]}>
                  {formatIndianCurrency(invoice.totalTax)}
                </Text>
              </View>
              
              <View style={[styles.taxTableRow, { backgroundColor: '#f0f0f0' }]}>
                <Text style={[styles.taxTableCell, styles.bold, { width: '20%', textAlign: 'right', paddingRight: 4 }]}>Total</Text>
                <Text style={[styles.taxTableCell, styles.bold, { width: '15%', textAlign: 'right', paddingRight: 4 }]}>
                  {formatIndianCurrency(invoice.subtotal)}
                </Text>
                <Text style={[styles.taxTableCell, { width: '11%' }]}></Text>
                <Text style={[styles.taxTableCell, styles.bold, { width: '11%', textAlign: 'right', paddingRight: 4 }]}>
                  {formatIndianCurrency(invoice.cgstAmount)}
                </Text>
                <Text style={[styles.taxTableCell, { width: '11%' }]}></Text>
                <Text style={[styles.taxTableCell, styles.bold, { width: '11%', textAlign: 'right', paddingRight: 4 }]}>
                  {formatIndianCurrency(invoice.sgstAmount)}
                </Text>
                <Text style={[styles.taxTableCell, styles.bold, { width: '21%', textAlign: 'right', paddingRight: 4, borderRight: 0 }]}>
                  {formatIndianCurrency(invoice.totalTax)}
                </Text>
              </View>
            </>
          )}
          
          {/* Tax Amount in Words */}
          <View style={styles.taxAmountWords}>
            <Text>
              <Text style={{ fontSize: 7 }}>Tax Amount (in words) : </Text>
              <Text style={styles.bold}>{numberToWords(invoice.totalTax)}</Text>
            </Text>
          </View>
          
          {/* Footer Section: Declaration and Bank Details */}
          <View style={styles.footerSection}>
            
            {/* Declaration */}
            <View style={styles.declarationSection}>
              <Text style={styles.sectionTitle}>Declaration</Text>
              <Text style={styles.declarationText}>
                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
              </Text>
            </View>
            
            {/* Bank Details */}
            <View style={styles.bankDetailsSection}>
                  <Text style={styles.bankTitle}>{"Company's Bank Details"}</Text>
              {invoice.seller.bankName && (
                <>
                  <View style={styles.bankDetailRow}>
                    <Text style={{ fontSize: 7, width: 90 }}>{"A/c Holder's Name"}</Text>
                    <Text style={{ fontSize: 7, width: 10 }}>:</Text>
                    <Text style={{ fontSize: 7, flex: 1 }}>{invoice.seller.name}</Text>
                  </View>
                  <View style={styles.bankDetailRow}>
                    <Text style={{ fontSize: 7, width: 90 }}>Bank Name</Text>
                    <Text style={{ fontSize: 7, width: 10 }}>:</Text>
                    <Text style={{ fontSize: 7, flex: 1 }}>{invoice.seller.bankName}</Text>
                  </View>
                  <View style={styles.bankDetailRow}>
                    <Text style={{ fontSize: 7, width: 90 }}>A/c No.</Text>
                    <Text style={{ fontSize: 7, width: 10 }}>:</Text>
                    <Text style={{ fontSize: 7, flex: 1 }}>{invoice.seller.bankAccount}</Text>
                  </View>
                  <View style={styles.bankDetailRow}>
                    <Text style={{ fontSize: 7, width: 90 }}>Branch & IFS Code</Text>
                    <Text style={{ fontSize: 7, width: 10 }}>:</Text>
                    <Text style={{ fontSize: 7, flex: 1 }}>{invoice.seller.ifsc}</Text>
                  </View>
                </>
              )}
            </View>
            
          </View>
          
          {/* Signature Section */}
          <View style={styles.signatureSection}>
            
            {/* Customer Seal */}
            <View style={styles.customerSignature}>
              <Text style={styles.signatureLabel}>{"Customer's Seal and Signature"}</Text>
            </View>
            
            {/* Authorized Signatory */}
            <View style={styles.authorizedSignature}>
              <Text style={styles.companyLabel}>for {invoice.seller.name}</Text>
              <Text style={styles.signatureLabel}>Authorised Signatory</Text>
            </View>
            
          </View>
          
          {/* Bottom Footer */}
          <Text style={styles.bottomFooter}>This is a Computer Generated Invoice</Text>
          
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
