import { VALID_RECTANGLE_COLORS } from '../shared/types'

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

// Rectangle color options
export const RECTANGLE_COLORS = {
  RED: '#ef4444',
  BLUE: '#3b82f6', 
  GREEN: '#22c55e'
} as const

export const RECTANGLE_COLOR_OPTIONS = [
  { name: 'Red', value: RECTANGLE_COLORS.RED },
  { name: 'Blue', value: RECTANGLE_COLORS.BLUE },
  { name: 'Green', value: RECTANGLE_COLORS.GREEN }
] as const

// Darker border colors for each rectangle color
export const RECTANGLE_BORDER_COLORS = {
  [RECTANGLE_COLORS.RED]: '#dc2626',    // Darker red
  [RECTANGLE_COLORS.BLUE]: '#1d4ed8',   // Darker blue  
  [RECTANGLE_COLORS.GREEN]: '#16a34a'   // Darker green
} as const

// Function to get border color for a rectangle fill color
export const getRectangleBorderColor = (fillColor: string): string => {
  return RECTANGLE_BORDER_COLORS[fillColor as keyof typeof RECTANGLE_BORDER_COLORS] || '#374151'
}

// Default rectangle properties
export const DEFAULT_RECT = {
  WIDTH: 100,
  HEIGHT: 80,
  FILL: RECTANGLE_COLORS.BLUE,
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

// AI Agent constants
export const AI_CONSTANTS = {
  MAX_CANVAS_RECTANGLES: 1000,
  MAX_USER_COMMANDS: 1000,
  DEFAULT_BATCH_OFFSET: 25,
  MIN_BATCH_OFFSET: 10,
  MAX_BATCH_OFFSET: 100,
  MAX_BATCH_COUNT: 50
} as const

// Valid colors for AI commands (imported from shared types to ensure consistency with Cloud Function)
export const VALID_AI_COLORS = VALID_RECTANGLE_COLORS
