import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { FilterState } from '../types';
import { usePerusahaan } from '../services/useApi';

interface FilterContextType {
  filters: FilterState;
  updateFilter: (key: keyof FilterState, value: string) => void;
  setTimePeriod: (period: 'today' | '7d' | '14d' | '30d' | 'custom') => void;
  resetFilters: () => void;
  apiMode: 'dev' | 'prod';
  setApiMode: (mode: 'dev' | 'prod') => void;
}

const getDateRange = (period: string): { startDate: string; endDate: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = today.toISOString().split('T')[0];
  let startDate = endDate;

  switch (period) {
    case 'today':
      startDate = endDate;
      break;
    case '7d':
      const date7d = new Date(today);
      date7d.setDate(date7d.getDate() - 6);
      startDate = date7d.toISOString().split('T')[0];
      break;
    case '14d':
      const date14d = new Date(today);
      date14d.setDate(date14d.getDate() - 13);
      startDate = date14d.toISOString().split('T')[0];
      break;
    case '30d':
      const date30d = new Date(today);
      date30d.setDate(date30d.getDate() - 29);
      startDate = date30d.toISOString().split('T')[0];
      break;
    default:
      break;
  }

  return { startDate, endDate };
};

const defaultFilters: FilterState = {
  provinsi: '',
  kabupaten: '',
  jenis_perusahaan: '',
  startDate: '2025-11-01',
  endDate: '2025-11-25',
  timePeriod: 'custom'
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [apiMode, setApiMode] = useState<'dev' | 'prod'>(
    (import.meta.env.VITE_API_MODE as 'dev' | 'prod') || 'dev'
  );

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const setTimePeriod = (period: 'today' | '7d' | '14d' | '30d' | 'custom') => {
    const { startDate, endDate } = getDateRange(period);
    setFilters(prev => ({
      ...prev,
      timePeriod: period,
      ...(period !== 'custom' && { startDate, endDate })
    }));
  };

  const resetFilters = () => setFilters(defaultFilters);

  return (
    <FilterContext.Provider value={{ filters, updateFilter, setTimePeriod, resetFilters, apiMode, setApiMode }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};