import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { FilterState } from '../types';
import { usePerusahaan } from '../services/useApi';
import { useAuth } from './AuthContext';

interface FilterContextType {
  filters: FilterState;
  updateFilter: (key: keyof FilterState, value: string | null) => void;
  setTimePeriod: (period: 'today' | '7d' | '14d' | '30d' | 'custom') => void;
  resetFilters: () => void;
  apiMode: 'dev' | 'prod';
  setApiMode: (mode: 'dev' | 'prod') => void;
  enforcedProvinsi: string | null;
  updateSelectedCity: (cityName: string | null) => void;
}

const toLocalDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (period: string): { startDate: string; endDate: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = toLocalDateInputValue(today);
  let startDate = endDate;

  switch (period) {
    case 'today':
      startDate = endDate;
      break;
    case '7d':
      const date7d = new Date(today);
      date7d.setDate(date7d.getDate() - 6);
      startDate = toLocalDateInputValue(date7d);
      break;
    case '14d':
      const date14d = new Date(today);
      date14d.setDate(date14d.getDate() - 13);
      startDate = toLocalDateInputValue(date14d);
      break;
    case '30d':
      const date30d = new Date(today);
      date30d.setDate(date30d.getDate() - 29);
      startDate = toLocalDateInputValue(date30d);
      break;
    default:
      break;
  }

  return { startDate, endDate };
};

const buildDefaultFilters = (): FilterState => {
  const { startDate, endDate } = getDateRange('7d');
  return {
    provinsi: '',
    kabupaten: '',
    kecamatan: '',
    desa: '',
    jenis_perusahaan: '',
    startDate,
    endDate,
    timePeriod: '7d',
    searchText: '',
    selectedCity: null,
  };
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(buildDefaultFilters());
  const [apiMode, setApiMode] = useState<'dev' | 'prod'>(
    (import.meta.env.VITE_API_MODE as 'dev' | 'prod') || 'dev'
  );
  const { user } = useAuth();
  const [enforcedProvinsi, setEnforcedProvinsi] = useState<string | null>(null);

  const updateFilter = (key: keyof FilterState, value: string | null) => {
    if (key === 'provinsi' && enforcedProvinsi) {
      return; // prevent overriding enforced province
    }
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

  const updateSelectedCity = (cityName: string | null) => {
    setFilters(prev => ({ ...prev, selectedCity: cityName }));
  };

  const resetFilters = () => {
    const defaults = buildDefaultFilters();
    setFilters({
      ...defaults,
      provinsi: enforcedProvinsi || '',
    });
  };

  // Enforce province filter when user has province restriction
  useEffect(() => {
    if (user?.provinsiId) {
      setEnforcedProvinsi(user.provinsiId);
      setFilters(prev => ({
        ...prev,
        provinsi: user.provinsiId,
      }));
    } else {
      setEnforcedProvinsi(null);
      setFilters(prev => ({ ...prev, provinsi: '' }));
    }
  }, [user?.provinsiId]);

  return (
    <FilterContext.Provider value={{ filters, updateFilter, setTimePeriod, resetFilters, apiMode, setApiMode, enforcedProvinsi, updateSelectedCity }}>
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
