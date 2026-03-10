/**
 * API Configuration and utilities
 */

export const API_CONFIG = {
  production: {
    name: 'Production (KLHK)',
    baseUrl:
      'https://gambutindonesia.kemenlh.go.id/backoffice-SPAgambut/api/v1',
    description: 'Production API server for live data',
  },
  development: {
    name: 'Development',
    baseUrl: 'https://coherent-afton-aruskoding-32476f63.koyeb.app/api/portal_v1',
    description: 'Development API server for testing',
  },
};

export type ApiMode = 'dev' | 'prod';
export type ApiKeyMap = Record<string, string>;

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
  const runtime = loadRuntimeApiKeys();
  if (mode === 'prod') {
    return runtime.adminApiKey || import.meta.env.VITE_PROD_API_KEY_ADMIN || import.meta.env.VITE_PROD_API_KEY || '';
  }
  return import.meta.env.VITE_DEV_API_KEY || '';
}

/**
 * Get perusahaan API key map for production mode.
 * Expected format:
 * VITE_PROD_API_KEYS_PERUSAHAAN={"19":"keyA","24":"keyB"}
 */
export function getPerusahaanApiKeyMap(mode: ApiMode): ApiKeyMap {
  if (mode !== 'prod') return {};
  return loadRuntimeApiKeys().perusahaanApiKeys;
}

/**
 * Resolve API key by scope.
 * For production, perusahaan-specific key has priority when perusahaanId is provided.
 */
export function resolveApiKey(mode: ApiMode, perusahaanId?: number): string {
  const adminKey = getApiKey(mode);
  if (mode !== 'prod' || !perusahaanId) return adminKey;

  const perusahaanKeys = getPerusahaanApiKeyMap(mode);
  return perusahaanKeys[String(perusahaanId)] || adminKey;
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
import { loadRuntimeApiKeys } from './runtimeApiKeys';
