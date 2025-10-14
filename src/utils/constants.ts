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

// Resize handle properties
export const RESIZE_HANDLE = {
  SIZE: 8,
  FILL: '#ffffff',
  STROKE: '#ef4444',
  STROKE_WIDTH: 2,
  HOVER_FILL: '#ef4444',
  HOVER_STROKE: '#dc2626'
} as const

// Rectangle size constraints
export const RECTANGLE_CONSTRAINTS = {
  MIN_WIDTH: 20,
  MIN_HEIGHT: 20,
  MAX_WIDTH: CANVAS_WIDTH,
  MAX_HEIGHT: CANVAS_HEIGHT
} as const

// Resize directions
export const RESIZE_DIRECTIONS = {
  TOP_LEFT: 'tl',
  TOP_CENTER: 'tc', 
  TOP_RIGHT: 'tr',
  MIDDLE_LEFT: 'ml',
  MIDDLE_RIGHT: 'mr',
  BOTTOM_LEFT: 'bl',
  BOTTOM_CENTER: 'bc',
  BOTTOM_RIGHT: 'br'
} as const

// Canvas bounds
export const CANVAS_BOUNDS = {
  MIN_X: 0,
  MIN_Y: 0,
  MAX_X: CANVAS_WIDTH,
  MAX_Y: CANVAS_HEIGHT
} as const
