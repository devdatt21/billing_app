# Phase 2 Billing Route Migration Validation

Status: In Progress  
Owner: Tech Lead + QA  
Last Updated: 2026-03-16

## Execution Status (2026-03-16)

- Automated tests: PASS (`npm test -- --runInBand`, 9/9 tests passed).
- Linting: FAIL due to existing repository-wide lint debt not introduced by Phase 2 migration.
- ESLint bootstrap: `.eslintrc.json` was created when lint was initialized.
- Hard migration: legacy billing UI routes removed; `/billing_app/*` is now the only billing UI namespace.

## Objective

Validate that billing workflows run correctly under `/billing_app` and legacy deep links remain safe through redirects.

## Route Parity Matrix

| Legacy Route | New Route | Migration Strategy | Status |
|---|---|---|---|
| `/invoices` | `/billing_app/invoices` | Hard migration (legacy route removed) | Implemented |
| `/invoices/create` | `/billing_app/invoices/create` | Hard migration (legacy route removed) | Implemented |
| `/invoices/:id` | `/billing_app/invoices/:id` | Hard migration (legacy route removed) | Implemented |
| `/companies` | `/billing_app/companies` | Hard migration (legacy route removed) | Implemented |
| `/purchase-invoices` | `/billing_app/purchase-invoices` | Hard migration (legacy route removed) | Implemented |
| `/` (old billing home) | `/` module selector + `/billing_app` module home | Root behavior changed per Phase 1 decision | Implemented |

## Implemented Changes Reference

- Root module selector: `app/page.tsx`
- Billing module home: `app/billing_app/page.tsx`
- Billing route mirrors:
  - `app/billing_app/invoices/page.tsx`
  - `app/billing_app/invoices/create/page.tsx`
  - `app/billing_app/invoices/[id]/page.tsx`
  - `app/billing_app/companies/page.tsx`
  - `app/billing_app/purchase-invoices/page.tsx`
- No legacy billing UI redirects (intentional hard migration): `next.config.js`

## Smoke Test Checklist

### Auth and Entry

- [ ] Unauthenticated visit to `/billing_app` is handled the same as existing protected pages.
- [ ] Authenticated visit to `/` shows module selector.
- [ ] Billing card from `/` opens `/billing_app`.

### Invoice Flow

- [ ] Open `/billing_app/invoices` list page.
- [ ] Navigate to create screen from list.
- [ ] Create invoice and verify redirect to `/billing_app/invoices/:id`.
- [ ] Use back navigation from details to list.
- [ ] Download PDF from detail page.

### Company Flow

- [ ] Open `/billing_app/companies`.
- [ ] Add company.
- [ ] Edit company.
- [ ] Delete company (if allowed by role).

### Purchase Invoice Flow

- [ ] Open `/billing_app/purchase-invoices`.
- [ ] Upload invoice file.
- [ ] Apply and clear filters.
- [ ] Delete uploaded invoice.

### Legacy Compatibility

- [ ] Confirm legacy billing UI routes return 404 (intentional hard migration).
- [ ] Verify no broken internal links remain in billing screens.

## Middleware and Auth Expectations

- Middleware currently allows page routes and enforces token auth on `/api/*` routes.
- Billing page-level auth remains client-side (unchanged behavior).
- No middleware rule changes are required for `/billing_app` path shape.

## Exit Criteria for Phase 2

- [ ] Billing workflow is fully usable under `/billing_app`.
- [ ] Legacy billing UI routes are removed and undocumented for users.
- [ ] No broken internal links in billing module.
- [ ] Smoke checklist completed and signed by QA.
