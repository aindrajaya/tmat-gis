/**
 * Redux Slice: UI State
 * Manages UI elements: modals, panels, notifications
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  legendOpen: boolean;
  statsOpen: boolean;
  settingsOpen: boolean;
  filterOpen: boolean;
  advancedFilterOpen: boolean;
  basemapOpen: boolean;
  selectedBasemap: 'osm' | 'satellite' | 'dark';
  isMapExpanded: boolean;
  notification: {
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null;
}

const initialState: UIState = {
  legendOpen: false,
  statsOpen: false,
  settingsOpen: false,
  filterOpen: false,
  advancedFilterOpen: false,
  basemapOpen: false,
  selectedBasemap: 'osm',
  isMapExpanded: false,
  notification: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Toggle legend panel
     */
    toggleLegend: (state) => {
      state.legendOpen = !state.legendOpen;
    },

    /**
     * Set legend visibility
     */
    setLegendOpen: (state, action: PayloadAction<boolean>) => {
      state.legendOpen = action.payload;
    },

    /**
     * Toggle stats panel
     */
    toggleStats: (state) => {
      state.statsOpen = !state.statsOpen;
    },

    /**
     * Set stats visibility
     */
    setStatsOpen: (state, action: PayloadAction<boolean>) => {
      state.statsOpen = action.payload;
    },

    /**
     * Toggle settings panel
     */
    toggleSettings: (state) => {
      state.settingsOpen = !state.settingsOpen;
    },

    /**
     * Toggle filter panel
     */
    toggleFilter: (state) => {
      state.filterOpen = !state.filterOpen;
    },

    /**
     * Set filter visibility
     */
    setFilterOpen: (state, action: PayloadAction<boolean>) => {
      state.filterOpen = action.payload;
    },

    /**
     * Toggle advanced filter
     */
    toggleAdvancedFilter: (state) => {
      state.advancedFilterOpen = !state.advancedFilterOpen;
    },

    /**
     * Set advanced filter visibility
     */
    setAdvancedFilterOpen: (state, action: PayloadAction<boolean>) => {
      state.advancedFilterOpen = action.payload;
    },

    /**
     * Toggle basemap selector
     */
    toggleBasemap: (state) => {
      state.basemapOpen = !state.basemapOpen;
    },

    /**
     * Select basemap
     */
    selectBasemap: (state, action: PayloadAction<'osm' | 'satellite' | 'dark'>) => {
      state.selectedBasemap = action.payload;
      state.basemapOpen = false;
    },

    /**
     * Toggle map expansion
     */
    toggleMapExpanded: (state) => {
      state.isMapExpanded = !state.isMapExpanded;
    },

    /**
     * Set map expansion
     */
    setMapExpanded: (state, action: PayloadAction<boolean>) => {
      state.isMapExpanded = action.payload;
    },

    /**
     * Show notification
     */
    showNotification: (
      state,
      action: PayloadAction<{
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
      }>
    ) => {
      state.notification = {
        isOpen: true,
        message: action.payload.message,
        type: action.payload.type,
      };
    },

    /**
     * Hide notification
     */
    hideNotification: (state) => {
      state.notification = null;
    },

    /**
     * Close all panels
     */
    closeAllPanels: (state) => {
      state.legendOpen = false;
      state.statsOpen = false;
      state.settingsOpen = false;
      state.filterOpen = false;
      state.advancedFilterOpen = false;
      state.basemapOpen = false;
      state.notification = null;
    },
  },
});

export const {
  toggleLegend,
  setLegendOpen,
  toggleStats,
  setStatsOpen,
  toggleSettings,
  toggleFilter,
  setFilterOpen,
  toggleAdvancedFilter,
  setAdvancedFilterOpen,
  toggleBasemap,
  selectBasemap,
  toggleMapExpanded,
  setMapExpanded,
  showNotification,
  hideNotification,
  closeAllPanels,
} = uiSlice.actions;

export default uiSlice.reducer;
