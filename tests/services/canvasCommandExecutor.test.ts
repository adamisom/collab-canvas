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
  mockDeleteRectangleCommand
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
  let mockDeleteSelectedShapes: Mock
  let mockChangeSelectedShapesColor: Mock

  beforeEach(() => {
    // Create mock functions
    mockCreateRectangle = vi.fn()
    mockUpdateRectangle = vi.fn()
    mockResizeRectangle = vi.fn()
    mockDeleteRectangle = vi.fn()
    mockChangeRectangleColor = vi.fn()
    mockSelectRectangle = vi.fn()
    mockDeleteSelectedShapes = vi.fn()
    mockChangeSelectedShapesColor = vi.fn()

    // Create mock context (Partial type for test mocking - only includes methods used in tests)
    mockContext = {
      rectangles: [...mockRectangles],
      primarySelectionId: 'rect1',
      primarySelectionType: 'rectangle',
      selectedShapes: new Map([['rect1', 'rectangle'], ['rect2', 'rectangle']]),
      getViewportInfo: vi.fn(() => mockViewportInfo),
      createRectangle: mockCreateRectangle,
      updateRectangle: mockUpdateRectangle,
      resizeRectangle: mockResizeRectangle,
      deleteRectangle: mockDeleteRectangle,
      changeRectangleColor: mockChangeRectangleColor,
      selectRectangle: mockSelectRectangle,
      setSelectionLocked: vi.fn(),
      deleteSelectedShapes: mockDeleteSelectedShapes,
      changeSelectedShapesColor: mockChangeSelectedShapesColor
    } as Partial<CanvasContextMethods> as CanvasContextMethods

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

      // Should use viewport center with offset (500-100, 400-70 = 400, 330 from mockViewportInfo)
      expect(mockCreateRectangle).toHaveBeenCalledWith(400, 330)
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
      mockContext.primarySelectionId = null
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
      mockContext.primarySelectionId = null

      await expect(
        executor.executeCommand({
          tool: 'changeColor',
          parameters: { color: '#ef4444' }
        })
      ).rejects.toThrow('No rectangle ID provided')
    })
  })

  describe('Phase 3D: AI Integration', () => {
    let mockAlignShapes: Mock
    let mockSelectAllOfType: Mock
    let mockRotateShape: Mock

    beforeEach(() => {
      mockAlignShapes = vi.fn()
      mockSelectAllOfType = vi.fn()
      mockRotateShape = vi.fn()

      mockContext = {
        ...mockContext,
        primarySelectionType: 'rectangle',
        selectedShapes: new Map([['rect1', 'rectangle'], ['rect2', 'rectangle']]),
        alignShapes: mockAlignShapes,
        selectAllOfType: mockSelectAllOfType,
        rotateShape: mockRotateShape
      }

      executor = new CanvasCommandExecutor(mockContext)
    })

    describe('alignShapes', () => {
      it('should align shapes to the left', async () => {
        await executor.executeCommand({
          tool: 'alignShapes',
          parameters: { alignType: 'left' }
        })

        expect(mockAlignShapes).toHaveBeenCalledWith('left')
      })

      it('should center shapes horizontally', async () => {
        await executor.executeCommand({
          tool: 'alignShapes',
          parameters: { alignType: 'center-horizontal' }
        })

        expect(mockAlignShapes).toHaveBeenCalledWith('center-horizontal')
      })

      it('should distribute shapes horizontally', async () => {
        mockContext.selectedShapes = new Map([
          ['rect1', 'rectangle'],
          ['rect2', 'rectangle'],
          ['rect3', 'rectangle']
        ])

        await executor.executeCommand({
          tool: 'alignShapes',
          parameters: { alignType: 'distribute-horizontal' }
        })

        expect(mockAlignShapes).toHaveBeenCalledWith('distribute-horizontal')
      })

      it('should throw error for invalid alignment type', async () => {
        await expect(
          executor.executeCommand({
            tool: 'alignShapes',
            parameters: { alignType: 'invalid-type' }
          })
        ).rejects.toThrow('Invalid alignment type')
      })

      it('should throw error if less than 2 shapes selected', async () => {
        mockContext.selectedShapes = new Map([['rect1', 'rectangle']])

        await expect(
          executor.executeCommand({
            tool: 'alignShapes',
            parameters: { alignType: 'left' }
          })
        ).rejects.toThrow('Alignment requires at least 2 shapes selected')
      })

      it('should throw error if distributing with less than 3 shapes', async () => {
        mockContext.selectedShapes = new Map([
          ['rect1', 'rectangle'],
          ['rect2', 'rectangle']
        ])

        await expect(
          executor.executeCommand({
            tool: 'alignShapes',
            parameters: { alignType: 'distribute-horizontal' }
          })
        ).rejects.toThrow('Distribution requires at least 3 shapes selected')
      })
    })

    describe('selectAllOfType', () => {
      it('should select all rectangles', async () => {
        await executor.executeCommand({
          tool: 'selectAllOfType',
          parameters: { shapeType: 'rectangle' }
        })

        expect(mockSelectAllOfType).toHaveBeenCalledWith('rectangle')
      })

      it('should select all circles', async () => {
        await executor.executeCommand({
          tool: 'selectAllOfType',
          parameters: { shapeType: 'circle' }
        })

        expect(mockSelectAllOfType).toHaveBeenCalledWith('circle')
      })

      it('should select all lines', async () => {
        await executor.executeCommand({
          tool: 'selectAllOfType',
          parameters: { shapeType: 'line' }
        })

        expect(mockSelectAllOfType).toHaveBeenCalledWith('line')
      })

      it('should select all text', async () => {
        await executor.executeCommand({
          tool: 'selectAllOfType',
          parameters: { shapeType: 'text' }
        })

        expect(mockSelectAllOfType).toHaveBeenCalledWith('text')
      })

      it('should throw error for invalid shape type', async () => {
        await expect(
          executor.executeCommand({
            tool: 'selectAllOfType',
            parameters: { shapeType: 'invalid-shape' }
          })
        ).rejects.toThrow('Invalid shape type')
      })
    })

    describe('rotateShape', () => {
      beforeEach(() => {
        mockContext.primarySelectionId = 'rect1'
        mockContext.primarySelectionType = 'rectangle'
      })

      it('should rotate shape by 45 degrees', async () => {
        await executor.executeCommand({
          tool: 'rotateShape',
          parameters: { angle: 45 }
        })

        expect(mockRotateShape).toHaveBeenCalledWith('rect1', 'rectangle', 45)
      })

      it('should rotate shape by 90 degrees', async () => {
        await executor.executeCommand({
          tool: 'rotateShape',
          parameters: { angle: 90 }
        })

        expect(mockRotateShape).toHaveBeenCalledWith('rect1', 'rectangle', 90)
      })

      it('should normalize angle greater than 360', async () => {
        await executor.executeCommand({
          tool: 'rotateShape',
          parameters: { angle: 450 }
        })

        expect(mockRotateShape).toHaveBeenCalledWith('rect1', 'rectangle', 90)
      })

      it('should normalize negative angle', async () => {
        await executor.executeCommand({
          tool: 'rotateShape',
          parameters: { angle: -45 }
        })

        expect(mockRotateShape).toHaveBeenCalledWith('rect1', 'rectangle', 315)
      })

      it('should throw error if no shape selected', async () => {
        mockContext.primarySelectionId = null
        mockContext.primarySelectionType = null

        await expect(
          executor.executeCommand({
            tool: 'rotateShape',
            parameters: { angle: 45 }
          })
        ).rejects.toThrow('Rotation requires a shape to be selected')
      })

      it('should throw error for invalid angle (NaN)', async () => {
        await expect(
          executor.executeCommand({
            tool: 'rotateShape',
            parameters: { angle: NaN }
          })
        ).rejects.toThrow('Rotation angle must be a valid number')
      })

      it('should handle rotation of different shape types', async () => {
        mockContext.primarySelectionId = 'circle1'
        mockContext.primarySelectionType = 'circle'

        await executor.executeCommand({
          tool: 'rotateShape',
          parameters: { angle: 180 }
        })

        expect(mockRotateShape).toHaveBeenCalledWith('circle1', 'circle', 180)
      })
    })

    describe('Batch Operations', () => {
      describe('changeColorBatch', () => {
        it('should change color of all selected shapes', async () => {
          await executor.executeCommand({
            tool: 'changeColorBatch',
            parameters: { color: '#ef4444' }
          })

          expect(mockChangeSelectedShapesColor).toHaveBeenCalledWith('#ef4444')
        })

        it('should throw error if no shapes selected', async () => {
          mockContext.selectedShapes = new Map()

          await expect(
            executor.executeCommand({
              tool: 'changeColorBatch',
              parameters: { color: '#ef4444' }
            })
          ).rejects.toThrow('No shapes selected')
        })

        it('should throw error for invalid color', async () => {
          await expect(
            executor.executeCommand({
              tool: 'changeColorBatch',
              parameters: { color: '#invalid' }
            })
          ).rejects.toThrow('Invalid color')
        })
      })

      describe('resizeBatch', () => {
        it('should resize all selected rectangles to same width', async () => {
          mockContext.rectangles = [
            { id: 'rect1', x: 100, y: 100, width: 100, height: 80, color: '#3b82f6' } as Rectangle,
            { id: 'rect2', x: 200, y: 200, width: 150, height: 80, color: '#ef4444' } as Rectangle
          ]
          mockContext.selectedShapes = new Map([['rect1', 'rectangle'], ['rect2', 'rectangle']])

          await executor.executeCommand({
            tool: 'resizeBatch',
            parameters: { width: 200 }
          })

          expect(mockResizeRectangle).toHaveBeenCalledWith('rect1', 200, 80)
          expect(mockResizeRectangle).toHaveBeenCalledWith('rect2', 200, 80)
          expect(mockResizeRectangle).toHaveBeenCalledTimes(2)
        })

        it('should resize all selected rectangles to same height', async () => {
          mockContext.rectangles = [
            { id: 'rect1', x: 100, y: 100, width: 100, height: 80, color: '#3b82f6' } as Rectangle,
            { id: 'rect2', x: 200, y: 200, width: 100, height: 120, color: '#ef4444' } as Rectangle
          ]
          mockContext.selectedShapes = new Map([['rect1', 'rectangle'], ['rect2', 'rectangle']])

          await executor.executeCommand({
            tool: 'resizeBatch',
            parameters: { height: 150 }
          })

          expect(mockResizeRectangle).toHaveBeenCalledWith('rect1', 100, 150)
          expect(mockResizeRectangle).toHaveBeenCalledWith('rect2', 100, 150)
          expect(mockResizeRectangle).toHaveBeenCalledTimes(2)
        })

        it('should resize both width and height', async () => {
          mockContext.rectangles = [
            { id: 'rect1', x: 100, y: 100, width: 100, height: 80, color: '#3b82f6' } as Rectangle
          ]
          mockContext.selectedShapes = new Map([['rect1', 'rectangle']])

          await executor.executeCommand({
            tool: 'resizeBatch',
            parameters: { width: 250, height: 200 }
          })

          expect(mockResizeRectangle).toHaveBeenCalledWith('rect1', 250, 200)
        })

        it('should throw error if no shapes selected', async () => {
          mockContext.selectedShapes = new Map()

          await expect(
            executor.executeCommand({
              tool: 'resizeBatch',
              parameters: { width: 200 }
            })
          ).rejects.toThrow('No shapes selected')
        })

        it('should throw error if neither width nor height provided', async () => {
          await expect(
            executor.executeCommand({
              tool: 'resizeBatch',
              parameters: {}
            })
          ).rejects.toThrow('Must specify at least width or height')
        })

        it('should validate width is within valid range', async () => {
          await expect(
            executor.executeCommand({
              tool: 'resizeBatch',
              parameters: { width: 10 }
            })
          ).rejects.toThrow('Width must be between 20 and 3000')
        })

        it('should validate height is within valid range', async () => {
          await expect(
            executor.executeCommand({
              tool: 'resizeBatch',
              parameters: { height: 5000 }
            })
          ).rejects.toThrow('Height must be between 20 and 3000')
        })

        it('should only resize rectangles, not other shape types', async () => {
          mockContext.rectangles = [
            { id: 'rect1', x: 100, y: 100, width: 100, height: 80, color: '#3b82f6' } as Rectangle
          ]
          mockContext.selectedShapes = new Map([
            ['rect1', 'rectangle'],
            ['circle1', 'circle'],
            ['line1', 'line']
          ])

          await executor.executeCommand({
            tool: 'resizeBatch',
            parameters: { width: 200 }
          })

          // Should only resize the rectangle
          expect(mockResizeRectangle).toHaveBeenCalledTimes(1)
          expect(mockResizeRectangle).toHaveBeenCalledWith('rect1', 200, 80)
        })
      })

      describe('deleteBatch', () => {
        it('should delete all selected shapes', async () => {
          await executor.executeCommand({
            tool: 'deleteBatch',
            parameters: {}
          })

          expect(mockDeleteSelectedShapes).toHaveBeenCalledTimes(1)
        })

        it('should throw error if no shapes selected', async () => {
          mockContext.selectedShapes = new Map()

          await expect(
            executor.executeCommand({
              tool: 'deleteBatch',
              parameters: {}
            })
          ).rejects.toThrow('No shapes selected')
        })

        it('should work with mixed shape types', async () => {
          mockContext.selectedShapes = new Map([
            ['rect1', 'rectangle'],
            ['circle1', 'circle'],
            ['line1', 'line'],
            ['text1', 'text']
          ])

          await executor.executeCommand({
            tool: 'deleteBatch',
            parameters: {}
          })

          expect(mockDeleteSelectedShapes).toHaveBeenCalledTimes(1)
        })
      })
    })
  })
})
