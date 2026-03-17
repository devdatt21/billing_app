# Phase 7 Process Tracking Progress

Status: In Progress  
Owner: Backend + Full-stack  
Last Updated: 2026-03-16

## Objective

Track the operational journey of each lot through manufacturing stages via process events.

## Completed in Slice 1

### APIs

- `POST /api/lots/[id]/processes` — record a process event on a lot
  - Role guard: ADMIN or ACCOUNTANT only → 403 otherwise
  - Validation:
    - lot must not be `SOLD` or `CLOSED` → 422
    - lot must have `currentWeight > 0` → 422
    - `inputWeight` must be > 0 and ≤ `lot.currentWeight` → 400
    - `outputWeight` must be ≥ 0 and ≤ `inputWeight` → 400
    - `processTypeId` must reference an active ProcessType → 400
    - `vendorId` (optional) must reference an existing Vendor → 400
  - On success (transaction):
    - Creates `LotProcess` record with `status: IN_PROGRESS`, `lossWeight = inputWeight - outputWeight`
    - Updates `lot.currentWeight` → `outputWeight`
    - Updates `lot.currentStage` → `processType.stage`
    - Updates `lot.status` → `IN_PROCESS`
    - Adds `LotCost` entry if `costAmount > 0` (category mapped from stage)
  - Returns created `LotProcess` with `processType` and `vendor` includes, HTTP 201

- `GET /api/lots/[id]/processes` — list all process records for a lot (newest first)

- `PATCH /api/lots/[id]/processes/[processId]` — update process status
  - Body: `{ action: 'complete' | 'cancel', returnedAt?, remarks? }`
  - Cannot update already-completed or cancelled processes → 422
  - `complete`: sets `status: COMPLETED`, `returnedAt`, restores `lot.inventoryState: WIP`
  - `cancel`: sets `status: CANCELLED`

### UI

- Added **Record Process** form panel to `/lots/[id]` (second sidebar card below Split)
  - Process type search with inline dropdown (searches `/api/search/process-types`)
  - Vendor search with inline dropdown (searches `/api/search/vendors`, optional)
  - Input/Output weight fields with live loss calculation
  - Process date, cost amount, remarks
  - Clears and reloads lot on success
  - Submit disabled until a process type is selected
  - Already feeds into unified Activity Timeline (process events already rendered from `lot.processes`)

### Tests

- `app/api/lots/[id]/processes/route.test.ts` — 5 tests:
  - Happy path: creates process, updates lot stage, creates cost entry
  - 403 when role is USER
  - 422 when lot status is SOLD
  - 422 when lot current weight is zero
  - 400 when inputWeight exceeds lot current weight
  - 400 when outputWeight exceeds inputWeight

### Validation

- 4 test suites, 18 tests passing (5 new in this slice)
- `npm run build -- --no-lint` clean

## Next Slice Candidates

1. Complete/cancel process via PATCH `/api/lots/[id]/processes/[processId]` — tests.
2. Stage summary screen: `/masters/process-types/[id]` showing all lots currently at that stage.
3. Vendor job-work screen: `/masters/vendors/[id]` showing lots currently out with that vendor.
4. Process transition guardrail: prevent re-entry into a stage where the lot already has a COMPLETED process of the same type (optional strictness).
