/**
 * Tool definitions for AI Canvas Agent
 * Defines the 6 canvas manipulation tools using Zod schemas
 */

import {tool} from "ai";
import {z} from "zod";
import {VALID_RECTANGLE_COLORS} from "../../src/shared/types";
import {
  CANVAS_BOUNDS,
  RECTANGLE_CONSTRAINTS,
  BATCH_CONSTRAINTS,
  PARAM_DESCRIPTIONS,
} from "./constants";

/**
 * Tool 1: Create a single rectangle
 */
export const createRectangleTool = tool({
  description: "Create a single rectangle on the canvas. Position defaults to viewport center if not specified. Color defaults to blue if not specified.",
  inputSchema: z.object({
    x: z.number().min(CANVAS_BOUNDS.MIN_X).max(CANVAS_BOUNDS.MAX_X).optional().describe(PARAM_DESCRIPTIONS.X_COORD),
    y: z.number().min(CANVAS_BOUNDS.MIN_Y).max(CANVAS_BOUNDS.MAX_Y).optional().describe(PARAM_DESCRIPTIONS.Y_COORD),
    width: z.number().min(RECTANGLE_CONSTRAINTS.MIN_WIDTH).max(RECTANGLE_CONSTRAINTS.MAX_WIDTH).optional().describe(PARAM_DESCRIPTIONS.WIDTH),
    height: z.number().min(RECTANGLE_CONSTRAINTS.MIN_HEIGHT).max(RECTANGLE_CONSTRAINTS.MAX_HEIGHT).optional().describe(PARAM_DESCRIPTIONS.HEIGHT),
    color: z.enum(VALID_RECTANGLE_COLORS).optional().describe(PARAM_DESCRIPTIONS.COLOR + " (defaults to blue)"),
  }),
});

/**
 * Tool 2: Change color of any selected shape
 */
export const changeColorTool = tool({
  description: "Change the color of any selected shape (rectangle, circle, line, or text). Works on single or multiple selections.",
  inputSchema: z.object({
    shapeId: z.string().optional().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
    color: z.enum(VALID_RECTANGLE_COLORS).describe(PARAM_DESCRIPTIONS.COLOR),
  }),
});

/**
 * Tool 3: Move shape to new absolute position
 */
export const moveShapeTool = tool({
  description: "Move any selected shape (rectangle, circle, line, text) to a new absolute position. Requires a shape to be selected.",
  inputSchema: z.object({
    shapeId: z.string().optional().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
    x: z.number().min(CANVAS_BOUNDS.MIN_X).max(CANVAS_BOUNDS.MAX_X).describe(PARAM_DESCRIPTIONS.X_COORD),
    y: z.number().min(CANVAS_BOUNDS.MIN_Y).max(CANVAS_BOUNDS.MAX_Y).describe(PARAM_DESCRIPTIONS.Y_COORD),
  }),
});

/**
 * Tool 4: Resize existing rectangle
 */
export const resizeRectangleTool = tool({
  description: "Resize an existing rectangle. Requires a rectangle to be selected. Provide width and/or height to resize.",
  inputSchema: z.object({
    shapeId: z.string().optional().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
    width: z.number().min(RECTANGLE_CONSTRAINTS.MIN_WIDTH).max(RECTANGLE_CONSTRAINTS.MAX_WIDTH).optional().describe(PARAM_DESCRIPTIONS.WIDTH),
    height: z.number().min(RECTANGLE_CONSTRAINTS.MIN_HEIGHT).max(RECTANGLE_CONSTRAINTS.MAX_HEIGHT).optional().describe(PARAM_DESCRIPTIONS.HEIGHT),
  }),
});

/**
 * Tool 5: Delete existing shape
 */
export const deleteShapeTool = tool({
  description: "Delete any selected shape (rectangle, circle, line, text). Requires a shape to be selected.",
  inputSchema: z.object({
    shapeId: z.string().optional().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
  }),
});

/**
 * Tool 6: Create multiple rectangles at once
 */
export const createMultipleRectanglesTool = tool({
  description: `Create multiple rectangles at once with automatic spacing. Maximum ${BATCH_CONSTRAINTS.MAX_COUNT} rectangles.`,
  inputSchema: z.object({
    count: z.number().min(BATCH_CONSTRAINTS.MIN_COUNT).max(BATCH_CONSTRAINTS.MAX_COUNT).describe(PARAM_DESCRIPTIONS.COUNT),
    color: z.enum(VALID_RECTANGLE_COLORS).describe(PARAM_DESCRIPTIONS.COLOR),
    layout: z.enum(["row", "column", "grid"]).optional().describe(PARAM_DESCRIPTIONS.LAYOUT),
    offsetPixels: z.number().min(BATCH_CONSTRAINTS.MIN_OFFSET).max(BATCH_CONSTRAINTS.MAX_OFFSET).optional().describe(PARAM_DESCRIPTIONS.OFFSET),
  }),
});

/**
 * Tool 7: Duplicate existing shape
 */
export const duplicateShapeTool = tool({
  description: "Duplicate any selected shape (rectangle, circle, line, text) with a slight offset. Creates a copy of the shape 20 pixels offset from the original.",
  inputSchema: z.object({
    shapeId: z.string().optional().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
  }),
});

/**
 * Tool 8: Bring shape to front
 */
export const bringToFrontTool = tool({
  description: "Bring any selected shape (rectangle, circle, line, text) to the front (on top of all other shapes). Requires a shape to be selected.",
  inputSchema: z.object({
    shapeId: z.string().optional().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
  }),
});

/**
 * Tool 9: Send shape to back
 */
export const sendToBackTool = tool({
  description: "Send any selected shape (rectangle, circle, line, text) to the back (behind all other shapes). Requires a shape to be selected.",
  inputSchema: z.object({
    shapeId: z.string().optional().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
  }),
});

/**
 * Tool 10: Align selected shapes (Phase 3D)
 */
export const alignShapesTool = tool({
  description: "Align multiple selected shapes (requires 2+ shapes selected). Use for aligning edges or centers, or distributing shapes evenly.",
  inputSchema: z.object({
    alignType: z.enum([
      "left", "center-horizontal", "right",
      "top", "center-vertical", "bottom",
      "distribute-horizontal", "distribute-vertical",
    ]).describe("How to align the shapes. Use 'center-horizontal' for horizontal centering, 'distribute-horizontal' for even spacing left-to-right"),
  }),
});

/**
 * Tool 11: Select all shapes of a type (Phase 3D)
 */
export const selectAllOfTypeTool = tool({
  description: "Select all shapes of a specific type on the canvas (rectangle, circle, line, or text). Useful when user wants to select all instances of a shape type.",
  inputSchema: z.object({
    shapeType: z.enum(["rectangle", "circle", "line", "text"]).describe("The type of shape to select"),
  }),
});

/**
 * Tool 11b: Select shapes by color (Phase 3F)
 */
export const selectShapesByColorTool = tool({
  description: "Select all shapes of a specific color on the canvas. Works across all shape types (rectangles, circles, lines, text).",
  inputSchema: z.object({
    color: z.enum(VALID_RECTANGLE_COLORS).describe("The color to filter by: red (#ef4444), blue (#3b82f6), or green (#22c55e)"),
  }),
});

/**
 * Tool 11c: Clear selection / Deselect all (Phase 3F)
 */
export const clearSelectionTool = tool({
  description: "Clear all selections / deselect everything on the canvas. Use when user wants to deselect all shapes.",
  inputSchema: z.object({}), // No parameters needed
});

/**
 * Tool 12: Rotate shape (Phase 3D)
 */
export const rotateShapeTool = tool({
  description: "Rotate the selected shape by a specified angle in degrees. Requires a shape to be selected. Positive angles rotate clockwise.",
  inputSchema: z.object({
    angle: z.number().min(-360).max(360).describe("Rotation angle in degrees (positive = clockwise, negative = counter-clockwise)"),
  }),
});

/**
 * Tool 13: Change color of all selected shapes (Batch)
 */
export const changeColorBatchTool = tool({
  description: "Change the color of ALL currently selected shapes at once. Works with multiple shapes. Requires at least one shape to be selected.",
  inputSchema: z.object({
    color: z.enum(VALID_RECTANGLE_COLORS).describe(PARAM_DESCRIPTIONS.COLOR),
  }),
});

/**
 * Tool 14: Resize all selected shapes (Batch)
 */
export const resizeBatchTool = tool({
  description: "Resize ALL currently selected rectangles at once. Works with multiple rectangles. Provide width and/or height to resize all to the same size.",
  inputSchema: z.object({
    width: z.number().min(RECTANGLE_CONSTRAINTS.MIN_WIDTH).max(RECTANGLE_CONSTRAINTS.MAX_WIDTH).optional().describe(PARAM_DESCRIPTIONS.WIDTH),
    height: z.number().min(RECTANGLE_CONSTRAINTS.MIN_HEIGHT).max(RECTANGLE_CONSTRAINTS.MAX_HEIGHT).optional().describe(PARAM_DESCRIPTIONS.HEIGHT),
  }),
});

/**
 * Tool 15: Delete all selected shapes (Batch)
 */
export const deleteBatchTool = tool({
  description: "Delete ALL currently selected shapes at once. Works with multiple shapes of any type. Requires at least one shape to be selected.",
  inputSchema: z.object({}), // No parameters needed
});

/**
 * Tool 16: Rotate all selected shapes (Batch)
 */
export const rotateBatchTool = tool({
  description: "Rotate ALL currently selected shapes at once. Works with multiple shapes of any type. Positive angles rotate clockwise.",
  inputSchema: z.object({
    angle: z.number().min(-360).max(360).describe("Rotation angle in degrees (positive = clockwise, negative = counter-clockwise)"),
  }),
});

/**
 * Tool 17: Move all selected shapes (Batch)
 */
export const moveBatchTool = tool({
  description: "Move ALL currently selected shapes by a relative offset. Use positive/negative values for dx/dy to move right/left or down/up.",
  inputSchema: z.object({
    dx: z.number().describe("Horizontal offset in pixels (positive = right, negative = left)"),
    dy: z.number().describe("Vertical offset in pixels (positive = down, negative = up)"),
  }),
});

/**
 * Tool 18: Create a circle (Phase 3C)
 */
export const createCircleTool = tool({
  description: "Create a circle on the canvas. Position defaults to viewport center if not specified. Color defaults to blue if not specified.",
  inputSchema: z.object({
    x: z.number().min(CANVAS_BOUNDS.MIN_X).max(CANVAS_BOUNDS.MAX_X).optional().describe(PARAM_DESCRIPTIONS.X_COORD),
    y: z.number().min(CANVAS_BOUNDS.MIN_Y).max(CANVAS_BOUNDS.MAX_Y).optional().describe(PARAM_DESCRIPTIONS.Y_COORD),
    radius: z.number().min(10).max(500).optional().describe("Radius of the circle in pixels. Defaults to 50."),
    color: z.enum(VALID_RECTANGLE_COLORS).optional().describe(PARAM_DESCRIPTIONS.COLOR + " (defaults to blue)"),
  }),
});

/**
 * Tool 17: Create a line (Phase 3C)
 */
export const createLineTool = tool({
  description: "Create a line on the canvas. Requires start and end coordinates. Color defaults to blue if not specified.",
  inputSchema: z.object({
    x: z.number().min(CANVAS_BOUNDS.MIN_X).max(CANVAS_BOUNDS.MAX_X).describe("X coordinate of the line's start point"),
    y: z.number().min(CANVAS_BOUNDS.MIN_Y).max(CANVAS_BOUNDS.MAX_Y).describe("Y coordinate of the line's start point"),
    endX: z.number().min(CANVAS_BOUNDS.MIN_X).max(CANVAS_BOUNDS.MAX_X).describe("X coordinate of the line's end point"),
    endY: z.number().min(CANVAS_BOUNDS.MIN_Y).max(CANVAS_BOUNDS.MAX_Y).describe("Y coordinate of the line's end point"),
    color: z.enum(VALID_RECTANGLE_COLORS).optional().describe(PARAM_DESCRIPTIONS.COLOR + " (defaults to blue)"),
  }),
});

/**
 * Tool 18: Create text (Phase 3C)
 */
export const createTextTool = tool({
  description: "Create text on the canvas. Position defaults to viewport center if not specified. Color defaults to blue if not specified.",
  inputSchema: z.object({
    x: z.number().min(CANVAS_BOUNDS.MIN_X).max(CANVAS_BOUNDS.MAX_X).optional().describe(PARAM_DESCRIPTIONS.X_COORD),
    y: z.number().min(CANVAS_BOUNDS.MIN_Y).max(CANVAS_BOUNDS.MAX_Y).optional().describe(PARAM_DESCRIPTIONS.Y_COORD),
    text: z.string().min(1).max(200).describe("The text content (max 200 characters)"),
    fontSize: z.number().min(8).max(72).optional().describe("Font size in pixels. Defaults to 16."),
    color: z.enum(VALID_RECTANGLE_COLORS).optional().describe(PARAM_DESCRIPTIONS.COLOR + " (defaults to blue)"),
  }),
});

/**
 * Tool 19: Change text content (Phase 3C)
 */
export const updateTextContentTool = tool({
  description: "Update the text content of the selected text shape. Requires a text shape to be selected.",
  inputSchema: z.object({
    text: z.string().min(1).max(200).describe("The new text content (max 200 characters)"),
  }),
});

/**
 * Tool 20: Change text font size (Phase 3C)
 */
export const updateTextFontSizeTool = tool({
  description: "Change the font size of the selected text shape. Requires a text shape to be selected.",
  inputSchema: z.object({
    fontSize: z.number().min(8).max(72).describe("New font size in pixels"),
  }),
});

/**
 * Tool 21: Toggle text bold (Phase 3C)
 */
export const toggleTextBoldTool = tool({
  description: "Toggle bold formatting on the selected text shape. Requires a text shape to be selected.",
  inputSchema: z.object({}), // No parameters needed
});

/**
 * Tool 22: Toggle text italic (Phase 3C)
 */
export const toggleTextItalicTool = tool({
  description: "Toggle italic formatting on the selected text shape. Requires a text shape to be selected.",
  inputSchema: z.object({}), // No parameters needed
});

/**
 * Export all tools as an object
 */
export const tools = {
  createRectangle: createRectangleTool,
  changeColor: changeColorTool,
  moveShape: moveShapeTool, // Renamed from moveRectangle - works on all shapes
  resizeRectangle: resizeRectangleTool, // Still rectangle-only
  deleteShape: deleteShapeTool, // Renamed from deleteRectangle - works on all shapes
  createMultipleRectangles: createMultipleRectanglesTool,
  duplicateShape: duplicateShapeTool, // Renamed from duplicateRectangle - works on all shapes
  bringToFront: bringToFrontTool,
  sendToBack: sendToBackTool,
  alignShapes: alignShapesTool,
  selectAllOfType: selectAllOfTypeTool,
  selectShapesByColor: selectShapesByColorTool,
  clearSelection: clearSelectionTool,
  rotateShape: rotateShapeTool,
  changeColorBatch: changeColorBatchTool,
  resizeBatch: resizeBatchTool,
  deleteBatch: deleteBatchTool,
  rotateBatch: rotateBatchTool,
  moveBatch: moveBatchTool,
  createCircle: createCircleTool,
  createLine: createLineTool,
  createText: createTextTool,
  updateTextContent: updateTextContentTool,
  updateTextFontSize: updateTextFontSizeTool,
  toggleTextBold: toggleTextBoldTool,
  toggleTextItalic: toggleTextItalicTool,
};
