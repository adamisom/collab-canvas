// Canvas dimensions
export const CANVAS_WIDTH = 3000
export const CANVAS_HEIGHT = 3000

// Viewport dimensions (initial)
export const VIEWPORT_WIDTH = window?.innerWidth || 1200
export const VIEWPORT_HEIGHT = window?.innerHeight || 800

// Cursor update throttling (milliseconds)
export const CURSOR_THROTTLE_MS = 16

// Firebase database paths
export const DB_PATHS = {
  USERS: 'users',
  CURSORS: 'cursors', 
  RECTANGLES: 'rectangles'
} as const

// Default rectangle properties
export const DEFAULT_RECT = {
  WIDTH: 100,
  HEIGHT: 80,
  FILL: '#3b82f6',
  STROKE: '#1e40af',
  STROKE_WIDTH: 2
} as const

// Selection colors
export const SELECTION_COLORS = {
  STROKE: '#ef4444',
  STROKE_WIDTH: 3
} as const

// Canvas bounds
export const CANVAS_BOUNDS = {
  MIN_X: 0,
  MIN_Y: 0,
  MAX_X: CANVAS_WIDTH,
  MAX_Y: CANVAS_HEIGHT
} as const
