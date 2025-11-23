import { NextRequest } from 'next/server';

export interface AuthUser {
  userId: number;
  email: string;
  role: string;
}

/**
 * Extract user info from request headers (set by middleware)
 */
export function getUserFromHeaders(request: NextRequest): AuthUser | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');

  if (!userId || !email || !role) {
    return null;
  }

  return {
    userId: parseInt(userId),
    email,
    role,
  };
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN';
}

/**
 * Check if user can access resource
 */
export function canAccessResource(
  user: AuthUser | null,
  resourceOwnerId: number | null
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return user.userId === resourceOwnerId;
}
