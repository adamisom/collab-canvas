/**
 * Test Fixtures for AI Agent Tests
 * Provides mock data for canvas state, viewport, commands, and errors
 */

import type { 
  CanvasState, 
  ViewportInfo, 
  SelectedShape,
  AICommand,
  ProcessAICommandResponse,
  CommandSnapshot
} from '../../src/shared/types'
import type { Rectangle } from '../../src/services/canvasService'

// Mock Canvas State
export const mockCanvasState: CanvasState = {
  rectangles: [
    { id: 'rect1', x: 100, y: 100, width: 100, height: 80, color: '#3b82f6' },
    { id: 'rect2', x: 300, y: 200, width: 150, height: 120, color: '#ef4444' },
    { id: 'rect3', x: 500, y: 300, width: 80, height: 60, color: '#22c55e' }
  ]
}

export const mockEmptyCanvasState: CanvasState = {
  rectangles: []
}

// Mock Viewport Info
export const mockViewportInfo: ViewportInfo = {
  centerX: 500,
  centerY: 400,
  zoom: 1,
  visibleBounds: {
    left: 0,
    top: 0,
    right: 1000,
    bottom: 800
  }
}

export const mockViewportInfoZoomed: ViewportInfo = {
  centerX: 600,
  centerY: 500,
  zoom: 2,
  visibleBounds: {
    left: 200,
    top: 100,
    right: 1000,
    bottom: 900
  }
}

// Mock Selected Shape
export const mockSelectedShape: SelectedShape = {
  id: 'rect1',
  color: '#3b82f6',
  x: 100,
  y: 100,
  width: 100,
  height: 80
}

// Mock Rectangles (for CanvasContext)
export const mockRectangles: Rectangle[] = [
  {
    id: 'rect1',
    x: 100,
    y: 100,
    width: 100,
    height: 80,
    color: '#3b82f6',
    createdBy: 'user1',
    createdAt: Date.now(),
    selectedBy: 'user1'
  },
  {
    id: 'rect2',
    x: 300,
    y: 200,
    width: 150,
    height: 120,
    color: '#ef4444',
    createdBy: 'user2',
    createdAt: Date.now()
  }
]

// Mock AI Commands
export const mockCreateRectangleCommand: AICommand = {
  tool: 'createRectangle',
  parameters: {
    x: 500,
    y: 400,
    width: 100,
    height: 80,
    color: '#3b82f6'
  }
}

export const mockChangeColorCommand: AICommand = {
  tool: 'changeColor',
  parameters: {
    shapeId: 'rect1',
    color: '#ef4444'
  }
}

export const mockMoveRectangleCommand: AICommand = {
  tool: 'moveRectangle',
  parameters: {
    shapeId: 'rect1',
    x: 200,
    y: 300
  }
}

export const mockResizeRectangleCommand: AICommand = {
  tool: 'resizeRectangle',
  parameters: {
    shapeId: 'rect1',
    width: 200,
    height: 150
  }
}

export const mockDeleteRectangleCommand: AICommand = {
  tool: 'deleteRectangle',
  parameters: {
    shapeId: 'rect1'
  }
}

export const mockCreateMultipleRectanglesCommand: AICommand = {
  tool: 'createMultipleRectangles',
  parameters: {
    count: 5,
    color: '#22c55e',
    layout: 'row',
    offsetPixels: 25
  }
}

// Multi-step command sequences
export const mockMultiStepCommands: AICommand[] = [
  mockCreateRectangleCommand,
  mockResizeRectangleCommand
]

// Mock Cloud Function Response
export const mockCloudFunctionResponse: ProcessAICommandResponse = {
  commands: [mockCreateRectangleCommand]
}

export const mockCloudFunctionResponseWithMessage: ProcessAICommandResponse = {
  commands: [],
  message: 'Invalid color. Available colors: red, blue, green'
}

export const mockMultiStepResponse: ProcessAICommandResponse = {
  commands: mockMultiStepCommands
}

// Mock Command Snapshot
export const mockCommandSnapshot: CommandSnapshot = {
  canvasState: mockCanvasState,
  viewportInfo: mockViewportInfo,
  selectedShapeId: 'rect1'
}

// Mock Errors
export const mockFirebaseErrors = {
  unauthenticated: {
    code: 'unauthenticated',
    message: 'User not authenticated'
  },
  resourceExhausted: {
    code: 'resource-exhausted',
    message: 'AI command limit reached'
  },
  failedPrecondition: {
    code: 'failed-precondition',
    message: 'Canvas has too many rectangles'
  },
  deadlineExceeded: {
    code: 'deadline-exceeded',
    message: 'Request timeout'
  },
  invalidArgument: {
    code: 'invalid-argument',
    message: 'Invalid request format'
  },
  internal: {
    code: 'internal',
    message: 'Internal server error'
  },
  unavailable: {
    code: 'unavailable',
    message: 'Service unavailable'
  },
  aborted: {
    code: 'aborted',
    message: 'Request aborted'
  }
}

export const mockExecutorErrors = {
  rectangleNotFound: new Error('Rectangle rect1 not found or was deleted'),
  invalidColor: new Error('Invalid color: #yellow'),
  viewportNotAvailable: new Error('Viewport info not available'),
  noRectangleId: new Error('No rectangle ID provided')
}

export const mockNetworkError = {
  name: 'NetworkError',
  message: 'Failed to fetch'
}

export const mockUnknownError = {
  message: 'Something went wrong'
}

