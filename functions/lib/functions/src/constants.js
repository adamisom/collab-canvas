"use strict";
/**
 * Constants for AI Canvas Agent Cloud Functions
 * These should match client-side constraints in src/utils/constants.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARAM_DESCRIPTIONS = exports.BATCH_CONSTRAINTS = exports.RECTANGLE_CONSTRAINTS = exports.CANVAS_BOUNDS = void 0;
// Canvas bounds
exports.CANVAS_BOUNDS = {
    MIN_X: 0,
    MIN_Y: 0,
    MAX_X: 3000,
    MAX_Y: 3000,
};
// Rectangle size constraints
exports.RECTANGLE_CONSTRAINTS = {
    MIN_WIDTH: 20,
    MIN_HEIGHT: 20,
    MAX_WIDTH: 3000,
    MAX_HEIGHT: 3000,
    DEFAULT_WIDTH: 100,
    DEFAULT_HEIGHT: 80,
};
// Batch creation constraints
exports.BATCH_CONSTRAINTS = {
    MIN_COUNT: 1,
    MAX_COUNT: 50,
    MIN_OFFSET: 10,
    MAX_OFFSET: 100,
    DEFAULT_OFFSET: 25,
};
// Tool parameter descriptions
exports.PARAM_DESCRIPTIONS = {
    X_COORD: `X coordinate (${exports.CANVAS_BOUNDS.MIN_X}-${exports.CANVAS_BOUNDS.MAX_X})`,
    Y_COORD: `Y coordinate (${exports.CANVAS_BOUNDS.MIN_Y}-${exports.CANVAS_BOUNDS.MAX_Y})`,
    WIDTH: `Width in pixels (${exports.RECTANGLE_CONSTRAINTS.MIN_WIDTH}-${exports.RECTANGLE_CONSTRAINTS.MAX_WIDTH}, default ${exports.RECTANGLE_CONSTRAINTS.DEFAULT_WIDTH})`,
    HEIGHT: `Height in pixels (${exports.RECTANGLE_CONSTRAINTS.MIN_HEIGHT}-${exports.RECTANGLE_CONSTRAINTS.MAX_HEIGHT}, default ${exports.RECTANGLE_CONSTRAINTS.DEFAULT_HEIGHT})`,
    COLOR: "Color hex code: #ef4444 (red), #3b82f6 (blue), or #22c55e (green)",
    SHAPE_ID: "ID of the rectangle to modify",
    COUNT: `Number of rectangles to create (${exports.BATCH_CONSTRAINTS.MIN_COUNT}-${exports.BATCH_CONSTRAINTS.MAX_COUNT})`,
    LAYOUT: "Layout pattern: row, column, or grid",
    OFFSET: `Spacing between rectangles in pixels (${exports.BATCH_CONSTRAINTS.MIN_OFFSET}-${exports.BATCH_CONSTRAINTS.MAX_OFFSET}, default ${exports.BATCH_CONSTRAINTS.DEFAULT_OFFSET})`,
};
//# sourceMappingURL=constants.js.map