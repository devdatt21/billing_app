# Diamond ERP Implementation Plan

This document expands the execution plan from [README.md](/d:/billing_app/README.md) into a detailed working plan. It is intended to reduce ambiguity during implementation and keep product, schema, API, and UI decisions aligned.

This plan assumes:

- the current codebase already contains billing and invoice functionality
- billing remains part of the product, but under the `/billing_app` module
- the new primary direction is a lightweight ERP for diamond manufacturers
- v1 should optimize for simplicity, speed, and correctness over breadth

## Planning Rules

These rules apply across all phases:

1. Weight integrity is the highest-priority system rule.
2. Lot genealogy must remain traceable across every split and process event.
3. Costs must be attributable to a lot or a lot-derived child record.
4. Existing billing behavior should not be broken while the ERP is being added.
5. We should avoid over-designing for enterprise complexity before core workflows are stable.
6. Every phase should end in something testable, not just partially modeled code.

## Phase 1: Product Foundation and Domain Freeze

### Objective

Define the v1 domain boundaries and core business rules clearly enough that schema and route work can proceed without repeated rework.

### Detailed Tasks

1. Confirm that the product is a diamond manufacturing ERP with billing as a submodule.
2. Lock the v1 operational scope around:
   - purchases
   - suppliers
   - lots
   - lot genealogy
   - processes
   - vendors
   - costs
   - inventory
   - customers
   - sales
   - payments
   - dashboard
   - reports
3. Define what a `lot` means in v1.
   - Decide whether a lot is only a packet-level entity.
   - Decide whether piece-level tracking is explicitly out of scope for v1.
4. Define standard lot statuses.
   - Example candidates: `PURCHASED`, `IN_PROCESS`, `AT_VENDOR`, `READY`, `SOLD`, `CLOSED`, `HOLD`
5. Define standard inventory states.
   - Example candidates: `ROUGH`, `WIP`, `READY_POLISHED`, `SOLD`, `LOSS`, `RETURNED`
6. Define standard process stages.
   - Cutting
   - Sarin / Measurement
   - Polishing
   - Ready Inventory
   - Sold
7. Define core reconciliation rules for:
   - weight
   - process loss
   - sale allocation
   - cost rollup
8. Define the naming convention for lots and derived child lots.
9. Decide which accounting and tax features remain billing-specific versus ERP-wide.
10. Update shared documentation if any rule changes from README assumptions.

### Deliverables

- a stable v1 scope
- agreed business vocabulary
- agreed status model
- agreed stage model
- agreed rules for lot lineage and reconciliation

### Dependencies

- none; this phase should happen before schema redesign

### Risks

- unclear meaning of a lot leads to incorrect schema choices
- missing status definitions cause inconsistent UI and reporting later

### Exit Criteria

- team can describe the v1 product in one consistent way
- core entities and statuses are documented
- no critical open ambiguity remains about lot-level tracking

## Phase 2: Billing Module Route Migration

### Objective

Preserve the current billing functionality while moving it into a dedicated module under `/billing_app`.

### Detailed Tasks

1. Audit all existing billing-related routes and pages.
   - invoices
   - invoice creation
   - invoice detail
   - companies
   - purchase invoices if they are still part of billing
2. Decide whether the route migration will be:
   - direct move
   - route duplication with shared components
   - redirect strategy from old paths to new paths
3. Move or mirror billing UI pages under:
   - `/billing_app`
   - `/billing_app/invoices`
   - `/billing_app/invoices/create`
   - `/billing_app/companies`
   - other existing billing screens as needed
4. Update internal navigation links to point to `/billing_app/...`.
5. Update breadcrumbs, page titles, and module labels to identify billing as one module of the ERP.
6. Confirm whether API routes remain unchanged or need billing-specific namespacing later.
7. Ensure shared components still work after the route move.
8. Verify authentication and middleware behavior for the new route structure.
9. Decide how the root `/` route should behave after the ERP direction change.
10. Decide whether the landing page should become:
   - ERP dashboard
   - module selector
   - temporary transitional homepage

### Deliverables

- all billing screens available under `/billing_app`
- consistent navigation for billing paths
- no broken links or route regressions

### Dependencies

- Phase 1 route and module positioning decisions

### Risks

- route move may break deep links or navigation
- middleware or auth assumptions may be tied to old routes

### Exit Criteria

- a user can complete the current billing workflow entirely under `/billing_app`
- old routes either continue to work or intentionally redirect

## Phase 3: ERP Domain Model and Prisma Schema Redesign

### Objective

Create a schema that reflects the diamond manufacturing domain rather than the old billing-first domain.

### Detailed Tasks

1. Review the current Prisma schema and mark models as:
   - retain
   - adapt
   - deprecate
   - replace
2. Map the tentative ERP tables into Prisma models.
3. Design the initial models for:
   - `Supplier`
   - `Purchase`
   - `Lot`
   - `LotSplit`
   - `ProcessType`
   - `LotProcess`
   - `Vendor`
   - `LotCost`
   - `Inventory` or inventory view strategy
   - `Customer`
   - `Sale`
   - `SaleItem`
   - `Payment`
4. Define relation ownership carefully.
   - purchase to supplier
   - purchase to created lots
   - lot to parent lot
   - lot split to source and child lots
   - lot process to lot, process type, vendor
   - lot cost to lot and source event
   - sale item to sale and lot
   - payment to party and reference transaction if applicable
5. Decide how to model genealogy.
   - direct `parentLotId` on `Lot`
   - separate split history table
   - both
6. Decide how to model merges.
   - support now
   - defer
   - support structurally but hide in UI
7. Decide whether `inventory` is:
   - computed from lot state and events
   - stored as a materialized snapshot table
   - hybrid
8. Introduce enums where possible for:
   - lot status
   - process status
   - payment direction
   - payment status
   - party type
9. Add audit fields to every critical table.
   - `createdAt`
   - `updatedAt`
   - `createdBy`
   - `updatedBy` if needed
10. Add indexes for query-heavy fields.
   - lot number
   - parent lot
   - status
   - process date
   - vendor
   - customer
   - supplier
11. Plan migration strategy from current data.
   - temporary coexistence
   - staged migration
   - ERP schema added alongside billing schema
12. Generate and review Prisma migrations.

### Deliverables

- a revised Prisma schema aligned to ERP requirements
- migration files
- clear separation between billing models and ERP models

### Dependencies

- Phase 1 domain decisions
- partial input from Phase 2 if route-level models affect module ownership

### Risks

- premature schema changes may create migration churn
- weak genealogy design will cause major rework later

### Exit Criteria

- schema supports purchases, lots, processes, costs, sales, and payments
- genealogy and reconciliation are representable in the model

## Phase 4: Master Data Setup

### Objective

Create the master records needed for operational transactions.

### Detailed Tasks

1. Build supplier master management.
   - create supplier
   - edit supplier
   - search supplier
   - list supplier dues basis if needed
2. Build vendor master management.
   - define vendor type
   - store service specialization
   - store contact and payment information
3. Build customer master management.
   - create and search customer records
   - support billing and ERP sales linkage where useful
4. Build process type management.
   - configurable stages
   - ordering / sequencing
   - active / inactive status
5. Define whether some of the existing `Company` model functionality can be temporarily reused.
6. Add validations for duplicate names, identifiers, and required fields.
7. Add list screens with fast search and filters.
8. Add selection components for use in transaction entry forms.

### Deliverables

- supplier management
- vendor management
- customer management
- process type master management

### Dependencies

- Phase 3 schema readiness

### Risks

- reusing `Company` incorrectly may create confusing mixed semantics

### Exit Criteria

- purchases, lot processes, and sales can all reference valid master records

## Phase 5: Purchase Intake and Rough Lot Creation

### Objective

Capture rough purchases and create the first traceable lots in the system.

### Detailed Tasks

1. Build purchase entry form.
   - supplier
   - purchase date
   - invoice / reference number
   - rough weight
   - purchase amount
   - optional remarks
2. Decide whether a purchase creates:
   - one lot by default
   - multiple lots
   - both workflows
3. Build lot creation from purchase.
   - generate lot number
   - assign initial weight
   - assign source supplier
   - assign initial location
   - assign initial status
4. Record purchase cost into lot cost basis.
5. Establish purchase-to-lot traceability.
6. Add validations to prevent zero or invalid weight entries.
7. Store original source information for later history and audit.
8. Build purchase list and detail views.
9. Add search by supplier, lot, and date.

### Deliverables

- purchase entry workflow
- initial lot creation workflow
- cost seeding from purchase

### Dependencies

- supplier master
- lot schema

### Risks

- ambiguous one-purchase-to-many-lot behavior may create inconsistent data capture

### Exit Criteria

- every lot can be traced back to an originating purchase or source entry

## Phase 6: Lot Detail, Splitting, and Genealogy

### Objective

Make the lot the center of the manufacturing system and preserve its lineage.

### Detailed Tasks

1. Build lot detail screen.
   - lot number
   - parent lot
   - child lots
   - current weight
   - status
   - current location
   - accumulated cost
   - current stage
   - recent activity
2. Build lot split workflow.
   - choose source lot
   - create one or more child lots
   - assign child weights
   - validate child total against source weight rules
3. Decide split accounting behavior.
   - source lot closes after split
   - source lot remains as container
   - source lot keeps residual balance
4. Allocate cost from parent lot to child lots.
   - proportional by weight
   - manual override if needed later
5. Record split events in a dedicated history table.
6. Build genealogy view.
   - parent to child chain
   - simple tree visualization
   - clickable navigation to related lots
7. Add protections against invalid genealogy loops.
8. If merges are in scope, define and implement merge rules carefully.
9. Add tests for split math, genealogy integrity, and cost allocation.

### Deliverables

- lot detail page
- lot split flow
- genealogy history
- visual lot tree

### Dependencies

- Phase 5 lot creation

### Risks

- lot split logic is one of the highest-risk parts of the system
- incorrect cost transfer breaks profit reporting later

### Exit Criteria

- users can see exactly where a lot came from and what it became

## Phase 7: Process Tracking and Manufacturing Events

### Objective

Track the operational journey of lots through manufacturing stages.

### Detailed Tasks

1. Build process entry workflow for a lot.
2. Allow selection of process type.
3. Record:
   - input weight
   - output weight
   - loss
   - vendor
   - process date
   - remarks
4. Define the calculation rule:
   - `loss = input - output` where applicable
5. Decide whether manual loss entry is allowed or computed only.
6. Update lot status and current location based on process events.
7. If vendor is external, mark lot as out for job work.
8. Track process history chronologically on the lot page.
9. Prevent logically invalid transitions.
   - sold lot cannot re-enter polishing
   - zero-weight lot cannot enter a new production stage
10. Add process summary screens by stage and vendor.
11. Add ability to mark process completion and return from vendor.

### Deliverables

- process recording flow
- lot stage timeline
- stage-based operational status tracking

### Dependencies

- process types
- vendors
- lots

### Risks

- process stages may be entered inconsistently without validation
- vendor-linked process events may overlap with separate vendor job tracking if not modeled carefully

### Exit Criteria

- every lot’s manufacturing journey is visible and auditable

## Phase 8: Weight Ledger and Reconciliation Engine

### Objective

Create the trust layer of the ERP by ensuring weight can always be reconciled.

### Detailed Tasks

1. Define ledger events that affect weight.
   - purchase intake
   - lot split
   - process output
   - process loss
   - sale
   - adjustment if allowed
2. Decide whether the weight ledger is:
   - explicit transaction table
   - computed from events
   - hybrid with snapshots
3. Implement reconciliation logic at lot and system levels.
4. Build rules ensuring:
   - purchased weight is traceable
   - split totals are valid
   - process loss is captured
   - sold weight reduces available inventory correctly
5. Build exception handling for mismatch cases.
6. Add reconciliation report views.
7. Surface mismatch warnings in the dashboard and lot pages.
8. Add immutable or guarded historical records where needed.
9. Write tests for edge cases:
   - repeated splits
   - split after process
   - sale after partial output
   - residual weight

### Deliverables

- weight ledger design and implementation
- reconciliation reports
- mismatch detection

### Dependencies

- purchases
- lots
- splits
- processes
- sales structure

### Risks

- this phase determines system credibility
- ad hoc adjustments can destroy auditability if not tightly controlled

### Exit Criteria

- system can answer “where is the weight?” for both a lot and the business overall

## Phase 9: Costing Engine and Profit Basis

### Objective

Track all costs against lots and prepare correct profit computation.

### Detailed Tasks

1. Define cost categories.
   - purchase
   - cutting
   - sarin
   - polishing
   - certification
   - misc
2. Build cost posting rules.
   - manual cost entry
   - automatic cost from purchase
   - automatic cost from vendor/process events where possible
3. Link costs to the relevant lot.
4. Support cost inheritance from parent to child lots.
5. Decide how to handle partial sale cost allocation.
6. Decide whether lot cost is stored as:
   - event history only
   - cached summary plus history
7. Show accumulated cost on lot detail and inventory screens.
8. Add auditability for cost changes.
9. Add tests for:
   - cost rollup after split
   - multiple vendor costs
   - misc cost additions
   - realized profit after sale

### Deliverables

- lot cost tracking
- cumulative cost summaries
- foundation for lot-level profit

### Dependencies

- purchases
- splits
- processes
- vendor relationships

### Risks

- weak cost allocation rules will make profit reports unreliable

### Exit Criteria

- every lot has a defensible accumulated cost

## Phase 10: Vendor Job Management

### Objective

Track outsourced work with enough clarity that operations can see what is with whom and for how long.

### Detailed Tasks

1. Decide whether vendor jobs are:
   - embedded in process records
   - represented by a separate job entity
   - both
2. Build send-to-vendor workflow.
   - vendor
   - lot
   - sent date
   - expected return date
   - quantity / pieces
   - costing basis
3. Build return-from-vendor workflow.
   - actual return date
   - output weight
   - remarks / quality notes
4. Show lots currently assigned to each vendor.
5. Show overdue jobs.
6. Link vendor job costs to lot costs.
7. Link vendor job states to lot current location and process stage.
8. Build vendor performance views if practical later.
9. Add filters for pending, overdue, returned, and closed jobs.

### Deliverables

- vendor job tracking
- vendor-wise WIP visibility
- overdue job visibility

### Dependencies

- vendors
- lots
- processes

### Risks

- duplicate modeling between process and job records can create conflicting states

### Exit Criteria

- users can instantly see which vendor currently holds each lot

## Phase 11: Inventory Layer

### Objective

Create a reliable operational inventory view for ready and in-process lots.

### Detailed Tasks

1. Define what appears in inventory.
   - only ready polished goods
   - all lots including WIP
   - filtered views for both
2. Implement inventory computation or storage strategy.
3. Build inventory listing screen.
4. Show:
   - lot number
   - weight
   - status
   - stage
   - location
   - cost
   - availability for sale
5. Add filters by:
   - status
   - vendor
   - location
   - date
   - ready for sale
6. Add quick search by lot number.
7. Distinguish between physical stock and reconciled book stock if needed.
8. Add summary totals:
   - total weight
   - total value
   - count of ready lots

### Deliverables

- inventory views
- inventory summaries
- sale-ready stock visibility

### Dependencies

- lots
- processes
- weight logic
- cost logic

### Risks

- inventory will be inconsistent if derived from unstable status transitions

### Exit Criteria

- users can identify available, in-process, and sold inventory clearly

## Phase 12: Sales and Revenue Realization

### Objective

Record sales against lots and compute realized profit.

### Detailed Tasks

1. Build sales header workflow.
   - customer
   - sale date
   - reference number
   - notes
2. Build sale item workflow.
   - select lot
   - select weight
   - enter price per carat
   - compute line total
3. Decide whether partial lot sales are allowed in v1.
4. Reduce available inventory on sale.
5. Record sold weight for reconciliation.
6. Compute realized revenue and profit.
7. Link sales to existing billing flows if invoice generation is needed later.
8. Add sales list and detail screens.
9. Add filters by customer, date, and lot.
10. Add tests for:
   - full sale
   - partial sale
   - oversell prevention
   - profit computation

### Deliverables

- sale entry flow
- sale item linkage to lots
- profit realization

### Dependencies

- customers
- inventory
- cost engine

### Risks

- partial sale logic can complicate cost and weight accounting

### Exit Criteria

- sold lots reduce inventory correctly and show correct profit basis

## Phase 13: Payments, Receivables, and Payables

### Objective

Track money movement across suppliers, vendors, and customers.

### Detailed Tasks

1. Define payment model scope.
   - incoming payments from customers
   - outgoing payments to suppliers
   - outgoing payments to vendors
2. Decide whether the payment table is generic or split by party type.
3. Build payment entry workflow.
   - party
   - payment direction
   - amount
   - date
   - reference
   - linked transaction if applicable
4. Build due calculation rules.
   - supplier due from purchases minus payments
   - vendor due from job costs minus payments
   - customer due from sales minus receipts
5. Build outstanding statements by party.
6. Add overdue and aging visibility if needed.
7. Surface due summaries in dashboard widgets.
8. Add validations against invalid over-allocation.
9. Decide whether billing invoice payments and ERP payments should share a model later.

### Deliverables

- payment capture
- receivable and payable tracking
- party-level due visibility

### Dependencies

- purchases
- vendor jobs / costs
- sales

### Risks

- a generic payment model may become too loose without reference rules

### Exit Criteria

- users can see who owes money and whom they owe at any time

## Phase 14: Dashboard and Operational Overview

### Objective

Give owners and operators a one-screen summary of the business state.

### Detailed Tasks

1. Define the dashboard audience.
   - owner
   - accountant
   - operator
2. Build the first dashboard with high-signal metrics only.
3. Add widgets for:
   - total rough purchased
   - total polished output
   - current inventory weight
   - inventory value
   - realized profit
   - lots in process
   - pending payments
   - customer receivables
   - supplier payables
4. Add stage-based lot counts.
5. Add vendor job pending and overdue counts.
6. Add a reconciliation warning panel.
7. Add quick navigation into exception lists.
8. Keep performance in mind; expensive aggregates may need caching later.

### Deliverables

- ERP dashboard
- exception visibility
- owner-friendly summary page

### Dependencies

- inventory
- sales
- payments
- reconciliation

### Risks

- dashboard numbers will create trust issues if underlying logic is incomplete

### Exit Criteria

- stakeholders can open one screen and understand operational and financial position quickly

## Phase 15: Reports

### Objective

Provide exportable and review-friendly views of the most important operational records.

### Detailed Tasks

1. Build lot history report.
   - purchase source
   - split history
   - process timeline
   - sale outcome
2. Build weight reconciliation report.
   - purchased
   - current inventory
   - sold
   - loss
   - exceptions
3. Build profit per lot report.
4. Build vendor job report.
5. Build inventory report.
6. Build payment due report.
7. Decide export formats.
   - screen only
   - CSV
   - PDF
8. Add filters and date ranges for all major reports.
9. Ensure report figures tie back to transactional screens.

### Deliverables

- v1 report suite
- operational traceability reports
- financial visibility reports

### Dependencies

- all transactional modules must be stable enough

### Risks

- reporting will expose logic inconsistencies quickly

### Exit Criteria

- reports match on-screen transactional truth and can support daily operations

## Phase 16: UX, Performance, and Entry Speed

### Objective

Make the ERP usable in real factory workflows where users perform many repetitive entries.

### Detailed Tasks

1. Review all core forms for excessive clicks.
2. Add keyboard-friendly navigation where practical.
3. Add fast lookup and typeahead for lots, suppliers, vendors, and customers.
4. Add sensible defaults and auto-filled data where safe.
5. Support batch or bulk entry for repetitive process events if needed.
6. Optimize list pages for quick scanning and filtering.
7. Keep mobile friendliness where useful, but optimize primarily for operational speed.
8. Reduce rendering and data-fetch overhead on heavily used screens.

### Deliverables

- faster entry flows
- reduced friction in repetitive operations

### Dependencies

- core modules must already exist

### Risks

- optimizing too early may create rework before workflows stabilize

### Exit Criteria

- key daily workflows can be completed quickly with minimal friction

## Phase 17: Roles, Permissions, and Auditability

### Objective

Protect sensitive operations while preserving traceability.

### Detailed Tasks

1. Define user roles.
   - admin
   - owner
   - accountant
   - operator
2. Map module permissions by role.
3. Limit who can:
   - change costs
   - edit historical weights
   - record payments
   - close sales
4. Add created-by tracking on critical transactions.
5. Add auditability for edits to lot, weight, cost, and payment records.
6. Decide whether historical edits are allowed or require reversal entries.
7. Review current auth flows and adjust if ERP roles need expansion.

### Deliverables

- role model
- access rules
- audit trail strategy

### Dependencies

- auth foundation already in the project
- critical ERP modules defined

### Risks

- unrestricted edits can destroy trust in weight and cost history

### Exit Criteria

- sensitive actions are controlled and traceable

## Phase 18: Testing, Seed Data, and Trust Validation

### Objective

Validate the ERP against realistic diamond manufacturing scenarios before relying on it.

### Detailed Tasks

1. Build realistic seed data for:
   - suppliers
   - purchases
   - lots
   - split chains
   - vendor jobs
   - process events
   - sales
   - payments
2. Add unit tests for:
   - lot split rules
   - genealogy integrity
   - weight reconciliation
   - cost accumulation
   - profit calculation
   - payment due calculation
3. Add integration tests for end-to-end workflows:
   - purchase to lot
   - lot to split
   - split to process
   - process to inventory
   - inventory to sale
   - sale to payment
4. Create test scenarios for failure modes:
   - mismatch in weights
   - overselling
   - invalid status transitions
   - duplicate child lots
5. Validate that dashboard and reports match transactional truth.

### Deliverables

- ERP seed data
- automated tests for core business logic
- confidence in the most important workflows

### Dependencies

- most core modules should be implemented

### Risks

- if tests are added too late, business rules may already be inconsistent

### Exit Criteria

- the most important business invariants are covered by automated checks

## Recommended Build Order

This is the implementation order we should follow unless a specific dependency forces adjustment:

1. Product foundation and domain freeze
2. Billing module route migration to `/billing_app`
3. ERP schema redesign
4. Master data setup
5. Purchase intake and rough lot creation
6. Lot detail, splitting, and genealogy
7. Process tracking
8. Weight ledger and reconciliation
9. Costing engine
10. Vendor job management
11. Inventory
12. Sales
13. Payments
14. Dashboard
15. Reports
16. UX and performance improvements
17. Permissions and auditability
18. Testing and seed data hardening

## Immediate Next Actions

The next practical implementation steps from this plan are:

1. migrate billing routes under `/billing_app`
2. redesign the Prisma schema for ERP entities
3. decide lot modeling rules before any lot tables are finalized
4. implement purchases and lot creation as the first ERP workflow

