import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CanvasCommandExecutor, type CanvasContextMethods } from '../../src/services/canvasCommandExecutor'
import type { Rectangle } from '../../src/services/canvasService'
import type { ViewportInfo } from '../../src/types/ai'
import { CANVAS_BOUNDS, RECTANGLE_CONSTRAINTS, DEFAULT_RECT } from '../../src/utils/constants'

// Mock CanvasContext
function createMockContext(): CanvasContextMethods {
  return {
    rectangles: [],
    selectedRectangleId: null,
    getViewportInfo: vi.fn(() => ({
      centerX: 1500,
      centerY: 1500,
      zoom: 1,
      visibleBounds: { minX: 0, maxX: 3000, minY: 0, maxY: 3000 }
    })),
    createRectangle: vi.fn(async (x: number, y: number): Promise<Rectangle | null> => ({
      id: `rect-${Date.now()}`,
      x,
      y,
      width: DEFAULT_RECT.WIDTH,
      height: DEFAULT_RECT.HEIGHT,
      color: DEFAULT_RECT.COLOR,
      createdAt: Date.now(),
      userId: 'test-user'
    })),
    updateRectangle: vi.fn(async () => {}),
    resizeRectangle: vi.fn(async () => {}),
    deleteRectangle: vi.fn(async () => {}),
    changeRectangleColor: vi.fn(async () => {}),
    selectRectangle: vi.fn(async () => {}),
    setSelectionLocked: vi.fn()
  }
}

describe('CanvasCommandExecutor', () => {
  let executor: CanvasCommandExecutor
  let mockContext: CanvasContextMethods

  beforeEach(() => {
    mockContext = createMockContext()
    executor = new CanvasCommandExecutor(mockContext)
  })

  describe('Color Validation (5 tests)', () => {
    it('should accept valid red color (#ef4444)', async () => {
      await expect(
        executor.executeCommand({
          tool: 'createRectangle',
          parameters: { x: 100, y: 100, width: 100, height: 80, color: '#ef4444' }
        })
      ).resolves.not.toThrow()
    })

    it('should accept valid blue color (#3b82f6)', async () => {
      await expect(
        executor.executeCommand({
          tool: 'createRectangle',
          parameters: { x: 100, y: 100, width: 100, height: 80, color: '#3b82f6' }
        })
      ).resolves.not.toThrow()
    })

    it('should accept valid green color (#22c55e)', async () => {
      await expect(
        executor.executeCommand({
          tool: 'createRectangle',
          parameters: { x: 100, y: 100, width: 100, height: 80, color: '#22c55e' }
        })
      ).resolves.not.toThrow()
    })

    it('should reject invalid color (e.g. #ffffff)', async () => {
      await expect(
        executor.executeCommand({
          tool: 'createRectangle',
          parameters: { x: 100, y: 100, width: 100, height: 80, color: '#ffffff' }
        })
      ).rejects.toThrow('Invalid color: #ffffff')
    })

    it('should reject invalid color in changeColor command', async () => {
      mockContext.rectangles = [{
        id: 'rect-1',
        x: 100,
        y: 100,
        width: 100,
        height: 80,
        color: '#ef4444',
        createdAt: Date.now(),
        userId: 'test-user'
      }]

      await expect(
        executor.executeCommand({
          tool: 'changeColor',
          parameters: { shapeId: 'rect-1', color: '#000000' }
        })
      ).rejects.toThrow('Invalid color')
    })
  })

  describe('Parameter Clamping (8 tests)', () => {
    it('should clamp X coordinate below minimum (0)', async () => {
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: -500, y: 100, width: 100, height: 80, color: '#ef4444' }
      })

      expect(mockContext.createRectangle).toHaveBeenCalledWith(CANVAS_BOUNDS.MIN_X, 100)
    })

    it('should clamp X coordinate above maximum (3000)', async () => {
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 5000, y: 100, width: 100, height: 80, color: '#ef4444' }
      })

      expect(mockContext.createRectangle).toHaveBeenCalledWith(CANVAS_BOUNDS.MAX_X, 100)
    })

    it('should clamp Y coordinate below minimum (0)', async () => {
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 100, y: -200, width: 100, height: 80, color: '#ef4444' }
      })

      expect(mockContext.createRectangle).toHaveBeenCalledWith(100, CANVAS_BOUNDS.MIN_Y)
    })

    it('should clamp Y coordinate above maximum (3000)', async () => {
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 100, y: 4000, width: 100, height: 80, color: '#ef4444' }
      })

      expect(mockContext.createRectangle).toHaveBeenCalledWith(100, CANVAS_BOUNDS.MAX_Y)
    })

    it('should clamp width below minimum (20)', async () => {
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 100, y: 100, width: 5, height: 80, color: '#ef4444' }
      })

      expect(mockContext.updateRectangle).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ width: RECTANGLE_CONSTRAINTS.MIN_WIDTH })
      )
    })

    it('should clamp width above maximum (3000)', async () => {
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 100, y: 100, width: 5000, height: 80, color: '#ef4444' }
      })

      expect(mockContext.updateRectangle).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ width: RECTANGLE_CONSTRAINTS.MAX_WIDTH })
      )
    })

    it('should clamp height below minimum (20)', async () => {
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 100, y: 100, width: 100, height: 10, color: '#ef4444' }
      })

      expect(mockContext.updateRectangle).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ height: RECTANGLE_CONSTRAINTS.MIN_HEIGHT })
      )
    })

    it('should clamp height above maximum (3000)', async () => {
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 100, y: 100, width: 100, height: 4000, color: '#ef4444' }
      })

      expect(mockContext.updateRectangle).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ height: RECTANGLE_CONSTRAINTS.MAX_HEIGHT })
      )
    })
  })

  describe('Rectangle Existence Checks (4 tests)', () => {
    it('should throw error when changing color of non-existent rectangle', async () => {
      mockContext.rectangles = []

      await expect(
        executor.executeCommand({
          tool: 'changeColor',
          parameters: { shapeId: 'rect-999', color: '#ef4444' }
        })
      ).rejects.toThrow('Rectangle rect-999 not found or was deleted')
    })

    it('should throw error when moving non-existent rectangle', async () => {
      mockContext.rectangles = []

      await expect(
        executor.executeCommand({
          tool: 'moveRectangle',
          parameters: { shapeId: 'rect-999', x: 500, y: 500 }
        })
      ).rejects.toThrow('Rectangle rect-999 not found or was deleted')
    })

    it('should throw error when resizing non-existent rectangle', async () => {
      mockContext.rectangles = []

      await expect(
        executor.executeCommand({
          tool: 'resizeRectangle',
          parameters: { shapeId: 'rect-999', width: 200, height: 150 }
        })
      ).rejects.toThrow('Rectangle rect-999 not found or was deleted')
    })

    it('should throw error when deleting non-existent rectangle', async () => {
      mockContext.rectangles = []

      await expect(
        executor.executeCommand({
          tool: 'deleteRectangle',
          parameters: { shapeId: 'rect-999' }
        })
      ).rejects.toThrow('Rectangle rect-999 not found or was deleted')
    })
  })

  describe('Batch Layout Calculations (3 tests)', () => {
    it('should calculate "row" layout positions correctly', async () => {
      await executor.executeCommand({
        tool: 'createMultipleRectangles',
        parameters: { count: 3, layout: 'row', color: '#ef4444', offsetPixels: 20 }
      })

      // Should create 3 rectangles in a row
      expect(mockContext.createRectangle).toHaveBeenCalledTimes(3)
      expect(mockContext.createRectangle).toHaveBeenNthCalledWith(1, 1500, 1500)
      expect(mockContext.createRectangle).toHaveBeenNthCalledWith(2, 1500 + DEFAULT_RECT.WIDTH + 20, 1500)
      expect(mockContext.createRectangle).toHaveBeenNthCalledWith(3, 1500 + 2 * (DEFAULT_RECT.WIDTH + 20), 1500)
    })

    it('should calculate "column" layout positions correctly', async () => {
      await executor.executeCommand({
        tool: 'createMultipleRectangles',
        parameters: { count: 3, layout: 'column', color: '#3b82f6', offsetPixels: 15 }
      })

      // Should create 3 rectangles in a column
      expect(mockContext.createRectangle).toHaveBeenCalledTimes(3)
      expect(mockContext.createRectangle).toHaveBeenNthCalledWith(1, 1500, 1500)
      expect(mockContext.createRectangle).toHaveBeenNthCalledWith(2, 1500, 1500 + DEFAULT_RECT.HEIGHT + 15)
      expect(mockContext.createRectangle).toHaveBeenNthCalledWith(3, 1500, 1500 + 2 * (DEFAULT_RECT.HEIGHT + 15))
    })

    it('should calculate "grid" layout positions correctly', async () => {
      await executor.executeCommand({
        tool: 'createMultipleRectangles',
        parameters: { count: 4, layout: 'grid', color: '#22c55e', offsetPixels: 25 }
      })

      // Should create 4 rectangles in a 2x2 grid
      expect(mockContext.createRectangle).toHaveBeenCalledTimes(4)
      const offset = 25
      const width = DEFAULT_RECT.WIDTH
      const height = DEFAULT_RECT.HEIGHT
      
      // Grid: 2 columns (Math.ceil(sqrt(4)) = 2)
      // Position 0: col=0, row=0 → (1500, 1500)
      expect(mockContext.createRectangle).toHaveBeenNthCalledWith(1, 1500, 1500)
      // Position 1: col=1, row=0 → (1500 + width + offset, 1500)
      expect(mockContext.createRectangle).toHaveBeenNthCalledWith(2, 1500 + width + offset, 1500)
      // Position 2: col=0, row=1 → (1500, 1500 + height + offset)
      expect(mockContext.createRectangle).toHaveBeenNthCalledWith(3, 1500, 1500 + height + offset)
      // Position 3: col=1, row=1 → (1500 + width + offset, 1500 + height + offset)
      expect(mockContext.createRectangle).toHaveBeenNthCalledWith(4, 1500 + width + offset, 1500 + height + offset)
    })
  })

  describe('Context Gathering Methods', () => {
    it('should return canvas state with all rectangles', () => {
      mockContext.rectangles = [
        {
          id: 'rect-1',
          x: 100,
          y: 200,
          width: 150,
          height: 100,
          color: '#ef4444',
          createdAt: Date.now(),
          userId: 'user-1'
        },
        {
          id: 'rect-2',
          x: 300,
          y: 400,
          width: 200,
          height: 150,
          color: '#3b82f6',
          createdAt: Date.now(),
          userId: 'user-2'
        }
      ]

      const canvasState = executor.getCanvasState()

      expect(canvasState.rectangles).toHaveLength(2)
      expect(canvasState.rectangles[0]).toEqual({
        id: 'rect-1',
        x: 100,
        y: 200,
        width: 150,
        height: 100,
        color: '#ef4444'
      })
    })

    it('should return viewport info from context', () => {
      const viewportInfo = executor.getViewportInfo()

      expect(viewportInfo).toEqual({
        centerX: 1500,
        centerY: 1500,
        zoom: 1,
        visibleBounds: { minX: 0, maxX: 3000, minY: 0, maxY: 3000 }
      })
      expect(mockContext.getViewportInfo).toHaveBeenCalled()
    })

    it('should return selected shape info when rectangle is selected', () => {
      mockContext.rectangles = [
        {
          id: 'rect-selected',
          x: 500,
          y: 600,
          width: 120,
          height: 90,
          color: '#22c55e',
          createdAt: Date.now(),
          userId: 'user-1'
        }
      ]
      mockContext.selectedRectangleId = 'rect-selected'

      const selectedShape = executor.getSelectedShape()

      expect(selectedShape).toEqual({
        id: 'rect-selected',
        x: 500,
        y: 600,
        width: 120,
        height: 90,
        color: '#22c55e'
      })
    })

    it('should return null when no rectangle is selected', () => {
      mockContext.selectedRectangleId = null

      const selectedShape = executor.getSelectedShape()

      expect(selectedShape).toBeNull()
    })
  })

  describe('Multi-step Command Support', () => {
    it('should use createdRectangleId for changeColor in multi-step', async () => {
      mockContext.rectangles = [{
        id: 'rect-created',
        x: 100,
        y: 100,
        width: 100,
        height: 80,
        color: '#ef4444',
        createdAt: Date.now(),
        userId: 'test-user'
      }]

      await executor.executeCommand(
        {
          tool: 'changeColor',
          parameters: { color: '#3b82f6' }
        },
        'rect-created' // This is the createdRectangleId from first step
      )

      expect(mockContext.changeRectangleColor).toHaveBeenCalledWith('rect-created', '#3b82f6')
    })

    it('should use createdRectangleId for moveRectangle in multi-step', async () => {
      mockContext.rectangles = [{
        id: 'rect-created',
        x: 100,
        y: 100,
        width: 100,
        height: 80,
        color: '#ef4444',
        createdAt: Date.now(),
        userId: 'test-user'
      }]

      await executor.executeCommand(
        {
          tool: 'moveRectangle',
          parameters: { x: 500, y: 600 }
        },
        'rect-created'
      )

      expect(mockContext.updateRectangle).toHaveBeenCalledWith('rect-created', { x: 500, y: 600 })
    })

    it('should throw error if createdRectangle was deleted by another user', async () => {
      mockContext.rectangles = [] // Rectangle doesn't exist anymore

      await expect(
        executor.executeCommand(
          {
            tool: 'changeColor',
            parameters: { color: '#3b82f6' }
          },
          'rect-deleted' // This rect was deleted
        )
      ).rejects.toThrow('Rectangle rect-deleted not found or was deleted')
    })
  })

  describe('Default Values', () => {
    it('should use default width when not specified', async () => {
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 100, y: 100, height: 80, color: '#ef4444' }
      })

      expect(mockContext.updateRectangle).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ width: DEFAULT_RECT.WIDTH })
      )
    })

    it('should use default height when not specified', async () => {
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 100, y: 100, width: 100, color: '#ef4444' }
      })

      expect(mockContext.updateRectangle).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ height: DEFAULT_RECT.HEIGHT })
      )
    })
  })
})

