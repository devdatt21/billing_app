# Access Control & Data Filtering

## Overview
The billing application implements role-based access control (RBAC) with user-level data isolation.

## User Roles

### USER (Default)
- Can only view and manage their own data
- Companies and invoices are filtered by `createdBy` field
- Cannot access data created by other users

### ADMIN
- Full access to all data across all users
- No filtering applied on API queries
- Can view, create, and manage all companies and invoices

## Data Ownership

### Companies
- Each company is associated with the user who created it via `createdBy` field
- Users see only companies they created
- Admins see all companies

### Invoices
- Each invoice is associated with the user who created it via `createdBy` field
- Users see only invoices they created
- Admins see all invoices
- PDF generation respects ownership (users can't download other users' invoices)

## API Endpoints Access Control

### Authentication Required
All API endpoints require authentication except:
- `/api/auth/login`
- `/api/auth/signup`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`

### Automatic Filtering

#### GET `/api/companies`
- **USER**: Returns only companies where `createdBy = currentUserId`
- **ADMIN**: Returns all companies

#### GET `/api/invoices`
- **USER**: Returns only invoices where `createdBy = currentUserId`
- **ADMIN**: Returns all invoices

#### GET `/api/invoices/[id]`
- **USER**: Returns invoice only if `createdBy = currentUserId`, otherwise 403 Forbidden
- **ADMIN**: Returns any invoice

#### GET `/api/invoices/[id]/pdf`
- **USER**: Generates PDF only if `createdBy = currentUserId`, otherwise 403 Forbidden
- **ADMIN**: Generates PDF for any invoice

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
Provides utility functions:
- `getUserFromHeaders()`: Extract user info from request headers
- `isAdmin()`: Check if user has admin role
- `canAccessResource()`: Verify if user can access a specific resource

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

1. **Token-based Authentication**: Uses JWT tokens with 15-minute access token expiry
2. **Automatic Filtering**: Data isolation happens at the database query level
3. **Access Checks**: Resources are validated before access (invoice view, PDF download)
4. **No Role Escalation**: Users cannot change their role or access other users' data
5. **Audit Trail**: `createdBy` field provides ownership tracking

## Testing Access Control

### As Regular User
```bash
# Login as user
POST /api/auth/login
{ "email": "user@example.com", "password": "password123" }

# Create company (automatically owned by user)
POST /api/companies
{ "name": "My Company", "gstin": "..." }

# List companies (only sees own companies)
GET /api/companies

# Try to access another user's invoice (will fail with 403)
GET /api/invoices/123
```

### As Admin
```bash
# Login as admin
POST /api/auth/login
{ "email": "admin@example.com", "password": "password123" }

# List all companies (sees everything)
GET /api/companies

# Access any invoice (succeeds)
GET /api/invoices/123
```

## Creating Admin Users

Admin users must be created directly in the database or via signup with role specified:

```sql
-- Update existing user to admin
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Or during signup (if permitted):
```javascript
POST /api/auth/signup
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "securepassword",
  "role": "ADMIN"  // Only if signup allows role specification
}
```

## Future Enhancements

Potential access control improvements:
- Team/organization-level access
- Shared invoices/companies between users
- Custom permissions per user
- Audit logs for access attempts
- Resource-level permissions (read/write/delete)
