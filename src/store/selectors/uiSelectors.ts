/**
 * Redux Selectors: UI State
 * Memoized selectors for UI elements (modals, panels, notifications)
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

/**
 * Base selector: Get UI state
 */
const selectUIState = (state: RootState) => state.ui;

/**
 * Get legend open status
 */
export const selectLegendOpen = createSelector(
  [selectUIState],
  (ui) => ui.legendOpen
);

/**
 * Get stats panel open status
 */
export const selectStatsOpen = createSelector(
  [selectUIState],
  (ui) => ui.statsOpen
);

/**
 * Get settings panel open status
 */
export const selectSettingsOpen = createSelector(
  [selectUIState],
  (ui) => ui.settingsOpen
);

/**
 * Get filter panel open status
 */
export const selectFilterOpen = createSelector(
  [selectUIState],
  (ui) => ui.filterOpen
);

/**
 * Get advanced filter panel open status
 */
export const selectAdvancedFilterOpen = createSelector(
  [selectUIState],
  (ui) => ui.advancedFilterOpen
);

/**
 * Get basemap selector open status
 */
export const selectBasemapOpen = createSelector(
  [selectUIState],
  (ui) => ui.basemapOpen
);

/**
 * Get selected basemap
 */
export const selectSelectedBasemap = createSelector(
  [selectUIState],
  (ui) => ui.selectedBasemap
);

/**
 * Get map expansion state
 */
export const selectIsMapExpanded = createSelector(
  [selectUIState],
  (ui) => ui.isMapExpanded
);

/**
 * Get current notification
 */
export const selectNotification = createSelector(
  [selectUIState],
  (ui) => ui.notification
);

/**
 * Check if notification is displayed
 */
export const selectHasNotification = createSelector(
  [selectNotification],
  (notification) => notification !== null && notification.isOpen
);

/**
 * Get number of open panels
 * Useful for responsive layout decisions
 */
export const selectOpenPanelCount = createSelector(
  [selectUIState],
  (ui) => {
    let count = 0;
    if (ui.legendOpen) count++;
    if (ui.statsOpen) count++;
    if (ui.settingsOpen) count++;
    if (ui.filterOpen) count++;
    if (ui.advancedFilterOpen) count++;
    if (ui.basemapOpen) count++;
    return count;
  }
);

/**
 * Check if any critical filter panel is open
 */
export const selectHasFilterPanelOpen = createSelector(
  [selectFilterOpen, selectAdvancedFilterOpen],
  (filter, advancedFilter) => filter || advancedFilter
);

/**
 * Get all side panel states
 */
export const selectAllPanelStates = createSelector(
  [selectUIState],
  (ui) => ({
    legend: ui.legendOpen,
    stats: ui.statsOpen,
    settings: ui.settingsOpen,
    filter: ui.filterOpen,
    advancedFilter: ui.advancedFilterOpen,
    basemap: ui.basemapOpen,
  })
);

/**
 * Get sidebar visibility (any sidebar panel open)
 */
export const selectSidebarVisible = createSelector(
  [selectUIState],
  (ui) => 
    ui.legendOpen || 
    ui.statsOpen || 
    ui.settingsOpen || 
    ui.filterOpen || 
    ui.advancedFilterOpen
);

/**
 * Get responsive layout mode
 * Based on map expanded state
 */
export const selectLayoutMode = createSelector(
  [selectIsMapExpanded, selectOpenPanelCount],
  (isMapExpanded, panelCount) => {
    if (isMapExpanded) return 'fullscreen';
    if (panelCount > 2) return 'compact';
    return 'normal';
  }
);
