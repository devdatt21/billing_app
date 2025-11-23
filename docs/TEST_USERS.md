# Test Credentials

## Login Credentials

The seed script creates two test users:

### Admin User
- **Email**: `admin@test.com`
- **Password**: `admin123`
- **Role**: ADMIN
- **Access**: Can view and manage ALL companies and invoices from all users

### Regular User
- **Email**: `user@test.com`
- **Password**: `user123`
- **Role**: USER
- **Access**: Can only view and manage their OWN companies and invoices

## Quick Start

1. Run the seed script:
   ```bash
   npm run db:seed
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Navigate to http://localhost:3000/login

4. Login with either test account above

## Features

- ✅ User signup and login
- ✅ JWT authentication (15min access, 7day refresh)
- ✅ Role-based access control (ADMIN/USER)
- ✅ Data isolation (users see only their own data)
- ✅ Password reset (email disabled for now - logs to console)

## Password Reset (Email Disabled)

Email is currently commented out. To test password reset:

1. Go to http://localhost:3000/forgot-password
2. Enter your email
3. Check the terminal/console logs for the reset token
4. Copy the reset URL and paste in browser
5. Set new password

## Creating New Users

### Via Signup Page
- Go to http://localhost:3000/signup
- Fill in name, email, password
- Default role is USER

### Via Database (for ADMIN)
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'newemail@example.com';
```
