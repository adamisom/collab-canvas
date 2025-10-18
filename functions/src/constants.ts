/**
 * Constants for AI Canvas Agent Cloud Functions
 * These should match client-side constraints in src/utils/constants.ts
 */

// Canvas bounds
export const CANVAS_BOUNDS = {
  MIN_X: 0,
  MIN_Y: 0,
  MAX_X: 3000,
  MAX_Y: 3000,
} as const;

// Rectangle size constraints
export const RECTANGLE_CONSTRAINTS = {
  MIN_WIDTH: 20,
  MIN_HEIGHT: 20,
  MAX_WIDTH: 3000,
  MAX_HEIGHT: 3000,
  DEFAULT_WIDTH: 100,
  DEFAULT_HEIGHT: 80,
} as const;

// Batch creation constraints
export const BATCH_CONSTRAINTS = {
  MIN_COUNT: 1,
  MAX_COUNT: 50,
  MIN_OFFSET: 10,
  MAX_OFFSET: 100,
  DEFAULT_OFFSET: 25,
} as const;

// Tool parameter descriptions
export const PARAM_DESCRIPTIONS = {
  X_COORD: `X coordinate (${CANVAS_BOUNDS.MIN_X}-${CANVAS_BOUNDS.MAX_X})`,
  Y_COORD: `Y coordinate (${CANVAS_BOUNDS.MIN_Y}-${CANVAS_BOUNDS.MAX_Y})`,
  WIDTH: `Width in pixels (${RECTANGLE_CONSTRAINTS.MIN_WIDTH}-${RECTANGLE_CONSTRAINTS.MAX_WIDTH}, default ${RECTANGLE_CONSTRAINTS.DEFAULT_WIDTH})`,
  HEIGHT: `Height in pixels (${RECTANGLE_CONSTRAINTS.MIN_HEIGHT}-${RECTANGLE_CONSTRAINTS.MAX_HEIGHT}, default ${RECTANGLE_CONSTRAINTS.DEFAULT_HEIGHT})`,
  COLOR: "Color hex code: #ef4444 (red), #3b82f6 (blue), or #22c55e (green)",
  SHAPE_ID: "ID of the rectangle to modify",
  COUNT: `Number of rectangles to create (${BATCH_CONSTRAINTS.MIN_COUNT}-${BATCH_CONSTRAINTS.MAX_COUNT})`,
  LAYOUT: "Layout pattern: row, column, or grid",
  OFFSET: `Spacing between rectangles in pixels (${BATCH_CONSTRAINTS.MIN_OFFSET}-${BATCH_CONSTRAINTS.MAX_OFFSET}, default ${BATCH_CONSTRAINTS.DEFAULT_OFFSET})`,
} as const;

