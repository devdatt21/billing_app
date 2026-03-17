# Phase 6 Lot Detail, Split, and Genealogy Progress

Status: In Progress  
Owner: Backend + Full-stack  
Last Updated: 2026-03-16

## Objective

Make lot-level lineage explicit and reliable through:

- lot detail enrichment
- split workflow
- genealogy visualization

## Planned Slice 1

1. Add lot detail API (`GET /api/lots/[id]`) with parent/child lineage fields.
2. Add split API (`POST /api/lots/[id]/split`) with validation:
   - child-weight sum cannot exceed source current weight
   - child lots generated with lineage links
   - source lot residual weight updated atomically
3. Add lot detail UI shell (`/lots/[id]`) with:
   - parent lot
   - child lots
   - current vs initial weight
   - accumulated cost
4. Add split transaction tests:
   - happy path split
   - overweight split rejected
   - residual weight correctness

## Completed in This Slice

### APIs

- Added lot detail endpoint:
   - `GET /api/lots/[id]`
   - Includes source purchase, parent lot, child lots, split history, costs, and process history.
- Added lot split endpoint:
   - `POST /api/lots/[id]/split`
   - Enforces write roles (`ADMIN`, `ACCOUNTANT`)
   - Validates child weights > 0 and total <= source current weight
   - Executes source update + child creation + split event writes in one transaction
   - Closes source lot when residual reaches zero

### UI

- Added lot detail shell page:
   - `/lots/[id]`
   - Shows lineage (parent/child), weight state, stage/state, and split form
- Added drill-in links from purchase detail lot cards to lot detail page.

### Tests

- Added split route tests in `app/api/lots/[id]/split/route.test.ts`:
   - happy path split transaction
   - overweight split rejection
   - residual-zero source close behavior

## Validation

- Lot split test suite passed:
   - `npm test -- --runTestsByPath app/api/lots/[id]/split/route.test.ts`
- Existing purchase + middleware suites remain passing.

## Dependencies

- Phase 5 purchase->lot seed flow complete.
- Master data available for downstream process steps.

## Risks

- split math bugs can break genealogy and reconciliation.
- lineage link errors can make history non-auditable.

## Next Slice Targets

1. Add lot detail API tests for invalid/not-found/detail include shape. (Completed)
2. Add split-idempotency/duplicate-lotNo conflict tests (`409`) for split path. (Completed)
3. Add lineage visual polish in lot UI (timeline/tree style). (Completed)

## Completed in Slice 2

### Tests

- Added lot detail route tests in `app/api/lots/[id]/route.test.ts`:
   - invalid ID (`400`)
   - missing lot (`404`)
   - include shape validation for lineage/history-rich response (`200`)
- Extended split tests in `app/api/lots/[id]/split/route.test.ts`:
   - duplicate child lot number unique-conflict returns `409`

### UI Lineage Polish

- Enhanced `app/lots/[id]/page.tsx` with:
   - source purchase visibility
   - lineage tree block (parent/current/children links)
   - split timeline cards (incoming and outgoing split events)

### Validation

- `npm test -- --runTestsByPath app/api/lots/[id]/route.test.ts app/api/lots/[id]/split/route.test.ts` passed.
- `npm run build -- --no-lint` passed with type checks.

## Next Slice Candidates

1. Add split role-denial test (`403`) and invalid-source-weight test cases. (Completed)
2. Add lot-process timeline integration on lot page (process + split unified chronology). (Completed)
3. Add a lot list/index page with filters to improve navigation into genealogy views. (Completed)

## Completed in Slice 3

### Tests

- Extended split route tests in `app/api/lots/[id]/split/route.test.ts`:
  - role denial returns `403`
  - zero-available source weight returns `400`
- Added lot list route tests in `app/api/lots/route.test.ts`:
  - paginated list response
  - filter application for `q`, `status`, `stage`, `sourceType`

### APIs

- Added lot list endpoint:
  - `GET /api/lots`
  - supports filters: `q`, `status`, `stage`, `sourceType`
  - includes parent lot, source purchase, and child-lot count metadata

### UI and Navigation

- Added lot index page:
  - `/lots`
  - filter controls and drill-in links to `/lots/[id]`
- Added module-selector navigation card to `/lots` from home screen.

## Completed in Slice 4

### Tests

- Extended split route tests in `app/api/lots/[id]/split/route.test.ts`:
  - empty `children` array returns `400` with "At least one child lot is required" (total 7 tests in suite)

### UI

- Replaced "Split Timeline" section in `app/lots/[id]/page.tsx` with unified **Activity Timeline**:
  - Merges `processes`, `splitAsSource`, and `splitAsChild` events into one date-sorted chronological list
  - Added `LotProcess` interface and `TimelineEvent` discriminated union type
  - Three distinct event styles:
    - **Process** (green dot): process type, stage, vendor, input/output/loss weights, cost, status badge, remarks
    - **Split Out** (orange dot): child lot link, weight, residual weight
    - **Received From Split** (sky dot): source lot link, weight
  - Sorted newest-first; falls back to "No activity recorded yet." for empty lots
  - `/lots/[id]` bundle grew 3.58 kB → 4.09 kB

### Validation

- 3 test suites, 12 tests passing (added 1 new split test)
- `npm run build -- --no-lint` clean; 26 static pages, all routes confirmed
