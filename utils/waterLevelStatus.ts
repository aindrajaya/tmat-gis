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
  severity: 'safe' | 'low' | 'medium' | 'high' | 'veryhigh' | 'extreme' | 'offline';
}

/**
 * Classify TMAT value into water level status
 * Uses consistent decimal threshold system based on peat surface elevation
 * @param tmatValue - TMAT value in decimal format (negative = below surface)
 * @param isIndonesian - Whether to return Indonesian labels
 * @returns WaterLevelStatus object with color, level, and severity
 */
export const getWaterLevelStatus = (tmatValue: number, isIndonesian = true): WaterLevelStatus => {
  if (tmatValue >= 0) {
    return {
      level: isIndonesian ? 'Tidak Beresiko' : 'No Risk',
      color: '#703CA0',
      range: '≥ 0 cm',
      description: isIndonesian ? 'Tidak beresiko - Aman' : 'No risk - Safe',
      severity: 'safe'
    };
  } else if (tmatValue >= -0.2) {
    return {
      level: isIndonesian ? 'Rendah' : 'Low',
      color: '#00B050',
      range: '0 - 20 cm',
      description: isIndonesian ? 'Rendah - Aman' : 'Low water level - Safe',
      severity: 'low'
    };
  } else if (tmatValue >= -0.4) {
    return {
      level: isIndonesian ? 'Sedang' : 'Medium',
      color: '#00B0F0',
      range: '20 - 40 cm',
      description: isIndonesian ? 'Sedang - Perhatian' : 'Moderate water level - Warning',
      severity: 'medium'
    };
  } else if (tmatValue >= -0.6) {
    return {
      level: isIndonesian ? 'Tinggi' : 'High',
      color: '#FFFF00',
      range: '40 - 60 cm',
      description: isIndonesian ? 'Tinggi - Bahaya' : 'High water level - Danger',
      severity: 'high'
    };
  } else if (tmatValue >= -0.8) {
    return {
      level: isIndonesian ? 'Sangat Tinggi' : 'Very High',
      color: '#FFC000',
      range: '60 - 80 cm',
      description: isIndonesian ? 'Sangat Tinggi - Darurat' : 'Very high water level - Emergency',
      severity: 'veryhigh'
    };
  } else {
    return {
      level: isIndonesian ? 'Ekstrim' : 'Extreme',
      color: '#EE0000',
      range: '> 80 cm',
      description: isIndonesian ? 'Ekstrim - Kritis' : 'Extreme water level - Critical',
      severity: 'extreme'
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
