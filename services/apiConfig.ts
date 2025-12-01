/**
 * API Configuration and utilities
 */

export const API_CONFIG = {
  production: {
    name: 'Production (Staging)',
    baseUrl:
      'https://staging.kurmaspace.com/klhk/app/index.php/api/portal_v1',
    description: 'Production API server for live data',
  },
  development: {
    name: 'Development',
    baseUrl: 'https://coherent-afton-aruskoding-32476f63.koyeb.app/api/portal_v1',
    description: 'Development API server for testing',
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
 * Get API key from environment
 */
export function getApiKey(mode: ApiMode): string {
  if (mode === 'prod') {
    return import.meta.env.VITE_PROD_API_KEY || '';
  }
  return import.meta.env.VITE_DEV_API_KEY || '';
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

/**
 * Check if API key is configured
 */
export function isApiKeyConfigured(mode: ApiMode): boolean {
  const key = getApiKey(mode);
  return key && key.length > 0 && key !== 'TULIS_KEY_PUBLIK_DISINI';
}
