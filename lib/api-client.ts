/**
 * API Client with automatic JWT authentication
 * 
 * This wraps fetch() to automatically include the Authorization header
 * from localStorage on all API requests.
 */

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('accessToken');
  }

  async fetch(url: string, options: FetchOptions = {}): Promise<Response> {
    const { requiresAuth = true, headers, ...restOptions } = options;

    const fetchHeaders = new Headers({
      'Content-Type': 'application/json',
    });

    // Add custom headers
    if (headers) {
      if (headers instanceof Headers) {
        headers.forEach((value, key) => {
          fetchHeaders.set(key, value);
        });
      } else if (Array.isArray(headers)) {
        headers.forEach(([key, value]) => {
          fetchHeaders.set(key, value);
        });
      } else {
        Object.entries(headers).forEach(([key, value]) => {
          fetchHeaders.set(key, value);
        });
      }
    }

    // Add Authorization header if required
    if (requiresAuth) {
      const token = this.getToken();
      if (token) {
        fetchHeaders.set('Authorization', `Bearer ${token}`);
      }
    }

    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    const response = await fetch(fullUrl, {
      ...restOptions,
      headers: fetchHeaders,
    });

    // Handle 401 - token expired
    if (response.status === 401) {
      // Try to refresh token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the request with new token
        const newToken = this.getToken();
        if (newToken) {
          fetchHeaders.set('Authorization', `Bearer ${newToken}`);
          return fetch(fullUrl, {
            ...restOptions,
            headers: fetchHeaders,
          });
        }
      }
      // If refresh failed, redirect to login
      if (typeof window !== 'undefined') {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return response;
  }

  private async refreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  // Convenience methods
  async get(url: string, options: FetchOptions = {}) {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  async post(url: string, data?: any, options: FetchOptions = {}) {
    return this.fetch(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(url: string, data?: any, options: FetchOptions = {}) {
    return this.fetch(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch(url: string, data?: any, options: FetchOptions = {}) {
    return this.fetch(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(url: string, options: FetchOptions = {}) {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances if needed
export default ApiClient;
