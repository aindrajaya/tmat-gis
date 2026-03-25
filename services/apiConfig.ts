/**
 * API Configuration and utilities
 */

export const API_CONFIG = {
  production: {
    name: 'Production Proxy',
    baseUrl: 'https://proxy.yourdomain.com',
    description: 'TMAT auth proxy production host',
  },
  development: {
    name: 'Development Proxy',
    baseUrl: 'http://localhost:4000',
    description: 'TMAT auth proxy development host',
  },
};

export type ApiMode = 'dev' | 'prod';

/**
 * Get API configuration for selected mode
 */
export function getApiConfig(mode: ApiMode) {
  return mode === 'prod' ? API_CONFIG.production : API_CONFIG.development;
}

/**
 * Get API base URL from environment or default
 */
export function getApiBaseUrl(mode: ApiMode): string {
  if (mode === 'prod') {
    return (
      import.meta.env.VITE_PROD_API_URL || API_CONFIG.production.baseUrl
    );
  }
  return import.meta.env.VITE_DEV_API_URL || API_CONFIG.development.baseUrl;
}

/**
 * Get current API mode from environment
 */
export function getCurrentApiMode(): ApiMode {
  return (import.meta.env.VITE_API_MODE as ApiMode) || 'dev';
}

/**
 * Format API endpoint for logging
 */
export function formatApiEndpoint(baseUrl: string, endpoint: string): string {
  return `${baseUrl}${endpoint}`;
}
