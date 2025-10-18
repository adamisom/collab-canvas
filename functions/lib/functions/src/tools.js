"use strict";
/**
 * Tool definitions for AI Canvas Agent
 * Defines the 6 canvas manipulation tools using Zod schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = exports.createMultipleRectanglesTool = exports.deleteRectangleTool = exports.resizeRectangleTool = exports.moveRectangleTool = exports.changeColorTool = exports.createRectangleTool = void 0;
const ai_1 = require("ai");
const zod_1 = require("zod");
const types_1 = require("../../src/shared/types");
const constants_1 = require("./constants");
/**
 * Tool 1: Create a single rectangle
 */
exports.createRectangleTool = (0, ai_1.tool)({
    description: "Create a single rectangle on the canvas. Position defaults to viewport center if not specified. Color defaults to blue if not specified.",
    inputSchema: zod_1.z.object({
        x: zod_1.z.number().min(constants_1.CANVAS_BOUNDS.MIN_X).max(constants_1.CANVAS_BOUNDS.MAX_X).optional().describe(constants_1.PARAM_DESCRIPTIONS.X_COORD),
        y: zod_1.z.number().min(constants_1.CANVAS_BOUNDS.MIN_Y).max(constants_1.CANVAS_BOUNDS.MAX_Y).optional().describe(constants_1.PARAM_DESCRIPTIONS.Y_COORD),
        width: zod_1.z.number().min(constants_1.RECTANGLE_CONSTRAINTS.MIN_WIDTH).max(constants_1.RECTANGLE_CONSTRAINTS.MAX_WIDTH).optional().describe(constants_1.PARAM_DESCRIPTIONS.WIDTH),
        height: zod_1.z.number().min(constants_1.RECTANGLE_CONSTRAINTS.MIN_HEIGHT).max(constants_1.RECTANGLE_CONSTRAINTS.MAX_HEIGHT).optional().describe(constants_1.PARAM_DESCRIPTIONS.HEIGHT),
        color: zod_1.z.enum(types_1.VALID_RECTANGLE_COLORS).optional().describe(constants_1.PARAM_DESCRIPTIONS.COLOR + " (defaults to blue)"),
    }),
});
/**
 * Tool 2: Change color of existing rectangle
 */
exports.changeColorTool = (0, ai_1.tool)({
    description: "Change the color of an existing rectangle. Requires a rectangle to be selected.",
    inputSchema: zod_1.z.object({
        shapeId: zod_1.z.string().optional().describe(constants_1.PARAM_DESCRIPTIONS.SHAPE_ID),
        color: zod_1.z.enum(types_1.VALID_RECTANGLE_COLORS).describe(constants_1.PARAM_DESCRIPTIONS.COLOR),
    }),
});
/**
 * Tool 3: Move rectangle to new position
 */
exports.moveRectangleTool = (0, ai_1.tool)({
    description: "Move an existing rectangle to a new position. Requires a rectangle to be selected.",
    inputSchema: zod_1.z.object({
        shapeId: zod_1.z.string().optional().describe(constants_1.PARAM_DESCRIPTIONS.SHAPE_ID),
        x: zod_1.z.number().min(constants_1.CANVAS_BOUNDS.MIN_X).max(constants_1.CANVAS_BOUNDS.MAX_X).describe(constants_1.PARAM_DESCRIPTIONS.X_COORD),
        y: zod_1.z.number().min(constants_1.CANVAS_BOUNDS.MIN_Y).max(constants_1.CANVAS_BOUNDS.MAX_Y).describe(constants_1.PARAM_DESCRIPTIONS.Y_COORD),
    }),
});
/**
 * Tool 4: Resize existing rectangle
 */
exports.resizeRectangleTool = (0, ai_1.tool)({
    description: "Resize an existing rectangle. Requires a rectangle to be selected. Provide width and/or height to resize.",
    inputSchema: zod_1.z.object({
        shapeId: zod_1.z.string().optional().describe(constants_1.PARAM_DESCRIPTIONS.SHAPE_ID),
        width: zod_1.z.number().min(constants_1.RECTANGLE_CONSTRAINTS.MIN_WIDTH).max(constants_1.RECTANGLE_CONSTRAINTS.MAX_WIDTH).optional().describe(constants_1.PARAM_DESCRIPTIONS.WIDTH),
        height: zod_1.z.number().min(constants_1.RECTANGLE_CONSTRAINTS.MIN_HEIGHT).max(constants_1.RECTANGLE_CONSTRAINTS.MAX_HEIGHT).optional().describe(constants_1.PARAM_DESCRIPTIONS.HEIGHT),
    }),
});
/**
 * Tool 5: Delete existing rectangle
 */
exports.deleteRectangleTool = (0, ai_1.tool)({
    description: "Delete an existing rectangle. Requires a rectangle to be selected.",
    inputSchema: zod_1.z.object({
        shapeId: zod_1.z.string().optional().describe(constants_1.PARAM_DESCRIPTIONS.SHAPE_ID),
    }),
});
/**
 * Tool 6: Create multiple rectangles at once
 */
exports.createMultipleRectanglesTool = (0, ai_1.tool)({
    description: `Create multiple rectangles at once with automatic spacing. Maximum ${constants_1.BATCH_CONSTRAINTS.MAX_COUNT} rectangles.`,
    inputSchema: zod_1.z.object({
        count: zod_1.z.number().min(constants_1.BATCH_CONSTRAINTS.MIN_COUNT).max(constants_1.BATCH_CONSTRAINTS.MAX_COUNT).describe(constants_1.PARAM_DESCRIPTIONS.COUNT),
        color: zod_1.z.enum(types_1.VALID_RECTANGLE_COLORS).describe(constants_1.PARAM_DESCRIPTIONS.COLOR),
        layout: zod_1.z.enum(["row", "column", "grid"]).optional().describe(constants_1.PARAM_DESCRIPTIONS.LAYOUT),
        offsetPixels: zod_1.z.number().min(constants_1.BATCH_CONSTRAINTS.MIN_OFFSET).max(constants_1.BATCH_CONSTRAINTS.MAX_OFFSET).optional().describe(constants_1.PARAM_DESCRIPTIONS.OFFSET),
    }),
});
/**
 * Export all tools as an object
 */
exports.tools = {
    createRectangle: exports.createRectangleTool,
    changeColor: exports.changeColorTool,
    moveRectangle: exports.moveRectangleTool,
    resizeRectangle: exports.resizeRectangleTool,
    deleteRectangle: exports.deleteRectangleTool,
    createMultipleRectangles: exports.createMultipleRectanglesTool,
};
//# sourceMappingURL=tools.js.map