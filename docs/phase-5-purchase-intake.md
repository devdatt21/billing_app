# Phase 5 Purchase Intake Progress

Status: In Progress  
Owner: Backend + Full-stack  
Last Updated: 2026-03-16

## Completed in This Slice

### Validation

- Added purchase intake validation schema in `lib/validations.ts`:
  - `CreatePurchaseSchema`

### APIs

- Added purchase endpoints:
  - `GET/POST /api/purchases`
  - `GET /api/purchases/[id]`
  - `GET /api/purchases/next-number`

### Purchase Intake Flow

- `POST /api/purchases` now performs a single transaction for:
  - Purchase creation
  - Initial lot creation linked to the purchase (`sourceType = PURCHASE`)
  - Initial lot-cost ledger entry (`category = PURCHASE`)

### UI

- Added purchase intake screen: `app/purchases/page.tsx`
- Added module card from root module selector to `/purchases`.
- Purchase form includes:
  - Auto-generated purchase number + initial lot number
  - Supplier selection
  - Purchase date, reference, rough weight, amount, remarks
- Recent purchase list included for immediate traceability checks.
- Added purchase detail page at `/purchases/[id]` with linked lot and lot-cost ledger visibility.
- Added purchase list filters for supplier, date range, and text search.

### Access Control

- Added purchase write-role guard on `POST /api/purchases`:
  - Allowed: `ADMIN`, `ACCOUNTANT`
  - Denied: all other roles with `403`

### Tests

- Added API tests for `POST /api/purchases` in `app/api/purchases/route.test.ts` covering:
  - Purchase->lot->cost transaction integrity
  - Role-based write access denial
  - Edge-case validation checks (zero weight, negative amount, invalid supplier)
- Added duplicate-conflict API tests for unique number handling:
  - Duplicate `purchaseNo` -> `409`
  - Duplicate `lotNo` -> `409`
- Added middleware auth behavior tests in `middleware.test.ts` covering `/api/purchases`:
  - Missing bearer token -> `401`
  - Invalid token -> `401`
  - Valid token -> request headers forwarded (`x-user-id`, `x-user-email`, `x-user-role`)

## Next Phase 5 Steps

1. Proceed to Phase 6: lot detail enhancements, split flow, and genealogy view.

## Validation Notes

- Functional diagnostics for new files are expected to pass through TypeScript checks.
- Prisma client regeneration may require retry on Windows if query-engine file is locked by another process.
