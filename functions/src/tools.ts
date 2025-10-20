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
 * Tool 2: Change color of existing rectangle
 */
export const changeColorTool = tool({
  description: "Change the color of an existing rectangle. Requires a rectangle to be selected.",
  inputSchema: z.object({
    shapeId: z.string().optional().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
    color: z.enum(VALID_RECTANGLE_COLORS).describe(PARAM_DESCRIPTIONS.COLOR),
  }),
});

/**
 * Tool 3: Move rectangle to new position
 */
export const moveRectangleTool = tool({
  description: "Move an existing rectangle to a new position. Requires a rectangle to be selected.",
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
 * Tool 5: Delete existing rectangle
 */
export const deleteRectangleTool = tool({
  description: "Delete an existing rectangle. Requires a rectangle to be selected.",
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
 * Tool 7: Duplicate existing rectangle
 */
export const duplicateRectangleTool = tool({
  description: "Duplicate the currently selected rectangle with a slight offset. Creates a copy of the rectangle 20 pixels offset from the original.",
  inputSchema: z.object({
    shapeId: z.string().optional().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
  }),
});

/**
 * Tool 8: Bring rectangle to front
 */
export const bringToFrontTool = tool({
  description: "Bring the selected rectangle to the front (on top of all other rectangles). Requires a rectangle to be selected.",
  inputSchema: z.object({
    shapeId: z.string().optional().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
  }),
});

/**
 * Tool 9: Send rectangle to back
 */
export const sendToBackTool = tool({
  description: "Send the selected rectangle to the back (behind all other rectangles). Requires a rectangle to be selected.",
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
 * Export all tools as an object
 */
export const tools = {
  createRectangle: createRectangleTool,
  changeColor: changeColorTool,
  moveRectangle: moveRectangleTool,
  resizeRectangle: resizeRectangleTool,
  deleteRectangle: deleteRectangleTool,
  createMultipleRectangles: createMultipleRectanglesTool,
  duplicateRectangle: duplicateRectangleTool,
  bringToFront: bringToFrontTool,
  sendToBack: sendToBackTool,
  alignShapes: alignShapesTool,
  selectAllOfType: selectAllOfTypeTool,
  rotateShape: rotateShapeTool,
  changeColorBatch: changeColorBatchTool,
  resizeBatch: resizeBatchTool,
  deleteBatch: deleteBatchTool,
};
