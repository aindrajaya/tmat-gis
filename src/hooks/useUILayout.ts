/**
 * Redux Custom Hooks: UI State
 * Convenient hooks for managing UI panels and modals
 */

import { useAppSelector, useAppDispatch } from '../store';
import {
  selectLegendOpen,
  selectStatsOpen,
  selectFilterOpen,
  selectNotification,
  selectIsMapExpanded,
  selectOpenPanelCount,
} from '../store/selectors';
import {
  toggleLegend,
  setLegendOpen,
  toggleStats,
  toggleFilter,
  setFilterOpen,
  showNotification,
  hideNotification,
  toggleMapExpanded,
  closeAllPanels,
} from '../store/slices/uiSlice';

/**
 * Hook: useLegend
 * Get/set legend panel state
 */
export const useLegend = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectLegendOpen);

  return {
    isOpen,
    toggle: () => dispatch(toggleLegend()),
    open: () => dispatch(setLegendOpen(true)),
    close: () => dispatch(setLegendOpen(false)),
  };
};

/**
 * Hook: useStats
 * Get/set stats panel state
 */
export const useStats = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectStatsOpen);

  return {
    isOpen,
    toggle: () => dispatch(toggleStats()),
  };
};

/**
 * Hook: useFilterPanel
 * Get/set filter panel state
 */
export const useFilterPanel = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectFilterOpen);

  return {
    isOpen,
    toggle: () => dispatch(toggleFilter()),
    open: () => dispatch(setFilterOpen(true)),
    close: () => dispatch(setFilterOpen(false)),
  };
};

/**
 * Hook: useNotification
 * Get/set notification display
 */
export const useNotification = () => {
  const dispatch = useAppDispatch();
  const notification = useAppSelector(selectNotification);

  return {
    notification,
    show: (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      dispatch(showNotification({ message, type }));
    },
    hide: () => dispatch(hideNotification()),
    success: (message: string) => dispatch(showNotification({ message, type: 'success' })),
    error: (message: string) => dispatch(showNotification({ message, type: 'error' })),
    warning: (message: string) => dispatch(showNotification({ message, type: 'warning' })),
    info: (message: string) => dispatch(showNotification({ message, type: 'info' })),
  };
};

/**
 * Hook: useMapExpanded
 * Get/set map fullscreen state
 */
export const useMapExpanded = () => {
  const dispatch = useAppDispatch();
  const isExpanded = useAppSelector(selectIsMapExpanded);

  return {
    isExpanded,
    toggle: () => dispatch(toggleMapExpanded()),
  };
};

/**
 * Hook: usePanelManagement
 * Manage multiple panels at once
 */
export const usePanelManagement = () => {
  const dispatch = useAppDispatch();
  const legendOpen = useAppSelector(selectLegendOpen);
  const statsOpen = useAppSelector(selectStatsOpen);
  const filterOpen = useAppSelector(selectFilterOpen);
  const openCount = useAppSelector(selectOpenPanelCount);

  return {
    openCount,
    panelStates: {
      legend: legendOpen,
      stats: statsOpen,
      filter: filterOpen,
    },
    closeAll: () => dispatch(closeAllPanels()),
  };
};

/**
 * Hook: useUILayout
 * Comprehensive hook for UI layout management
 */
export const useUILayout = () => {
  const legend = useLegend();
  const stats = useStats();
  const filter = useFilterPanel();
  const mapExpanded = useMapExpanded();
  const panels = usePanelManagement();
  const notification = useNotification();

  return {
    // Panels
    legend,
    stats,
    filter,

    // Map
    isMapExpanded: mapExpanded.isExpanded,
    toggleMapExpanded: mapExpanded.toggle,

    // Notifications
    notification: notification.notification,
    showNotification: notification.show,
    hideNotification: notification.hide,

    // Batch operations
    openPanelCount: panels.openCount,
    closeAllPanels: panels.closeAll,
  };
};
