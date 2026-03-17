# Phase 3 ERP Prisma Schema RFC (Start)

Status: In Progress  
Owner: Tech Lead + Backend  
Last Updated: 2026-03-16

## Objective

Introduce additive ERP domain models in Prisma while preserving current billing behavior.

## Model Classification

### Retain (Billing Core)

- `User`
- `Company`
- `Invoice`
- `InvoiceLine`
- `Product`
- `PurchaseInvoice`

### Add (ERP Core)

- `Supplier`
- `Vendor`
- `Customer`
- `Purchase`
- `Lot`
- `LotSplit`
- `ProcessType`
- `LotProcess`
- `LotCost`
- `InventorySnapshot`
- `Sale`
- `SaleItem`
- `Payment`

### Add (Enums)

- `LotStatus`
- `InventoryState`
- `ProcessStage`
- `ProcessStatus`
- `PurchaseStatus`
- `SaleStatus`
- `PaymentDirection`
- `PaymentStatus`
- `PartyType`
- `CostCategory`
- `LotSourceType`

## Key Design Choices

1. Additive-only schema migration in this phase.
2. Keep billing schema untouched for compatibility.
3. Genealogy modeled both ways:
   - direct `parentLotId` on `Lot`
   - explicit `LotSplit` event history.
4. Split/merge risk is reduced by deferring merge workflow (Phase 1 decision).
5. Inventory starts with snapshot model (`InventorySnapshot`) to support reporting and dashboard use cases.

## Relation Ownership Highlights

- `Purchase` -> `Supplier`
- `Lot` -> optional `Purchase` source
- `Lot` -> optional parent lot
- `LotSplit` -> source lot and child lot
- `LotProcess` -> lot, process type, optional vendor
- `LotCost` -> lot
- `SaleItem` -> sale and lot
- `Payment` -> generic party reference via `PartyType + partyRefId`

## Index Strategy (Initial)

Added indexes for:

- lot number and lineage fields
- status and stage fields
- process date and vendor
- purchase and sale dates
- payment date and party reference

## Migration Strategy

1. Generate additive migration only (no drops).
2. Deploy migration with billing routes fully operational under `/billing_app`.
3. Keep ERP features behind implementation sequencing (Phase 4 onward).
4. Backfill scripts are deferred until ERP transaction APIs are introduced.

### Migration Executed

- Migration ID: `20260316171222_add_erp_phase3_core`
- SQL artifact: `prisma/migrations/20260316171222_add_erp_phase3_core/migration.sql`
- Status: Applied successfully via Prisma migrate dev.

## Open Items Before Phase 3 Exit

1. Decide if `InventorySnapshot` remains primary or hybrid with computed views.
2. Decide if `Payment.partyRefId` should be replaced with explicit nullable foreign keys.
3. Validate if `Customer/Supplier/Vendor` should be unified via a `Party` abstraction later.
4. Decide if `PurchaseInvoice` (billing) should map into `Purchase` (ERP) in later migration.

## Next Actions

1. Run `prisma format` and `prisma generate`.
2. Generate first Phase 3 migration.
3. Add seed scaffolding for process types and minimal master records.