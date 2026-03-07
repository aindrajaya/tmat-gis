/**
 * RTK Query Base API Configuration
 * Shared configuration for all RTK Query APIs
 */

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Base query configuration for all RTK Query endpoints
 */
export const baseFetchQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  prepareHeaders: (headers) => {
    // Add common headers here
    headers.set('Content-Type', 'application/json');
    
    // Add auth token if available (future enhancement)
    const token = localStorage.getItem('authToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  },
});

/**
 * Error handling for all queries
 */
export const handleQueryError = (error: any) => {
  console.error('[RTK Query Error]:', error);
  
  if (error.status === 401) {
    // Unauthorized - redirect to login
    console.warn('Unauthorized - Token may have expired');
  } else if (error.status === 403) {
    console.warn('Forbidden - User lacks permission');
  } else if (error.status === 500) {
    console.error('Server error - Please try again later');
  }
};
