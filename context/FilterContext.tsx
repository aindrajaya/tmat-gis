import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { FilterState } from '../types';
import { usePerusahaan } from '../services/useApi';

interface FilterContextType {
  filters: FilterState;
  updateFilter: (key: keyof FilterState, value: string) => void;
  resetFilters: () => void;
  apiMode: 'dev' | 'prod';
  setApiMode: (mode: 'dev' | 'prod') => void;
}

const defaultFilters: FilterState = {
  provinsi: '',
  kabupaten: '',
  jenis_perusahaan: '',
  startDate: '2025-11-01',
  endDate: '2025-11-25'
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

  const resetFilters = () => setFilters(defaultFilters);

  return (
    <FilterContext.Provider value={{ filters, updateFilter, resetFilters, apiMode, setApiMode }}>
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