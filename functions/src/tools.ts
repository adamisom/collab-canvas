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
  description: "Create a single rectangle on the canvas at specified position with given dimensions and color. If position not specified, creates at viewport center.",
  inputSchema: z.object({
    x: z.number().min(CANVAS_BOUNDS.MIN_X).max(CANVAS_BOUNDS.MAX_X).optional().describe(PARAM_DESCRIPTIONS.X_COORD),
    y: z.number().min(CANVAS_BOUNDS.MIN_Y).max(CANVAS_BOUNDS.MAX_Y).optional().describe(PARAM_DESCRIPTIONS.Y_COORD),
    width: z.number().min(RECTANGLE_CONSTRAINTS.MIN_WIDTH).max(RECTANGLE_CONSTRAINTS.MAX_WIDTH).optional().describe(PARAM_DESCRIPTIONS.WIDTH),
    height: z.number().min(RECTANGLE_CONSTRAINTS.MIN_HEIGHT).max(RECTANGLE_CONSTRAINTS.MAX_HEIGHT).optional().describe(PARAM_DESCRIPTIONS.HEIGHT),
    color: z.enum(VALID_RECTANGLE_COLORS).optional().describe(PARAM_DESCRIPTIONS.COLOR),
  }),
});

/**
 * Tool 2: Change color of existing rectangle
 */
export const changeColorTool = tool({
  description: "Change the color of an existing rectangle. Requires a rectangle to be selected.",
  inputSchema: z.object({
    shapeId: z.string().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
    color: z.enum(VALID_RECTANGLE_COLORS).describe(PARAM_DESCRIPTIONS.COLOR),
  }),
});

/**
 * Tool 3: Move rectangle to new position
 */
export const moveRectangleTool = tool({
  description: "Move an existing rectangle to a new position. Requires a rectangle to be selected.",
  inputSchema: z.object({
    shapeId: z.string().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
    x: z.number().min(CANVAS_BOUNDS.MIN_X).max(CANVAS_BOUNDS.MAX_X).describe(PARAM_DESCRIPTIONS.X_COORD),
    y: z.number().min(CANVAS_BOUNDS.MIN_Y).max(CANVAS_BOUNDS.MAX_Y).describe(PARAM_DESCRIPTIONS.Y_COORD),
  }),
});

/**
 * Tool 4: Resize existing rectangle
 */
export const resizeRectangleTool = tool({
  description: "Resize an existing rectangle. Requires a rectangle to be selected.",
  inputSchema: z.object({
    shapeId: z.string().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
    width: z.number().min(RECTANGLE_CONSTRAINTS.MIN_WIDTH).max(RECTANGLE_CONSTRAINTS.MAX_WIDTH).describe(PARAM_DESCRIPTIONS.WIDTH),
    height: z.number().min(RECTANGLE_CONSTRAINTS.MIN_HEIGHT).max(RECTANGLE_CONSTRAINTS.MAX_HEIGHT).describe(PARAM_DESCRIPTIONS.HEIGHT),
  }),
});

/**
 * Tool 5: Delete existing rectangle
 */
export const deleteRectangleTool = tool({
  description: "Delete an existing rectangle. Requires a rectangle to be selected.",
  inputSchema: z.object({
    shapeId: z.string().describe(PARAM_DESCRIPTIONS.SHAPE_ID),
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
 * Export all tools as an object
 */
export const tools = {
  createRectangle: createRectangleTool,
  changeColor: changeColorTool,
  moveRectangle: moveRectangleTool,
  resizeRectangle: resizeRectangleTool,
  deleteRectangle: deleteRectangleTool,
  createMultipleRectangles: createMultipleRectanglesTool,
};
