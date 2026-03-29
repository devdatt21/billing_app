Project carbonshine_erp {
  database_type: "PostgreSQL"
  Note: "Generated from prisma/schema.prisma"
}

TableGroup Auth_Module [color: #4A90E2] {
  User
}

TableGroup Billing_Module [color: #2E8B57] {
  Company
  Invoice
  InvoiceLine
  Product
  PurchaseInvoice
}

TableGroup Master_Data [color: #A855F7] {
  Supplier
  Vendor
  Customer
  ProcessType
}

TableGroup Lot_Genealogy_Module [color: #F59E0B] {
  Purchase
  Lot
  LotSplit
  LotProcess
  LotCost
  InventorySnapshot
}

TableGroup Sales_And_Payments [color: #EF4444] {
  Sale
  SaleItem
  Payment
}

Enum LotStatus {
  PURCHASED
  IN_PROCESS
  AT_VENDOR
  READY
  SOLD
  CLOSED
  HOLD
}

Enum InventoryState {
  ROUGH
  WIP
  READY_POLISHED
  SOLD
  LOSS
  RETURNED
}

Enum ProcessStage {
  CUTTING
  SARIN_MEASUREMENT
  POLISHING
  READY_INVENTORY
  SOLD
}

Enum ProcessStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

Enum PurchaseStatus {
  DRAFT
  RECEIVED
  POSTED
  CANCELLED
}

Enum SaleStatus {
  DRAFT
  CONFIRMED
  PARTIAL_PAID
  PAID
  CANCELLED
}

Enum PaymentDirection {
  INCOMING
  OUTGOING
}

Enum PaymentStatus {
  PENDING
  CLEARED
  FAILED
  CANCELLED
}

Enum PartyType {
  SUPPLIER
  VENDOR
  CUSTOMER
}

Enum CostCategory {
  PURCHASE
  CUTTING
  SARIN
  POLISHING
  CERTIFICATION
  MISC
}

Enum LotSourceType {
  PURCHASE
  SPLIT
  ADJUSTMENT
}

Table User {
  id int [pk, increment]
  name varchar
  email varchar [unique]
  password varchar
  role varchar [default: 'USER', note: 'ADMIN, USER, ACCOUNTANT']
  emailVerified boolean [default: false]
  verificationToken varchar [unique]
  verificationTokenExpiry timestamp
  resetToken varchar [unique]
  resetTokenExpiry timestamp
  createdAt timestamp [default: `now()`]
  updatedAt timestamp
}

Table Company {
  id int [pk, increment]
  name varchar
  gstin varchar [unique]
  phone varchar
  email varchar
  addressLine1 varchar
  addressLine2 varchar
  city varchar
  state varchar
  stateCode varchar
  bankName varchar
  bankAccount varchar
  bankBranch varchar
  ifsc varchar
  logoUrl varchar
  isOrganization boolean [default: false, note: 'true = your company, false = customer']
  createdBy int
  isDeleted boolean [default: false]
  deletedAt timestamp
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (name)
    (gstin)
    (createdBy)
    (isDeleted)
  }
}

Table Invoice {
  id int [pk, increment]
  invoiceNo varchar [unique]
  date timestamp
  heading varchar [default: 'TAX INVOICE', note: 'TAX INVOICE, DELIVERY CHALLAN, or custom']
  sellerId int
  buyerId int
  referenceNo varchar
  otherReference varchar
  buyerOrderNo varchar
  buyerOrderDate timestamp
  dispatchDocNo varchar
  dispatchedThrough varchar
  destination varchar
  deliveryNote varchar
  deliveryNoteDate timestamp
  termsOfDelivery varchar
  modeOfPayment varchar
  terms varchar
  status varchar [default: 'DRAFT', note: 'DRAFT, FINAL, PAID, CANCELLED']
  subtotal decimal(18,2)
  sgstRate decimal(5,2)
  cgstRate decimal(5,2)
  igstRate decimal(5,2) [default: 0]
  sgstAmount decimal(18,2)
  cgstAmount decimal(18,2)
  igstAmount decimal(18,2) [default: 0]
  totalTax decimal(18,2)
  rounding decimal(18,2) [default: 0]
  totalAmount decimal(18,2)
  amountInWords varchar
  createdBy int
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (invoiceNo)
    (date)
    (status)
    (createdBy)
  }
}

Table InvoiceLine {
  id int [pk, increment]
  invoiceId int
  productId int
  description varchar
  hsn varchar
  qty decimal(18,3)
  unit varchar [default: 'Cts']
  rate decimal(18,2)
  amount decimal(18,2)
  taxPercent decimal(5,2) [default: 1.5]
  cgstAmount decimal(18,2) [default: 0]
  sgstAmount decimal(18,2) [default: 0]
  igstAmount decimal(18,2) [default: 0]

  indexes {
    (invoiceId)
    (productId)
  }
}

Table Product {
  id int [pk, increment]
  name varchar
  description varchar
  hsnCode varchar
  unit varchar [default: 'Cts']
  defaultRate decimal(12,2)
  taxRate decimal(5,2)
  isService boolean [default: false]
  isActive boolean [default: true]
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (name)
    (hsnCode)
  }
}

Table PurchaseInvoice {
  id int [pk, increment]
  invoiceNumber varchar
  vendorName varchar
  invoiceDate timestamp
  amount decimal(18,2)
  description varchar
  category varchar
  fileUrl varchar
  publicId varchar
  fileSize int
  fileName varchar
  uploadedBy int
  isDeleted boolean [default: false]
  deletedAt timestamp
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (uploadedBy)
    (invoiceDate)
    (vendorName)
    (category)
    (isDeleted)
  }
}

Table Supplier {
  id int [pk, increment]
  name varchar
  code varchar [unique]
  gstin varchar [unique]
  phone varchar
  email varchar
  addressLine1 varchar
  addressLine2 varchar
  city varchar
  state varchar
  stateCode varchar
  openingDue decimal(18,2) [default: 0]
  isActive boolean [default: true]
  createdBy int
  updatedBy int
  isDeleted boolean [default: false]
  deletedAt timestamp
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (name)
    (isActive)
    (isDeleted)
  }
}

Table Vendor {
  id int [pk, increment]
  name varchar
  code varchar [unique]
  vendorType varchar
  specialization varchar
  phone varchar
  email varchar
  addressLine1 varchar
  addressLine2 varchar
  city varchar
  state varchar
  stateCode varchar
  paymentTerms varchar
  isActive boolean [default: true]
  createdBy int
  updatedBy int
  isDeleted boolean [default: false]
  deletedAt timestamp
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (name)
    (isActive)
    (isDeleted)
  }
}

Table Customer {
  id int [pk, increment]
  name varchar
  code varchar [unique]
  gstin varchar [unique]
  phone varchar
  email varchar
  addressLine1 varchar
  addressLine2 varchar
  city varchar
  state varchar
  stateCode varchar
  openingDue decimal(18,2) [default: 0]
  isActive boolean [default: true]
  createdBy int
  updatedBy int
  isDeleted boolean [default: false]
  deletedAt timestamp
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (name)
    (isActive)
    (isDeleted)
  }
}

Table Purchase {
  id int [pk, increment]
  purchaseNo varchar [unique]
  supplierId int
  purchaseDate timestamp
  referenceNo varchar
  roughWeight decimal(18,3)
  totalAmount decimal(18,2)
  status PurchaseStatus [default: 'DRAFT']
  remarks varchar
  isDeleted boolean [default: false]
  deletedAt timestamp
  createdBy int
  updatedBy int
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (purchaseNo)
    (supplierId)
    (purchaseDate)
    (status)
    (isDeleted)
  }
}

Table Lot {
  id int [pk, increment]
  lotNo varchar [unique]
  sourceType LotSourceType [default: 'PURCHASE']
  sourcePurchaseId int
  parentLotId int
  initialWeight decimal(18,3)
  currentWeight decimal(18,3)
  status LotStatus [default: 'PURCHASED']
  inventoryState InventoryState [default: 'ROUGH']
  currentStage ProcessStage [default: 'CUTTING']
  currentLocation varchar
  accumulatedCost decimal(18,2) [default: 0]
  isSaleReady boolean [default: false]
  isDeleted boolean [default: false]
  deletedAt timestamp
  notes varchar
  createdBy int
  updatedBy int
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (lotNo)
    (parentLotId)
    (sourcePurchaseId)
    (status)
    (isDeleted)
    (inventoryState)
    (currentStage)
  }
}

Table LotSplit {
  id int [pk, increment]
  sourceLotId int
  childLotId int
  splitWeight decimal(18,3)
  residualAfterSplit decimal(18,3)
  splitDate timestamp [default: `now()`]
  remarks varchar
  isDeleted boolean [default: false]
  deletedAt timestamp
  createdBy int
  createdAt timestamp [default: `now()`]

  indexes {
    (sourceLotId)
    (childLotId)
    (splitDate)
    (isDeleted)
  }
}

Table ProcessType {
  id int [pk, increment]
  name varchar
  stage ProcessStage
  sequence int
  isActive boolean [default: true]
  isDeleted boolean [default: false]
  deletedAt timestamp
  description varchar
  color varchar [default: '#10b981']
  createdBy int
  updatedBy int
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (stage)
    (sequence)
    (isActive)
    (isDeleted)
    (createdBy)
    (createdBy, name) [unique]
  }
}

Table LotProcess {
  id int [pk, increment]
  lotId int
  processTypeId int
  vendorId int
  status ProcessStatus [default: 'PENDING']
  inputWeight decimal(18,3)
  outputWeight decimal(18,3)
  lossWeight decimal(18,3)
  processDate timestamp
  processStartDate timestamp
  processEndDate timestamp
  sentToVendorAt timestamp
  expectedReturnAt timestamp
  returnedAt timestamp
  costAmount decimal(18,2) [default: 0]
  remarks varchar
  isDeleted boolean [default: false]
  deletedAt timestamp
  createdBy int
  updatedBy int
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (lotId)
    (processTypeId)
    (vendorId)
    (status)
    (processDate)
    (isDeleted)
  }
}

Table LotCost {
  id int [pk, increment]
  lotId int
  category CostCategory
  sourceType varchar
  sourceRefId int
  amount decimal(18,2)
  costDate timestamp
  remarks varchar
  isDeleted boolean [default: false]
  deletedAt timestamp
  createdBy int
  createdAt timestamp [default: `now()`]

  indexes {
    (lotId)
    (category)
    (costDate)
    (isDeleted)
  }
}

Table InventorySnapshot {
  id int [pk, increment]
  snapshotDate timestamp
  lotId int
  status LotStatus
  inventoryState InventoryState
  stage ProcessStage
  location varchar
  weight decimal(18,3)
  accumulatedCost decimal(18,2)
  availableForSale boolean [default: false]
  createdAt timestamp [default: `now()`]

  indexes {
    (snapshotDate, lotId) [unique]
    (snapshotDate)
    (status)
    (inventoryState)
  }
}

Table Sale {
  id int [pk, increment]
  saleNo varchar [unique]
  customerId int
  saleDate timestamp
  status SaleStatus [default: 'DRAFT']
  totalWeight decimal(18,3)
  totalAmount decimal(18,2)
  notes varchar
  createdBy int
  updatedBy int
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (saleNo)
    (customerId)
    (saleDate)
    (status)
  }
}

Table SaleItem {
  id int [pk, increment]
  saleId int
  lotId int
  soldWeight decimal(18,3)
  ratePerCarat decimal(18,2)
  lineAmount decimal(18,2)
  createdAt timestamp [default: `now()`]

  indexes {
    (saleId)
    (lotId)
  }
}

Table Payment {
  id int [pk, increment]
  paymentNo varchar [unique]
  partyType PartyType
  partyRefId int
  direction PaymentDirection
  status PaymentStatus [default: 'PENDING']
  amount decimal(18,2)
  paymentDate timestamp
  referenceNo varchar
  linkedTransactionType varchar
  linkedTransactionId int
  notes varchar
  createdBy int
  updatedBy int
  createdAt timestamp [default: `now()`]
  updatedAt timestamp

  indexes {
    (partyType, partyRefId)
    (direction)
    (status)
    (paymentDate)
  }
}

Ref: Company.createdBy > User.id
Ref: Invoice.sellerId > Company.id
Ref: Invoice.buyerId > Company.id
Ref: Invoice.createdBy > User.id
Ref: InvoiceLine.invoiceId > Invoice.id
Ref: InvoiceLine.productId > Product.id
Ref: PurchaseInvoice.uploadedBy > User.id
Ref: Purchase.supplierId > Supplier.id
Ref: Lot.sourcePurchaseId > Purchase.id
Ref: Lot.parentLotId > Lot.id
Ref: LotSplit.sourceLotId > Lot.id
Ref: LotSplit.childLotId > Lot.id
Ref: LotProcess.lotId > Lot.id
Ref: LotProcess.processTypeId > ProcessType.id
Ref: LotProcess.vendorId > Vendor.id
Ref: LotCost.lotId > Lot.id
Ref: InventorySnapshot.lotId > Lot.id
Ref: Sale.customerId > Customer.id
Ref: SaleItem.saleId > Sale.id
Ref: SaleItem.lotId > Lot.id
