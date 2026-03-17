# Diamond ERP

This project is no longer just a billing application. It is now evolving into a lightweight ERP for diamond manufacturers, with the existing billing features preserved and moved under the `/billing_app` route.

The goal is not to build a huge ERP upfront. The goal is to solve a small set of painful daily factory problems extremely well:

1. Lot tracking confusion
2. Weight mismatch
3. Cost and profit calculation
4. Vendor job tracking
5. Payment dues

This README is the working source of truth for the project direction. Future features and schema changes should be aligned with this document unless we explicitly revise it.

## Product Direction

We are building a lightweight ERP for diamond manufacturers in markets like Surat, Bhavnagar, and Mumbai.

The product should stay:

- simple enough that users do not return to Excel
- fast enough for hundreds of entries per day
- accurate enough that owners trust the weight and cost numbers every time

## Current Transition

The codebase already contains billing and invoice functionality. That functionality should continue to exist, but it should now live under the `/billing_app` route namespace.

Current direction:

- existing billing app features are treated as one module inside the larger ERP
- diamond manufacturing workflows become the primary product direction
- README, schema, routes, APIs, and UI should gradually be updated to reflect this change

## Route Strategy

The billing module should be migrated so that its screens and related flows start with:

```txt
/billing_app
```

Examples:

```txt
/billing_app
/billing_app/invoices
/billing_app/invoices/create
/billing_app/companies
```

This keeps the old billing capability available while making room for ERP modules such as purchases, lots, processes, inventory, vendors, sales, and payments.

## Core ERP Scope

The minimum ERP that can survive in the market should support these areas:

1. Lot creation
2. Lot splitting
3. Process tracking
4. Weight ledger
5. Cost tracking
6. Vendor job tracking
7. Inventory
8. Selling
9. Dashboard
10. Reports

## Business Workflows We Must Support

### 1. Lot Tracking

Every manufacturing flow revolves around lots or packets.

The system must support:

- create lot
- split lot
- merge lots
- track parent-child lot genealogy
- track current weight
- track current location
- track current status

Example:

```txt
Lot L1 (10 ct)
|- L1A (3 ct)
|- L1B (2 ct)
`- L1C (1 ct)
```

### 2. Process Tracking

Minimum stages for now:

- Cutting
- Sarin / Measurement
- Polishing
- Ready Inventory
- Sold

Each process event should record:

- input weight
- output weight
- loss
- cost
- vendor
- date

### 3. Weight Ledger

The system must always answer:

```txt
Where is the weight?
```

At a business level, the reconciliation rule is:

```txt
Total purchased weight
= current inventory
+ sold weight
+ waste / loss
```

If this does not reconcile, trust in the software drops immediately.

### 4. Cost Tracking

Each lot should accumulate costs over time, including:

- purchase cost
- cutting cost
- sarin cost
- polishing cost
- misc cost

When a lot or its child lots are sold, revenue and profit should be computed automatically.

### 5. Vendor Job Management

We need to track outsourced work clearly:

- which vendor has which lot
- when the lot was sent
- expected return date
- actual return date
- piece count
- cost basis such as per piece or per carat

### 6. Inventory

The ERP should show:

- ready lots
- total weight
- location
- valuation / cost
- sale readiness

### 7. Sales

Sales should record:

- customer
- lot
- weight
- price per carat
- total amount
- date

Profit should be automatic from accumulated cost versus sale value.

### 8. Dashboard

Owners should get a one-screen summary of:

- total rough purchased
- total polished output
- inventory value
- total profit
- lots in process
- pending dues

### 9. Payments and Dues

We need visibility into:

- supplier dues
- vendor dues
- customer receivables

### 10. Reports

Minimum report set:

- lot history report
- weight reconciliation report
- profit per lot
- vendor job report
- inventory report

## Differentiator

One feature we should treat as strategically important:

```txt
Lot genealogy visualizer
```

Example:

```txt
L1
|- L1A
|  |- L1A1
|  `- L1A2
`- L1B
```

This should make it easy to see where every finished piece or child lot came from.

## Tentative Database Direction

These are the tables currently proposed for the ERP side:

- `purchases`
- `suppliers`
- `lots`
- `lot_splits`
- `process_types`
- `lot_processes`
- `vendors`
- `lot_costs`
- `inventory`
- `customers`
- `sales`
- `sale_items`
- `payments`

This list is tentative and can be modified as we refine the schema.

## Suggested Meaning of the Tentative Tables

### Master and party tables

- `suppliers`: rough diamond suppliers and purchase parties
- `vendors`: job-work vendors such as cutting, sarin, polishing, labs
- `customers`: buyers of polished diamonds or lots
- `process_types`: configurable manufacturing stages

### Transaction and manufacturing tables

- `purchases`: purchase entries for incoming rough lots
- `lots`: core lot master with weight, status, location, parent linkage if needed
- `lot_splits`: history of split and merge operations
- `lot_processes`: stage-level movement and production events
- `lot_costs`: accumulated cost entries against lots
- `inventory`: ready or in-process inventory snapshots / balances
- `sales`: sales header
- `sale_items`: sale line items linked to lots
- `payments`: money movement for suppliers, vendors, and customers

## Current Schema Status

The current Prisma schema still reflects the old billing-first application and includes models like:

- `Company`
- `Invoice`
- `InvoiceLine`
- `Product`
- `PurchaseInvoice`
- `User`

This is acceptable as an intermediate state, but it is not the target ERP schema.

## Implementation Principles

While building features, we should keep following these rules:

1. Weight accuracy is more important than UI polish.
2. Lot genealogy must never be lost.
3. Cost accumulation should be automatic wherever possible.
4. Billing should remain usable while the ERP grows around it.
5. We should prefer simple workflows over heavy enterprise complexity.
6. Bulk entry, speed, and keyboard-friendly flows will matter a lot.

## Near-Term Execution Plan

The current sequence of work should be:

1. Move or mirror the existing billing flows under `/billing_app`.
2. Redefine navigation so billing becomes one ERP module.
3. Refactor the Prisma schema toward the diamond ERP domain.
4. Build the lot, process, weight, and cost foundation first.
5. Add inventory, sales, payments, dashboard, and reporting on top of that foundation.

## What This README Is For

This file is the shared alignment document for the project. While implementing features, route changes, schema migrations, or UI changes, we should keep checking against this README so the product direction stays consistent.

## Open Decisions To Resolve Next

These are still not finalized and will need discussion:

- whether `inventory` should be a computed view or a physical table
- whether lot genealogy should live directly in `lots` or be fully event-driven
- whether merges should be supported in v1 or only splits
- whether sales happen at lot level, piece level, or both
- whether payments should be generic or separated by party type

