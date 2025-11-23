# JWT Authentication Implementation

## Overview
This billing application now includes JWT (JSON Web Token) authentication with bcrypt password hashing.

## Features
- User registration and login
- JWT access tokens (15 minutes expiry)
- JWT refresh tokens (7 days expiry)
- Password hashing with bcrypt (12 salt rounds)
- Protected routes with middleware
- Role-based access control (ADMIN, USER)

## API Endpoints

### Authentication

#### POST `/api/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "USER" // optional, defaults to USER
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

#### POST `/api/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

#### GET `/api/auth/verify`
Verify the current access token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "userId": 1,
    "email": "john@example.com",
    "role": "USER"
  }
}
```

## Protected Routes

All routes except `/login`, `/signup`, and authentication endpoints require authentication.

### Making Authenticated Requests

Include the access token in the Authorization header:

```javascript
fetch('/api/invoices', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

### Client-Side Usage

Use the `useAuth` hook from the AuthContext:

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, accessToken, login, logout, signup } = useAuth();

  // Login
  const handleLogin = async () => {
    try {
      await login('john@example.com', 'password123');
      // Redirect to dashboard
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Logout
  const handleLogout = () => {
    logout();
    // Redirect to login page
  };

  return (
    <div>
      {user ? (
        <p>Welcome, {user.name}!</p>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

## Environment Variables

Add to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production-use-minimum-32-characters
```

**Important:** Change the JWT_SECRET in production to a secure random string.

## Security Notes

1. **JWT_SECRET**: Must be at least 32 characters long and kept secret
2. **Password Requirements**: Minimum 8 characters
3. **Token Storage**: Tokens are stored in localStorage (consider httpOnly cookies for production)
4. **HTTPS**: Always use HTTPS in production
5. **Token Expiry**: Access tokens expire in 15 minutes, refresh tokens in 7 days

## Role-Based Access

- **USER**: Can view and manage their own data
- **ADMIN**: Full access to all resources (companies, invoices, etc.)

Admin-only routes are protected in the middleware and will return 403 Forbidden for non-admin users.

## Files Created

### Authentication Utilities
- `lib/auth.ts` - Password hashing and JWT token management

### API Routes
- `app/api/auth/signup/route.ts` - User registration
- `app/api/auth/login/route.ts` - User login
- `app/api/auth/refresh/route.ts` - Token refresh
- `app/api/auth/verify/route.ts` - Token verification

### Middleware
- `middleware.ts` - Route protection and authentication

### Context & UI
- `contexts/AuthContext.tsx` - Auth state management
- `app/login/page.tsx` - Login page
- `app/signup/page.tsx` - Signup page

### Configuration
- `.env.example` - Environment variables template
