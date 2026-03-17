# Diamond ERP Delivery Execution Board

This board converts the strategy in [plan.md](./plan.md) into an implementation-ready format with owners, estimates, dependencies, acceptance gates, and risk controls.

## Delivery Model

- Cadence: 2-week sprints
- Baseline team: 1 full-stack engineer, 1 backend engineer, 1 QA engineer, 1 product owner
- Estimation scale: person-days (PD)
- Priority logic: protect invariants first (weight, genealogy, cost traceability), then operational workflows, then reporting and UX hardening

## RACI Key

- DRI: directly responsible individual/team
- A: accountable approver
- C: consulted
- I: informed

## Core v1 Scope (Recommended)

Core v1 includes Phases 1 to 8 from [plan.md](./plan.md). This is the minimum scope required to run trustworthy operations.

## v1.1 Scope (Recommended)

v1.1 includes Phases 9 to 15 from [plan.md](./plan.md), focused on profit visibility, vendor depth, and analytics.

## Continuous Tracks

Phases 16, 17, and 18 run continuously from Sprint 1 onward.

## Current Status Snapshot

- Domain Freeze (Phase 1): Completed on 2026-03-16, baseline in [phase-1-domain-freeze.md](./phase-1-domain-freeze.md).
- Phase 2 started (2026-03-16):
  - Billing routes added under `/billing_app`.
  - Billing navigation updated to namespaced paths.
  - Hard migration applied: legacy billing UI paths removed (`/invoices`, `/companies`, `/purchase-invoices`).
- Phase 3 started (2026-03-16):
  - Additive ERP models and enums added to Prisma schema.
  - Phase 3 schema RFC created at [phase-3-schema-rfc.md](./phase-3-schema-rfc.md).
  - Prisma schema validated via `prisma format` and `prisma generate`.
  - First Phase 3 migration created and applied: `20260316171222_add_erp_phase3_core`.
- Phase 4 started (2026-03-16):
  - Master-data validation + CRUD/search APIs added for suppliers, vendors, customers, and process types.
  - Master-data UI module added at `/masters` with CRUD pages for all four masters.
  - Shared selector components added for suppliers, vendors, customers, and process types.
  - Progress tracker created at [phase-4-master-data.md](./phase-4-master-data.md).
- Phase 5 started (2026-03-16):
  - Purchase intake APIs added:
    - `GET/POST /api/purchases`
    - `GET /api/purchases/[id]`
    - `GET /api/purchases/next-number`
  - Purchase intake UI added at `/purchases` with automatic purchase/lot numbering.
  - Purchase creation transaction now creates:
    - Purchase record
    - Initial lot linked to purchase
    - Initial purchase cost entry in lot cost ledger
  - Progress tracker created at [phase-5-purchase-intake.md](./phase-5-purchase-intake.md).
- Phase 6 completed (2026-03-16):
  - Lot detail API, split API with transaction, lots list API.
  - Lot detail UI with unified Activity Timeline (processes + splits).
  - Lots index page with filters; 21 tests across 5 suites.
- Phase 7 started (2026-03-16):
  - `POST /api/lots/[id]/processes`, `GET /api/lots/[id]/processes`, `PATCH /api/lots/[id]/processes/[processId]` added.
  - Process entry form added to lot detail UI.
  - 18 tests across 4 lot test suites passing.
  - Progress tracker at [phase-7-process-tracking.md](./phase-7-process-tracking.md).
- Active Implementation Focus: Phase 7 Slice 2 (PATCH tests, stage/vendor summary screens).

## Execution Board

| Workstream | Source Phase(s) | Key Deliverable | DRI | A | C | I | Estimate (PD) | Dependencies | Target Sprint |
|---|---|---|---|---|---|---|---:|---|---|
| Domain Freeze | 1 | Locked domain glossary, lot model, status enums, reconciliation rules | Product + Tech Lead | Product Owner | Ops Lead, Finance | QA | 5 | None | S1 |
| Billing Route Migration | 2 | Billing flows fully accessible under `/billing_app` + redirects strategy | Full-stack Eng | Tech Lead | QA, Product | Support | 6 | Domain freeze decision on homepage/module nav | S1 |
| ERP Prisma Redesign | 3 | New ERP schema + migration plan + indexes + enums | Backend Eng | Tech Lead | Product, QA | Ops | 8 | Domain freeze complete | S2 |
| Master Data | 4 | Supplier, vendor, customer, process-type CRUD + search | Full-stack Eng | Product Owner | QA | Ops | 7 | ERP schema merged | S2-S3 |
| Purchase + Lot Intake | 5 | Purchase entry, lot creation, purchase-to-lot traceability | Backend + Full-stack | Tech Lead | QA, Product | Finance | 8 | Master data (supplier), schema | S3 |
| Lot Detail + Split + Genealogy | 6 | Lot detail screen, split flow, genealogy view, split tests | Backend + Full-stack | Tech Lead | QA, Product | Ops | 10 | Purchase + lot intake | S4 |
| Process Tracking | 7 | Process event flow, lot stage timeline, transition guards | Full-stack Eng | Product Owner | QA, Ops | Finance | 8 | Lots, vendors, process types | S5 |
| Weight Ledger + Reconciliation | 8 | Ledger/events model, reconciliation reports, mismatch surfacing | Backend Eng | Tech Lead | QA, Finance | Product | 10 | Purchases, splits, process events, sales model stub | S5-S6 |
| Costing Engine | 9 | Lot cost accumulation, inheritance, rollup tests | Backend Eng | Tech Lead | Finance, QA | Product | 8 | Weight ledger stable | S7 |
| Vendor Job Management | 10 | Send/return workflows, overdue views, vendor WIP board | Full-stack Eng | Product Owner | QA, Ops | Finance | 6 | Vendors, process tracking | S7 |
| Inventory Layer | 11 | WIP + ready inventory lists, availability logic, totals | Full-stack Eng | Tech Lead | QA | Product | 6 | Ledger + process statuses | S8 |
| Sales | 12 | Sales entry, lot allocation, oversell prevention, realized profit basis | Backend + Full-stack | ProVduct Owner | QA, Finance | Ops | 8 | Inventory + costing | S8-S9 |
| Payments | 13 | Receivables/payables flows, due logic, party statements | Backend + Full-stack | Product Owner | QA, Finance | Ops | 7 | Purchases, vendor costs, sales | S9 |
| Dashboard | 14 | KPI widgets + exception panels + deep links | Full-stack Eng | Product Owner | QA, Finance | Ops | 5 | Inventory, sales, payments, reconciliation | S10 |
| Reports | 15 | Lot history, reconciliation, profit, vendor, inventory, dues reports | Backend + Full-stack | Tech Lead | QA, Finance | Product | 8 | Stable transactional modules | S10-S11 |
| UX + Performance | 16 (continuous) | Faster entry UX, keyboard support, list optimization | Full-stack Eng | Product Owner | QA, Ops | Support | 2 PD per sprint | Start S1 | Every sprint |
| Roles + Auditability | 17 (continuous) | Role matrix, sensitive action controls, audit trail | Backend Eng | Tech Lead | Security, QA | Product | 2 PD per sprint | Start S1 | Every sprint |
| Test + Seed + Trust Validation | 18 (continuous) | Realistic seeds, invariant tests, integration tests, failure-mode tests | QA + Backend | Tech Lead | Product | Ops | 3 PD per sprint | Start S1 | Every sprint |

## Phase Definition of Done Template

Use this checklist for every workstream before marking complete.

- Functional:
  - All committed user workflows execute end to end.
  - Validation and error handling match business rules.
- Data:
  - Prisma schema/migrations reviewed and reproducible.
  - Backfill/coexistence plan documented for affected data.
- Quality:
  - Unit tests added for business-critical branches.
  - Integration tests added for user-critical workflows.
- Security:
  - Authorization enforced for write paths.
  - Sensitive fields/events included in audit trail.
- Operability:
  - Logging added for critical failure and reconciliation paths.
  - Rollback strategy documented for release.
- Documentation:
  - API and behavior changes reflected in docs.
  - Release notes and known limitations captured.

## KPI Gate (Go/No-Go)

Do not exit Core v1 unless these metrics pass:

- Reconciliation mismatch rate <= 0.5% of lots in latest closed period
- Oversell incidents = 0 in automated integration tests
- Split integrity failures = 0 in test suite
- Critical workflow success rate >= 98% in QA regression run
- P95 list-page response time <= 1.5s for high-traffic screens
- Audit coverage = 100% for cost, weight, sale-close, and payment-write events

## Risk Register (Top Items)

| Risk | Impact | Likelihood | Mitigation | Owner |
|---|---|---|---|---|
| Ambiguous lot semantics | High | Medium | Freeze lot definition in S1 and block schema PRs until approved | Product Owner |
| Genealogy model rework | High | Medium | Implement split tests before broader process/sales flows | Tech Lead |
| Reconciliation trust gap | High | Medium | Introduce mismatch dashboard and release gate KPI | Backend Eng |
| Billing regression during migration | High | Low | Keep redirects and add smoke tests on old + new routes | Full-stack Eng |
| Cost allocation inconsistency | High | Medium | Standardize proportional allocation first, defer overrides | Finance + Backend |
| Role leakage in sensitive actions | High | Low | Add authorization integration tests to CI | Backend Eng |

## Sprint 1 Backlog (Actionable)

1. Finalize lot definition, status enums, and reconciliation vocabulary (working draft: [phase-1-domain-freeze.md](./phase-1-domain-freeze.md)).
2. Move billing routes/pages under `/billing_app` with working nav and breadcrumbs.
3. Decide root `/` behavior (ERP dashboard or module selector).
4. Add smoke tests for billing route parity.
5. Prepare schema redesign RFC with model ownership and genealogy approach.

## Sprint 2 Backlog (Actionable)

1. Merge initial ERP Prisma schema (non-destructive coexistence strategy).
2. Build master data CRUD for suppliers/vendors/customers/process types.
3. Add duplicate and required-field validation across masters.
4. Wire selection components for transactional forms.
5. Add schema migration rollback notes in release docs.

## Migration and Rollback Strategy (Minimum)

- Billing routes:
  - Keep old routes functional via redirect or mirror until two stable releases complete.
- Database:
  - Prefer additive migrations during Core v1.
  - Mark legacy billing models as deprecated only after parity validation.
- Release control:
  - Use feature flags for ERP screens touching weight/cost logic.
  - Block promotion if KPI Gate fails.

## Ownership Suggestions (If Not Assigned Yet)

- Product Owner: domain freeze decisions, scope control, acceptance sign-off
- Tech Lead: schema architecture, invariant enforcement, release gates
- Backend Engineer: ledger, reconciliation, costing, payments logic
- Full-stack Engineer: routes, forms, list screens, dashboards, UX speedups
- QA Engineer: invariant tests, integration coverage, regression packs
- Finance/Ops SMEs: validation of cost and process semantics

## Traceability to Plan

This board maps directly to [docs/plan.md](./plan.md) phases and preserves the original dependency order while adding execution controls.