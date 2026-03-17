# Access Control & Data Filtering

## Overview
The application currently uses authentication-only access control for business operations.
Role-based and ownership-based restrictions are intentionally disabled for now.

This is a temporary product decision to maximize operational flexibility.
RBAC can be reintroduced later if needed.

## Current Policy (Temporary)

1. Any authenticated user can create, view, update, and delete records across modules.
2. APIs still require authentication via middleware and JWT.
3. Ownership fields (`createdBy`, `updatedBy`) are still recorded for auditability where applicable.

## Endpoints Behavior Summary

- `companies`, `invoices`, `purchases`, `lots` process/split endpoints, and purchase-invoice deletion do not enforce role checks.
- Invoice detail and invoice PDF endpoints no longer apply per-record owner filtering.
- Process and purchase write flows no longer require `ADMIN`/`ACCOUNTANT` role.

## User Roles

Roles still exist on users (`USER`, `ADMIN`, `ACCOUNTANT`) but are not currently used to gate business operations.
They remain available for future RBAC rollout.

## API Endpoints Access Control

### Authentication Required
All API endpoints require authentication except:
- `/api/auth/login`
- `/api/auth/signup`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`

### Data Filtering

No role/owner data filtering is currently applied on business endpoints.

### Automatic Ownership Assignment

#### POST `/api/companies`
- Automatically sets `createdBy` to the authenticated user's ID
- No need to pass `createdBy` in request body

#### POST `/api/invoices`
- Automatically sets `createdBy` to the authenticated user's ID
- No need to pass `createdBy` in request body

## Implementation Details

### Middleware (middleware.ts)
- Extracts and verifies JWT token from Authorization header
- Adds user info to request headers:
  - `x-user-id`: User's ID
  - `x-user-email`: User's email
  - `x-user-role`: User's role (USER/ADMIN)
- Protects all routes except public auth endpoints

### Auth Helpers (lib/auth-helpers.ts)
Current primary utility in use:
- `getUserFromHeaders()`: Extract user info from request headers

### Database Schema
```prisma
model Company {
  createdBy Int?
  creator   User? @relation(fields: [createdBy], references: [id])
  // ... other fields
}

model Invoice {
  createdBy Int?
  creator   User? @relation(fields: [createdBy], references: [id])
  // ... other fields
}

model User {
  companies Company[]
  invoices  Invoice[]
  // ... other fields
}
```

## Security Notes

1. **Token-based Authentication**: Uses JWT tokens with 15-minute access token expiry.
2. **No RBAC Enforcement (temporary)**: Role checks are intentionally disabled in business APIs.
3. **Audit Trail**: Ownership metadata is still stored where supported.
4. **Future Hardening**: RBAC and resource-level permissions can be reintroduced later.

## Testing Access Control

As any authenticated user, business endpoints should allow read/write operations under the current policy.

## Future Enhancements

Potential access control improvements:
- Team/organization-level access
- Shared invoices/companies between users
- Custom permissions per user
- Audit logs for access attempts
- Resource-level permissions (read/write/delete)
