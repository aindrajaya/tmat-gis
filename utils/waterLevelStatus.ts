/**
 * Water Level Status Classification Utility
 * Provides consistent water level status based on TMAT values across the application
 * TMAT = peat surface elevation (negative = below surface)
 */

export interface WaterLevelStatus {
  level: string;
  color: string;
  range: string;
  description: string;
  severity: 'tergenang' | 'normal' | 'rawan' | 'sangat_rawan' | 'offline';
}

/**
 * Classify TMAT value into water level status
 * Uses consistent decimal threshold system based on peat surface elevation
 * @param tmatValue - TMAT value in decimal format (negative = below surface)
 * @param isIndonesian - Whether to return Indonesian labels
 * @returns WaterLevelStatus object with color, level, and severity
 */
export const getWaterLevelStatus = (tmatValue: number, isIndonesian = true): WaterLevelStatus => {
  if (!Number.isFinite(tmatValue)) {
    return getOfflineStatus(isIndonesian);
  }

  if (tmatValue > 0) {
    return {
      level: isIndonesian ? 'Tergenang' : 'Flooded',
      color: '#3B82F6',
      range: '> 0 cm',
      description: isIndonesian ? 'Tinggi muka air di atas permukaan' : 'Water level above surface',
      severity: 'tergenang'
    };
  } else if (tmatValue >= -40) {
    return {
      level: isIndonesian ? 'Normal' : 'Normal',
      color: '#22C55E',
      range: '-40 cm < nilai ≤ 0 cm',
      description: isIndonesian ? 'Kondisi normal' : 'Normal condition',
      severity: 'normal'
    };
  } else if (tmatValue >= -80) {
    return {
      level: isIndonesian ? 'Rawan' : 'At Risk',
      color: '#F97316',
      range: '-80 cm < nilai ≤ -40 cm',
      description: isIndonesian ? 'Perlu perhatian' : 'Needs attention',
      severity: 'rawan'
    };
  } else {
    return {
      level: isIndonesian ? 'Sangat Rawan' : 'Very Risky',
      color: '#EF4444',
      range: '≤ -80 cm',
      description: isIndonesian ? 'Kondisi kritis atau tanpa data' : 'Critical or no data',
      severity: 'sangat_rawan'
    };
  }
};

/**
 * Get offline status (for devices with no realtime data)
 */
export const getOfflineStatus = (isIndonesian = true): WaterLevelStatus => {
  return {
    level: isIndonesian ? 'Offline' : 'Offline',
    color: '#94a3b8',
    range: 'N/A',
    description: isIndonesian ? 'Perangkat offline' : 'Device offline',
    severity: 'offline'
  };
};
