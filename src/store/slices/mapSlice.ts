/**
 * Redux Slice: Map State
 * Manages map UI state: filters, zoom, layers, selected device
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Device, FilterState } from '../../types';

interface MapState {
  filters: FilterState;
  showDistrictLayer: boolean;
  showMarkers: boolean;
  selectedDevice: Device | null;
  selectedCity: string | null;
  zoom: number;
  isLoadingMap: boolean;
}

const initialFilterState: FilterState = {
  provinsi: '',
  kabupaten: '',
  kecamatan: '',
  desa: '',
  jenis_perusahaan: '',
  startDate: '',
  endDate: '',
  timePeriod: undefined,
  searchText: '',
  selectedCity: null,
};

const initialState: MapState = {
  filters: initialFilterState,
  showDistrictLayer: false,
  showMarkers: false,
  selectedDevice: null,
  selectedCity: null,
  zoom: 5,
  isLoadingMap: false,
};

export const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    /**
     * Update filters (aggregated)
     */
    setFilters: (state, action: PayloadAction<Partial<FilterState>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    /**
     * Clear all filters
     */
    clearFilters: (state) => {
      state.filters = initialFilterState;
    },

    /**
     * Update specific filter
     */
    updateFilter: (
      state,
      action: PayloadAction<{ field: keyof FilterState; value: any }>
    ) => {
      state.filters[action.payload.field] = action.payload.value;
    },

    /**
     * Toggle district layer
     */
    toggleDistrictLayer: (state) => {
      state.showDistrictLayer = !state.showDistrictLayer;
    },

    /**
     * Set district layer visibility
     */
    setShowDistrictLayer: (state, action: PayloadAction<boolean>) => {
      state.showDistrictLayer = action.payload;
    },

    /**
     * Toggle device markers
     */
    toggleShowMarkers: (state) => {
      state.showMarkers = !state.showMarkers;
    },

    /**
     * Set device markers visibility
     */
    setShowMarkers: (state, action: PayloadAction<boolean>) => {
      state.showMarkers = action.payload;
    },

    /**
     * Select a device
     */
    selectDevice: (state, action: PayloadAction<Device | null>) => {
      state.selectedDevice = action.payload;
    },

    /**
     * Select a city
     */
    selectCity: (state, action: PayloadAction<string | null>) => {
      state.selectedCity = action.payload;
    },

    /**
     * Update zoom level
     */
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = action.payload;
    },

    /**
     * Set map loading state
     */
    setMapLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMap = action.payload;
    },

    /**
     * Reset map to initial state
     */
    resetMap: (state) => {
      state.filters = initialFilterState;
      state.showDistrictLayer = false;
      state.showMarkers = false;
      state.selectedDevice = null;
      state.selectedCity = null;
      state.zoom = 5;
    },
  },
});

export const {
  setFilters,
  clearFilters,
  updateFilter,
  toggleDistrictLayer,
  setShowDistrictLayer,
  toggleShowMarkers,
  setShowMarkers,
  selectDevice,
  selectCity,
  setZoom,
  setMapLoading,
  resetMap,
} = mapSlice.actions;

export default mapSlice.reducer;
