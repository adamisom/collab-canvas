/**
 * Tool definitions for AI Canvas Agent
 * Defines the 6 canvas manipulation tools using Zod schemas
 */

import {tool} from "ai";
import {z} from "zod";

// Valid colors - must match client-side RECTANGLE_COLORS
const VALID_COLORS = ["#ef4444", "#3b82f6", "#22c55e"] as const;

/**
 * Tool 1: Create a single rectangle
 */
export const createRectangleTool = tool({
  description: "Create a single rectangle on the canvas at specified position with given dimensions and color",
  inputSchema: z.object({
    x: z.number().describe("X coordinate (0-3000)"),
    y: z.number().describe("Y coordinate (0-3000)"),
    width: z.number().describe("Width in pixels (20-3000, default 100)"),
    height: z.number().describe("Height in pixels (20-3000, default 80)"),
    color: z.enum(VALID_COLORS).describe("Color hex code: #ef4444 (red), #3b82f6 (blue), or #22c55e (green)"),
  }),
});

/**
 * Tool 2: Change color of existing rectangle
 */
export const changeColorTool = tool({
  description: "Change the color of an existing rectangle. Requires a rectangle to be selected.",
  inputSchema: z.object({
    shapeId: z.string().describe("ID of the rectangle to modify"),
    color: z.enum(VALID_COLORS).describe("New color hex code: #ef4444 (red), #3b82f6 (blue), or #22c55e (green)"),
  }),
});

/**
 * Tool 3: Move rectangle to new position
 */
export const moveRectangleTool = tool({
  description: "Move an existing rectangle to a new position. Requires a rectangle to be selected.",
  inputSchema: z.object({
    shapeId: z.string().describe("ID of the rectangle to move"),
    x: z.number().describe("New X coordinate (0-3000)"),
    y: z.number().describe("New Y coordinate (0-3000)"),
  }),
});

/**
 * Tool 4: Resize existing rectangle
 */
export const resizeRectangleTool = tool({
  description: "Resize an existing rectangle. Requires a rectangle to be selected.",
  inputSchema: z.object({
    shapeId: z.string().describe("ID of the rectangle to resize"),
    width: z.number().describe("New width in pixels (20-3000)"),
    height: z.number().describe("New height in pixels (20-3000)"),
  }),
});

/**
 * Tool 5: Delete existing rectangle
 */
export const deleteRectangleTool = tool({
  description: "Delete an existing rectangle. Requires a rectangle to be selected.",
  inputSchema: z.object({
    shapeId: z.string().describe("ID of the rectangle to delete"),
  }),
});

/**
 * Tool 6: Create multiple rectangles at once
 */
export const createMultipleRectanglesTool = tool({
  description: "Create multiple rectangles at once with automatic spacing. Maximum 50 rectangles.",
  inputSchema: z.object({
    count: z.number().min(1).max(50).describe("Number of rectangles to create (1-50)"),
    color: z.enum(VALID_COLORS).describe("Color hex code: #ef4444 (red), #3b82f6 (blue), or #22c55e (green)"),
    layout: z.enum(["row", "column", "grid"]).optional().describe("Layout pattern: row, column, or grid"),
    offsetPixels: z.number().min(10).max(100).optional().describe("Spacing between rectangles in pixels (10-100, default 25)"),
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
