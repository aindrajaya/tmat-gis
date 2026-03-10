/**
 * RTK Query Base API Configuration
 * Shared configuration for all RTK Query APIs
 */

import { fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiBaseUrl, getCurrentApiMode } from '../../../services/apiConfig';
import type { RtkQueryError } from './runtimeScope';

/**
 * Base query for APIs that use custom `queryFn`.
 * All network calls are delegated to services/apiClient.ts so they
 * automatically inherit runtime key management and endpoint compatibility.
 */
export const baseFetchQuery = fakeBaseQuery<RtkQueryError>();

export function getActiveApiBaseUrl(): string {
  return getApiBaseUrl(getCurrentApiMode());
}

/**
 * Error handling for all queries
 */
export const handleQueryError = (error: any) => {
  console.error('[RTK Query Error]:', error);

  if (error?.status === 401) {
    console.warn('Unauthorized - Token may have expired');
  } else if (error?.status === 403) {
    console.warn('Forbidden - User lacks permission');
  } else if (error?.status === 500) {
    console.error('Server error - Please try again later');
  } else if (error?.message) {
    console.error('Request error:', error.message);
  }
};
