/**
 * TypeScript interfaces for AI Canvas Agent
 * These types must match exactly with Cloud Function types in /functions/src/types.ts
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

export interface AICommand {
  tool: string;
  parameters: Record<string, any>;
}

// Command snapshot captured at submission time (immutable)
export interface CommandSnapshot {
  canvasState: CanvasState;
  viewportInfo?: ViewportInfo;
  selectedShapeId: string | null;
}

