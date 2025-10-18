/**
 * TypeScript interfaces for AI Canvas Agent
 * These types must match exactly with client-side types in /src/types/ai.ts
 */

export interface CanvasState {
  rectangles: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
  }>;
}

export interface ViewportInfo {
  centerX: number;
  centerY: number;
  zoom: number;
  visibleBounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

export interface SelectedShape {
  id: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessAICommandRequest {
  userMessage: string;
  canvasState: CanvasState;
  viewportInfo: ViewportInfo;
  selectedShape: SelectedShape | null;
}

export interface ProcessAICommandResponse {
  commands: AICommand[];
  message?: string; // Optional AI explanation or error message
}

// Tool parameter types
export type CreateRectangleParams = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type ChangeColorParams = {
  shapeId?: string;
  color: string;
};

export type MoveRectangleParams = {
  shapeId?: string;
  x: number;
  y: number;
};

export type ResizeRectangleParams = {
  shapeId?: string;
  width: number;
  height: number;
};

export type DeleteRectangleParams = {
  shapeId?: string;
};

export type CreateMultipleRectanglesParams = {
  count: number;
  color: string;
  layout?: 'row' | 'column' | 'grid';
  offsetPixels?: number;
};

export type AICommandParameters =
  | CreateRectangleParams
  | ChangeColorParams
  | MoveRectangleParams
  | ResizeRectangleParams
  | DeleteRectangleParams
  | CreateMultipleRectanglesParams;

export interface AICommand {
  tool: string;
  parameters: AICommandParameters;
}

