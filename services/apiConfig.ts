/**
 * API Configuration and utilities
 */

import { ApiMode, getRuntimeConfig } from './runtimeConfig';

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
  const runtimeConfig = getRuntimeConfig();
  if (mode === 'prod') {
    return runtimeConfig.prodApiUrl || API_CONFIG.production.baseUrl;
  }
  return runtimeConfig.devApiUrl || API_CONFIG.development.baseUrl;
}

/**
 * Get current API mode from environment
 */
export function getCurrentApiMode(): ApiMode {
  return getRuntimeConfig().apiMode;
}

/**
 * Format API endpoint for logging
 */
export function formatApiEndpoint(baseUrl: string, endpoint: string): string {
  return `${baseUrl}${endpoint}`;
}
