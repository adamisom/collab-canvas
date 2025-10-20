/**
 * Normalize rotation angle to 0-360 range
 */
export const normalizeRotation = (angle: number): number => {
  // Reduce to 0-360 range
  let normalized = angle % 360
  
  // Handle negative angles
  if (normalized < 0) {
    normalized += 360
  }
  
  return normalized
}

/**
 * Snap angle to nearest interval (e.g., 15° increments)
 */
export const snapToInterval = (angle: number, interval: number): number => {
  return Math.round(angle / interval) * interval
}

/**
 * Calculate angle between two points in degrees
 * Returns angle from 0-360 where 0° is pointing right (east)
 */
export const calculateAngle = (
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number
): number => {
  const dx = pointX - centerX
  const dy = pointY - centerY
  
  // atan2 returns radians from -π to π, convert to degrees 0-360
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  
  // Normalize to 0-360
  return normalizeRotation(angle)
}

