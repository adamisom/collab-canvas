/**
 * Tests for Canvas Command Executor Service
 * Validates parameter clamping, color validation, existence checks, and batch layouts
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { CanvasCommandExecutor, type CanvasContextMethods } from '../../src/services/canvasCommandExecutor'
import type { Rectangle } from '../../src/services/canvasService'
import { 
  mockRectangles, 
  mockViewportInfo,
  mockCreateRectangleCommand,
  mockChangeColorCommand,
  mockMoveRectangleCommand,
  mockResizeRectangleCommand,
  mockDeleteRectangleCommand,
  mockCreateMultipleRectanglesCommand
} from '../fixtures/aiAgent.fixtures'

describe('CanvasCommandExecutor', () => {
  let executor: CanvasCommandExecutor
  let mockContext: CanvasContextMethods
  let mockCreateRectangle: Mock
  let mockUpdateRectangle: Mock
  let mockResizeRectangle: Mock
  let mockDeleteRectangle: Mock
  let mockChangeRectangleColor: Mock
  let mockSelectRectangle: Mock

  beforeEach(() => {
    // Create mock functions
    mockCreateRectangle = vi.fn()
    mockUpdateRectangle = vi.fn()
    mockResizeRectangle = vi.fn()
    mockDeleteRectangle = vi.fn()
    mockChangeRectangleColor = vi.fn()
    mockSelectRectangle = vi.fn()

    // Create mock context
    mockContext = {
      rectangles: [...mockRectangles],
      selectedRectangleId: 'rect1',
      getViewportInfo: vi.fn(() => mockViewportInfo),
      createRectangle: mockCreateRectangle,
      updateRectangle: mockUpdateRectangle,
      resizeRectangle: mockResizeRectangle,
      deleteRectangle: mockDeleteRectangle,
      changeRectangleColor: mockChangeRectangleColor,
      selectRectangle: mockSelectRectangle,
      setSelectionLocked: vi.fn()
    }

    executor = new CanvasCommandExecutor(mockContext)
  })

  describe('Parameter Validation & Clamping', () => {
    it('should clamp x coordinate to canvas bounds (0-3000)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'new-rect', x: -100, y: 400, width: 100, height: 80, color: '#3b82f6' } as Rectangle)

      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: -100, y: 400, width: 100, height: 80, color: '#3b82f6' }
      })

      // Should clamp x to 0
      expect(mockCreateRectangle).toHaveBeenCalledWith(0, 400)
    })

    it('should clamp y coordinate to canvas bounds (0-3000)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'new-rect', x: 500, y: 5000, width: 100, height: 80, color: '#3b82f6' } as Rectangle)

      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 500, y: 5000, width: 100, height: 80, color: '#3b82f6' }
      })

      // Should clamp y to 3000
      expect(mockCreateRectangle).toHaveBeenCalledWith(500, 3000)
    })

    it('should clamp width to valid range (20-3000)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'new-rect', x: 500, y: 400, width: 5, height: 80, color: '#3b82f6' } as Rectangle)

      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 500, y: 400, width: 5, height: 80, color: '#3b82f6' }
      })

      expect(mockCreateRectangle).toHaveBeenCalled()
      // Width should be clamped to 20 in updateRectangle call
      expect(mockUpdateRectangle).toHaveBeenCalledWith('new-rect', expect.objectContaining({ width: 20 }))
    })

    it('should clamp height to valid range (20-3000)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'new-rect', x: 500, y: 400, width: 100, height: 5000, color: '#3b82f6' } as Rectangle)

      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 500, y: 400, width: 100, height: 5000, color: '#3b82f6' }
      })

      expect(mockCreateRectangle).toHaveBeenCalled()
      // Height should be clamped to 3000 in updateRectangle call
      expect(mockUpdateRectangle).toHaveBeenCalledWith('new-rect', expect.objectContaining({ height: 3000 }))
    })

    it('should throw error for invalid colors (not in VALID_AI_COLORS)', async () => {
      await expect(
        executor.executeCommand({
          tool: 'createRectangle',
          parameters: { x: 500, y: 400, width: 100, height: 80, color: '#yellow' }
        })
      ).rejects.toThrow('Invalid color')
    })

    it('should accept valid colors (#ef4444, #3b82f6, #22c55e)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'new-rect', x: 500, y: 400, width: 100, height: 80, color: '#ef4444' } as Rectangle)

      // Test red
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 500, y: 400, width: 100, height: 80, color: '#ef4444' }
      })
      expect(mockUpdateRectangle).toHaveBeenCalledWith('new-rect', expect.objectContaining({ color: '#ef4444' }))

      // Test blue
      mockCreateRectangle.mockResolvedValue({ id: 'new-rect2', x: 500, y: 400, width: 100, height: 80, color: '#3b82f6' } as Rectangle)
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 500, y: 400, width: 100, height: 80, color: '#3b82f6' }
      })
      expect(mockUpdateRectangle).toHaveBeenCalledWith('new-rect2', expect.objectContaining({ color: '#3b82f6' }))

      // Test green
      mockCreateRectangle.mockResolvedValue({ id: 'new-rect3', x: 500, y: 400, width: 100, height: 80, color: '#22c55e' } as Rectangle)
      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 500, y: 400, width: 100, height: 80, color: '#22c55e' }
      })
      expect(mockUpdateRectangle).toHaveBeenCalledWith('new-rect3', expect.objectContaining({ color: '#22c55e' }))
    })

    it('should use default color if not provided', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'new-rect', x: 500, y: 400, width: 100, height: 80, color: '#3b82f6' } as Rectangle)

      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { x: 500, y: 400, width: 100, height: 80 }
      })

      // Should use default blue color
      expect(mockUpdateRectangle).toHaveBeenCalledWith('new-rect', expect.objectContaining({ color: '#3b82f6' }))
    })

    it('should use viewport center if position not provided', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'new-rect', x: 500, y: 400, width: 100, height: 80, color: '#3b82f6' } as Rectangle)

      await executor.executeCommand({
        tool: 'createRectangle',
        parameters: { width: 100, height: 80, color: '#3b82f6' }
      })

      // Should use viewport center (500, 400 from mockViewportInfo)
      expect(mockCreateRectangle).toHaveBeenCalledWith(500, 400)
    })
  })

  describe('Rectangle Existence Checks', () => {
    it('should throw error when modifying non-existent rectangle', async () => {
      await expect(
        executor.executeCommand({
          tool: 'changeColor',
          parameters: { shapeId: 'non-existent', color: '#ef4444' }
        })
      ).rejects.toThrow('not found')
    })

    it('should throw error when resizing deleted rectangle', async () => {
      await expect(
        executor.executeCommand({
          tool: 'resizeRectangle',
          parameters: { shapeId: 'deleted-rect', width: 200, height: 150 }
        })
      ).rejects.toThrow('not found')
    })

    it('should throw error when moving deleted rectangle', async () => {
      await expect(
        executor.executeCommand({
          tool: 'moveRectangle',
          parameters: { shapeId: 'deleted-rect', x: 200, y: 300 }
        })
      ).rejects.toThrow('not found')
    })

    it('should allow operations on existing rectangles', async () => {
      await executor.executeCommand({
        tool: 'changeColor',
        parameters: { shapeId: 'rect1', color: '#ef4444' }
      })

      expect(mockChangeRectangleColor).toHaveBeenCalledWith('rect1', '#ef4444')
    })

    it('should skip existence check when using createdRectangleId', async () => {
      // This tests the race condition fix for multi-step commands
      await executor.executeCommand(
        {
          tool: 'changeColor',
          parameters: { color: '#ef4444' }
        },
        'newly-created-rect' // createdRectangleId from previous step
      )

      // Should not throw even though 'newly-created-rect' doesn't exist in context.rectangles yet
      expect(mockChangeRectangleColor).toHaveBeenCalledWith('newly-created-rect', '#ef4444')
    })
  })

  describe('Batch Creation Layouts', () => {
    it('should calculate correct positions for row layout (5 rectangles)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'rect', x: 0, y: 0, width: 100, height: 80, color: '#22c55e' } as Rectangle)

      await executor.executeCommand({
        tool: 'createMultipleRectangles',
        parameters: { count: 5, color: '#22c55e', layout: 'row', offsetPixels: 25 }
      })

      // Should create 5 rectangles
      expect(mockCreateRectangle).toHaveBeenCalledTimes(5)
      
      // Verify positions are in a row (increasing X)
      const calls = mockCreateRectangle.mock.calls
      for (let i = 1; i < calls.length; i++) {
        const prevX = calls[i - 1][0]
        const currX = calls[i][0]
        expect(currX).toBeGreaterThan(prevX)
      }
    })

    it('should calculate correct positions for column layout (5 rectangles)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'rect', x: 0, y: 0, width: 100, height: 80, color: '#22c55e' } as Rectangle)

      await executor.executeCommand({
        tool: 'createMultipleRectangles',
        parameters: { count: 5, color: '#22c55e', layout: 'column', offsetPixels: 25 }
      })

      // Should create 5 rectangles
      expect(mockCreateRectangle).toHaveBeenCalledTimes(5)
      
      // Verify positions are in a column (increasing Y)
      const calls = mockCreateRectangle.mock.calls
      for (let i = 1; i < calls.length; i++) {
        const prevY = calls[i - 1][1]
        const currY = calls[i][1]
        expect(currY).toBeGreaterThan(prevY)
      }
    })

    it('should calculate correct positions for grid layout (9 rectangles)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'rect', x: 0, y: 0, width: 100, height: 80, color: '#22c55e' } as Rectangle)

      await executor.executeCommand({
        tool: 'createMultipleRectangles',
        parameters: { count: 9, color: '#22c55e', layout: 'grid', offsetPixels: 25 }
      })

      // Should create 9 rectangles
      expect(mockCreateRectangle).toHaveBeenCalledTimes(9)
    })

    it('should respect offsetPixels parameter (10-100 range)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'rect', x: 0, y: 0, width: 100, height: 80, color: '#22c55e' } as Rectangle)

      await executor.executeCommand({
        tool: 'createMultipleRectangles',
        parameters: { count: 3, color: '#22c55e', layout: 'row', offsetPixels: 50 }
      })

      // Verify spacing is approximately 50px (100 width + 50 offset = 150 between starts)
      const calls = mockCreateRectangle.mock.calls
      if (calls.length >= 2) {
        const spacing = calls[1][0] - calls[0][0]
        expect(spacing).toBeGreaterThanOrEqual(125) // 100 + 25 (min offset)
        expect(spacing).toBeLessThanOrEqual(200) // 100 + 100 (max offset)
      }
    })

    it('should enforce maximum batch count (50)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'rect', x: 0, y: 0, width: 100, height: 80, color: '#22c55e' } as Rectangle)

      await executor.executeCommand({
        tool: 'createMultipleRectangles',
        parameters: { count: 100, color: '#22c55e', layout: 'row', offsetPixels: 25 }
      })

      // Should only create 50 rectangles (max)
      expect(mockCreateRectangle).toHaveBeenCalledTimes(50)
    })

    it('should clamp offsetPixels to valid range (10-100)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'rect', x: 0, y: 0, width: 100, height: 80, color: '#22c55e' } as Rectangle)

      // Test with offset too small
      await executor.executeCommand({
        tool: 'createMultipleRectangles',
        parameters: { count: 2, color: '#22c55e', layout: 'row', offsetPixels: 5 }
      })

      // Should clamp to minimum 10px
      const calls1 = mockCreateRectangle.mock.calls
      if (calls1.length >= 2) {
        const spacing = calls1[1][0] - calls1[0][0]
        expect(spacing).toBeGreaterThanOrEqual(110) // 100 + 10 (min)
      }

      mockCreateRectangle.mockClear()

      // Test with offset too large
      await executor.executeCommand({
        tool: 'createMultipleRectangles',
        parameters: { count: 2, color: '#22c55e', layout: 'row', offsetPixels: 200 }
      })

      // Should clamp to maximum 100px
      const calls2 = mockCreateRectangle.mock.calls
      if (calls2.length >= 2) {
        const spacing = calls2[1][0] - calls2[0][0]
        expect(spacing).toBeLessThanOrEqual(200) // 100 + 100 (max)
      }
    })
  })

  describe('Context Delegation', () => {
    it('should call CanvasContext.createRectangle (never Firebase directly)', async () => {
      mockCreateRectangle.mockResolvedValue({ id: 'new-rect', x: 500, y: 400, width: 100, height: 80, color: '#3b82f6' } as Rectangle)

      await executor.executeCommand(mockCreateRectangleCommand)

      expect(mockCreateRectangle).toHaveBeenCalled()
    })

    it('should call CanvasContext.updateRectangle (never Firebase directly)', async () => {
      await executor.executeCommand(mockMoveRectangleCommand)

      expect(mockUpdateRectangle).toHaveBeenCalled()
    })

    it('should call CanvasContext.deleteRectangle (never Firebase directly)', async () => {
      await executor.executeCommand(mockDeleteRectangleCommand)

      expect(mockDeleteRectangle).toHaveBeenCalled()
    })

    it('should call CanvasContext.changeRectangleColor (never Firebase directly)', async () => {
      await executor.executeCommand(mockChangeColorCommand)

      expect(mockChangeRectangleColor).toHaveBeenCalled()
    })

    it('should call CanvasContext.resizeRectangle (never Firebase directly)', async () => {
      await executor.executeCommand(mockResizeRectangleCommand)

      expect(mockResizeRectangle).toHaveBeenCalled()
    })
  })

  describe('Context Getters', () => {
    it('should return canvas state with all rectangles', () => {
      const state = executor.getCanvasState()

      expect(state.rectangles).toHaveLength(2)
      expect(state.rectangles[0]).toMatchObject({
        id: 'rect1',
        x: 100,
        y: 100,
        width: 100,
        height: 80,
        color: '#3b82f6'
      })
    })

    it('should return viewport info from context', () => {
      const viewport = executor.getViewportInfo()

      expect(viewport).toEqual(mockViewportInfo)
    })

    it('should return selected shape if one is selected', () => {
      const selected = executor.getSelectedShape()

      expect(selected).toMatchObject({
        id: 'rect1',
        color: '#3b82f6',
        x: 100,
        y: 100
      })
    })

    it('should return null if no shape is selected', () => {
      mockContext.selectedRectangleId = null
      const selected = executor.getSelectedShape()

      expect(selected).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should throw error if viewport info not available', async () => {
      mockContext.getViewportInfo = vi.fn(() => null)

      await expect(
        executor.executeCommand({
          tool: 'createRectangle',
          parameters: { width: 100, height: 80, color: '#3b82f6' }
        })
      ).rejects.toThrow('Viewport info not available')
    })

    it('should throw error for unknown tool', async () => {
      await expect(
        executor.executeCommand({
          tool: 'unknownTool',
          parameters: {}
        })
      ).rejects.toThrow('Unknown tool')
    })

    it('should throw error if no rectangle ID provided for modification', async () => {
      mockContext.selectedRectangleId = null

      await expect(
        executor.executeCommand({
          tool: 'changeColor',
          parameters: { color: '#ef4444' }
        })
      ).rejects.toThrow('No rectangle ID provided')
    })
  })
})
