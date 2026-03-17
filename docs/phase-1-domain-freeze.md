# Phase 1 Domain Freeze (Approved Baseline)

Status: Approved  
Owner: Product Owner + Tech Lead  
Last Updated: 2026-03-16

## Goal

Lock v1 domain boundaries and business rules so schema/API/UI work can proceed without rework.

## v1 Product Positioning

- Product = Diamond Manufacturing ERP.
- Billing remains supported as a module under `/billing_app`.
- v1 priority order: correctness > traceability > speed > breadth.

## Scope Freeze (v1)

Included:

- suppliers
- purchases
- lots
- lot splits and genealogy
- process tracking
- vendors
- lot-level costs
- inventory visibility
- customers
- sales
- payments
- dashboard
- reports

Explicitly out of scope for v1:

- piece-level stone tracking
- advanced merge workflows in UI
- complex accounting across multiple legal entities
- broad enterprise customization

## Lot Definition (v1)

- A lot is the smallest inventory-tracked manufacturing packet for v1.
- A lot must always have one source path:
  - originating purchase, or
  - parent lot via split.
- Piece-level mapping is deferred to a future phase.

## Standard Enums (Approved)

### LotStatus

- PURCHASED
- IN_PROCESS
- AT_VENDOR
- READY
- SOLD
- CLOSED
- HOLD

### InventoryState

- ROUGH
- WIP
- READY_POLISHED
- SOLD
- LOSS
- RETURNED

### ProcessStage

- CUTTING
- SARIN_MEASUREMENT
- POLISHING
- READY_INVENTORY
- SOLD

## Core Invariants (Must Never Break)

1. Weight integrity is mandatory.
2. Lot genealogy is fully traceable across all splits.
3. Costs are attributable to a lot or child lot.
4. Sold quantity cannot exceed available quantity.
5. Invalid lifecycle transitions are blocked.

## Reconciliation Rules (v1)

### Weight

- For split events: sum(child weights) + residual = source weight.
- For process events: loss = input - output.
- Sold weight reduces sellable availability.

### Process Loss

- Loss is captured as first-class data on process events.
- Negative loss is invalid.

### Sale Allocation

- Full and partial sale flows are allowed only if available weight exists.
- Oversell is blocked at validation and persistence layers.

### Cost Rollup

- Purchase cost seeds initial lot cost.
- Split cost allocation is proportional by weight for v1.
- Process/vendor/misc costs accumulate on active lot lineage.

## Lot Naming Convention (Approved)

- Parent lot format: `LOT-YYYY-####`
- Child lot format: `<PARENT>-S<SEQ>`
- Examples:
  - `LOT-2026-0007`
  - `LOT-2026-0007-S1`
  - `LOT-2026-0007-S2`

## Accounting and Tax Boundary

- Billing tax/invoice specifics remain in billing module.
- ERP v1 stores operational sales/purchase/payment truth needed for inventory and due calculations.
- Cross-module financial consolidation is deferred.

## Decision Log

| Decision | Status | Owner | Notes |
|---|---|---|---|
| Lot is packet-level entity in v1 | Approved | Product Owner | Piece-level deferred |
| Split cost allocation by proportional weight | Approved | Finance + Tech Lead | Override deferred |
| Use explicit split history + lot parent link | Approved | Tech Lead | Helps genealogy queries |
| Keep billing tax features module-specific | Approved | Product Owner | Avoid mixed semantics |
| Support partial sales in v1 | Approved | Product + Finance | Needed for realistic flows |
| Split behavior allows residual source lot | Approved | Product + Tech Lead | Source closes only when residual reaches zero |
| Merge workflow deferred from Core v1 | Approved | Tech Lead | No merge UI in v1; revisit post-stability |
| Root `/` becomes module selector during transition | Approved | Product Owner | ERP-first navigation with billing entry |

## Sign-off Checklist

- [x] Team aligns on one consistent v1 product statement.
- [x] Scope in/out finalized.
- [x] Lot definition finalized.
- [x] Enum values frozen.
- [x] Reconciliation rules approved by Tech + Finance.
- [x] Naming convention approved.
- [x] Accounting boundary approved.
- [x] Open pending decisions resolved.

## Closed Questions and Final Decisions

1. Partial sale is enabled in Core v1 with strict oversell protection.
2. Residual source lot is allowed after split; source closes only at zero residual weight.
3. Merge workflow is deferred from Core v1 to reduce model complexity.
4. Root `/` is a module selector during migration, with clear ERP and Billing entry points.

## Product Owner and Tech Lead Notes

- We are optimizing for trust and speed to value.
- Any change that weakens weight integrity or lineage traceability is non-negotiable and blocked.
- Schema work can now proceed using this document as the authoritative source for Phase 3 modeling.

## Exit Criteria

Phase 1 is complete when all checklist items are checked and pending decisions are moved to approved/rejected.

Exit Criteria Status: Complete (2026-03-16)
