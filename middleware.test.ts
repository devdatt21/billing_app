// @ts-nocheck
import { NextRequest } from 'next/server';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { middleware } from './middleware';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
  extractTokenFromHeader: jest.fn(),
}));

describe('middleware protected API auth behavior', () => {
  const mockedVerifyToken = verifyToken as jest.Mock;
  const mockedExtractTokenFromHeader = extractTokenFromHeader as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when calling /api/purchases without bearer token', async () => {
    mockedExtractTokenFromHeader.mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/purchases', {
      method: 'GET',
    });

    const response = await middleware(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('returns 401 when token is invalid for /api/purchases', async () => {
    mockedExtractTokenFromHeader.mockReturnValue('bad-token');
    mockedVerifyToken.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/purchases', {
      method: 'GET',
      headers: {
        authorization: 'Bearer bad-token',
      },
    });

    const response = await middleware(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid or expired token');
  });

  it('passes and forwards x-user-* headers for valid token on /api/purchases', async () => {
    mockedExtractTokenFromHeader.mockReturnValue('valid-token');
    mockedVerifyToken.mockResolvedValue({
      userId: 42,
      email: 'acc@billing.app',
      role: 'ACCOUNTANT',
    });

    const request = new NextRequest('http://localhost/api/purchases', {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);

    const overrideHeaders = response.headers.get('x-middleware-override-headers') || '';
    expect(overrideHeaders).toContain('x-user-id');
    expect(overrideHeaders).toContain('x-user-email');
    expect(overrideHeaders).toContain('x-user-role');

    expect(response.headers.get('x-middleware-request-x-user-id')).toBe('42');
    expect(response.headers.get('x-middleware-request-x-user-email')).toBe('acc@billing.app');
    expect(response.headers.get('x-middleware-request-x-user-role')).toBe('ACCOUNTANT');
  });
});
