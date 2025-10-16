/**
 * Utility functions for generating consistent user colors across the application
 */

// Available colors for user cursors and indicators
const USER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal  
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9'  // Light Blue
] as const

/**
 * Generate a consistent color for a user based on their userId
 * Uses a simple hash function to ensure the same userId always gets the same color
 */
export const getUserColor = (userId: string): string => {
  // Simple hash function to get consistent color
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

/**
 * Get all available user colors (for reference or testing)
 */
export const getAvailableUserColors = (): readonly string[] => {
  return USER_COLORS
}
