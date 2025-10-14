import { describe, it, expect, vi } from 'vitest'
import {
  generateRectangleId,
  isWithinCanvasBounds,
  constrainToCanvas,
  validateAndConstrainDimensions,
  calculateResizeHandlePositions,
  calculateResizeUpdate,
  calculateDistance,
  isPointInRectangle,
  createDefaultRectangle,
  throttle,
  debounce,
  formatTimestamp,
  validateRectangleDimensions
} from '../../src/utils/canvasHelpers'
import { CANVAS_BOUNDS, DEFAULT_RECT, RESIZE_DIRECTIONS, RECTANGLE_CONSTRAINTS } from '../../src/utils/constants'

describe('canvasHelpers', () => {
  describe('generateRectangleId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateRectangleId()
      const id2 = generateRectangleId()
      
      expect(id1).toMatch(/^rect_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^rect_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('isWithinCanvasBounds', () => {
    it('should return true for points within bounds', () => {
      expect(isWithinCanvasBounds(100, 100)).toBe(true)
      expect(isWithinCanvasBounds(0, 0)).toBe(true)
      expect(isWithinCanvasBounds(CANVAS_BOUNDS.MAX_X - 1, CANVAS_BOUNDS.MAX_Y - 1)).toBe(true)
    })

    it('should return false for points outside bounds', () => {
      expect(isWithinCanvasBounds(-1, 0)).toBe(false)
      expect(isWithinCanvasBounds(0, -1)).toBe(false)
      expect(isWithinCanvasBounds(CANVAS_BOUNDS.MAX_X + 1, 0)).toBe(false)
      expect(isWithinCanvasBounds(0, CANVAS_BOUNDS.MAX_Y + 1)).toBe(false)
    })

    it('should check rectangle bounds when width and height provided', () => {
      expect(isWithinCanvasBounds(100, 100, 50, 50)).toBe(true)
      expect(isWithinCanvasBounds(CANVAS_BOUNDS.MAX_X - 50, CANVAS_BOUNDS.MAX_Y - 50, 50, 50)).toBe(true)
      expect(isWithinCanvasBounds(CANVAS_BOUNDS.MAX_X - 49, CANVAS_BOUNDS.MAX_Y - 49, 50, 50)).toBe(false)
    })
  })

  describe('validateAndConstrainDimensions', () => {
    it('should return valid dimensions unchanged', () => {
      const result = validateAndConstrainDimensions(100, 150)
      
      expect(result).toEqual({
        width: 100,
        height: 150
      })
    })

    it('should constrain dimensions to minimum', () => {
      const result = validateAndConstrainDimensions(10, 5)
      
      expect(result).toEqual({
        width: RECTANGLE_CONSTRAINTS.MIN_WIDTH,
        height: RECTANGLE_CONSTRAINTS.MIN_HEIGHT
      })
    })

    it('should constrain dimensions to maximum', () => {
      const result = validateAndConstrainDimensions(5000, 4000)
      
      expect(result).toEqual({
        width: RECTANGLE_CONSTRAINTS.MAX_WIDTH,
        height: RECTANGLE_CONSTRAINTS.MAX_HEIGHT
      })
    })
  })

  describe('calculateResizeHandlePositions', () => {
    it('should calculate correct handle positions', () => {
      const positions = calculateResizeHandlePositions(100, 200, 300, 150)
      
      expect(positions[RESIZE_DIRECTIONS.TOP_LEFT]).toEqual({ x: 100, y: 200 })
      expect(positions[RESIZE_DIRECTIONS.TOP_CENTER]).toEqual({ x: 250, y: 200 }) // 100 + 300/2
      expect(positions[RESIZE_DIRECTIONS.TOP_RIGHT]).toEqual({ x: 400, y: 200 }) // 100 + 300
      expect(positions[RESIZE_DIRECTIONS.MIDDLE_LEFT]).toEqual({ x: 100, y: 275 }) // 200 + 150/2
      expect(positions[RESIZE_DIRECTIONS.MIDDLE_RIGHT]).toEqual({ x: 400, y: 275 })
      expect(positions[RESIZE_DIRECTIONS.BOTTOM_LEFT]).toEqual({ x: 100, y: 350 }) // 200 + 150
      expect(positions[RESIZE_DIRECTIONS.BOTTOM_CENTER]).toEqual({ x: 250, y: 350 })
      expect(positions[RESIZE_DIRECTIONS.BOTTOM_RIGHT]).toEqual({ x: 400, y: 350 })
    })
  })

  describe('calculateResizeUpdate', () => {
    const baseX = 100
    const baseY = 200
    const baseWidth = 300
    const baseHeight = 150

    it('should calculate correct resize for bottom-right handle', () => {
      const result = calculateResizeUpdate(
        RESIZE_DIRECTIONS.BOTTOM_RIGHT,
        baseX, baseY, baseWidth, baseHeight,
        50, 25 // deltaX, deltaY
      )
      
      expect(result.x).toBe(baseX)
      expect(result.y).toBe(baseY)
      expect(result.width).toBe(350) // 300 + 50
      expect(result.height).toBe(175) // 150 + 25
    })

    it('should calculate correct resize for top-left handle', () => {
      const result = calculateResizeUpdate(
        RESIZE_DIRECTIONS.TOP_LEFT,
        baseX, baseY, baseWidth, baseHeight,
        50, 25 // deltaX, deltaY
      )
      
      expect(result.x).toBe(150) // 100 + 50
      expect(result.y).toBe(225) // 200 + 25
      expect(result.width).toBe(250) // 300 - 50
      expect(result.height).toBe(125) // 150 - 25
    })

    it('should calculate correct resize for middle-right handle', () => {
      const result = calculateResizeUpdate(
        RESIZE_DIRECTIONS.MIDDLE_RIGHT,
        baseX, baseY, baseWidth, baseHeight,
        50, 25 // deltaX, deltaY (deltaY should be ignored)
      )
      
      expect(result.x).toBe(baseX)
      expect(result.y).toBe(baseY)
      expect(result.width).toBe(350) // 300 + 50
      expect(result.height).toBe(baseHeight) // unchanged
    })

    it('should enforce minimum dimensions during resize', () => {
      const result = calculateResizeUpdate(
        RESIZE_DIRECTIONS.BOTTOM_RIGHT,
        baseX, baseY, baseWidth, baseHeight,
        -400, -200 // Large negative deltas
      )
      
      expect(result.width).toBe(RECTANGLE_CONSTRAINTS.MIN_WIDTH)
      expect(result.height).toBe(RECTANGLE_CONSTRAINTS.MIN_HEIGHT)
    })

    it('should constrain position when resizing from left/top handles', () => {
      const result = calculateResizeUpdate(
        RESIZE_DIRECTIONS.TOP_LEFT,
        baseX, baseY, baseWidth, baseHeight,
        400, 200 // Large positive deltas that would make rectangle too small
      )
      
      // Should constrain to minimum size and adjust position accordingly
      expect(result.width).toBe(RECTANGLE_CONSTRAINTS.MIN_WIDTH)
      expect(result.height).toBe(RECTANGLE_CONSTRAINTS.MIN_HEIGHT)
    })
  })

  describe('constrainToCanvas', () => {
    it('should return same values when rectangle is within bounds', () => {
      const result = constrainToCanvas(100, 100, 200, 150)
      
      expect(result).toEqual({
        x: 100,
        y: 100,
        width: 200,
        height: 150
      })
    })

    it('should constrain negative coordinates to 0', () => {
      const result = constrainToCanvas(-50, -30, 100, 100)
      
      expect(result).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      })
    })

    it('should constrain coordinates that exceed canvas bounds', () => {
      const result = constrainToCanvas(CANVAS_BOUNDS.MAX_X, CANVAS_BOUNDS.MAX_Y, 100, 100)
      
      expect(result).toEqual({
        x: CANVAS_BOUNDS.MAX_X - 100,
        y: CANVAS_BOUNDS.MAX_Y - 100,
        width: 100,
        height: 100
      })
    })
  })

  describe('calculateDistance', () => {
    it('should calculate correct distance between two points', () => {
      expect(calculateDistance(0, 0, 3, 4)).toBe(5) // 3-4-5 triangle
      expect(calculateDistance(0, 0, 0, 0)).toBe(0)
      expect(calculateDistance(1, 1, 4, 5)).toBe(5)
    })
  })

  describe('isPointInRectangle', () => {
    it('should return true for points inside rectangle', () => {
      expect(isPointInRectangle(50, 50, 0, 0, 100, 100)).toBe(true)
      expect(isPointInRectangle(0, 0, 0, 0, 100, 100)).toBe(true) // corner
      expect(isPointInRectangle(100, 100, 0, 0, 100, 100)).toBe(true) // opposite corner
    })

    it('should return false for points outside rectangle', () => {
      expect(isPointInRectangle(-1, 50, 0, 0, 100, 100)).toBe(false)
      expect(isPointInRectangle(50, -1, 0, 0, 100, 100)).toBe(false)
      expect(isPointInRectangle(101, 50, 0, 0, 100, 100)).toBe(false)
      expect(isPointInRectangle(50, 101, 0, 0, 100, 100)).toBe(false)
    })
  })

  describe('createDefaultRectangle', () => {
    it('should create rectangle with default dimensions', () => {
      const result = createDefaultRectangle(100, 100, 'user123')
      
      expect(result).toEqual({
        x: 100,
        y: 100,
        width: DEFAULT_RECT.WIDTH,
        height: DEFAULT_RECT.HEIGHT,
        createdBy: 'user123'
      })
    })

    it('should constrain rectangle to canvas bounds', () => {
      const result = createDefaultRectangle(CANVAS_BOUNDS.MAX_X, CANVAS_BOUNDS.MAX_Y, 'user123')
      
      expect(result.x).toBe(CANVAS_BOUNDS.MAX_X - DEFAULT_RECT.WIDTH)
      expect(result.y).toBe(CANVAS_BOUNDS.MAX_Y - DEFAULT_RECT.HEIGHT)
    })
  })

  describe('throttle', () => {
    it('should limit function calls to specified interval', async () => {
      const mockFn = vi.fn()
      const throttledFn = throttle(mockFn, 100)
      
      // Call multiple times quickly
      throttledFn('call1')
      throttledFn('call2')
      throttledFn('call3')
      
      // Should only call once immediately
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('call1')
      
      // Wait for throttle delay and check final call
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(mockFn).toHaveBeenCalledWith('call3')
    })
  })

  describe('debounce', () => {
    it('should delay function execution until after specified time', async () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)
      
      // Call multiple times quickly
      debouncedFn('call1')
      debouncedFn('call2')
      debouncedFn('call3')
      
      // Should not call immediately
      expect(mockFn).not.toHaveBeenCalled()
      
      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should call only once with last arguments
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('call3')
    })
  })

  describe('formatTimestamp', () => {
    it('should format timestamp as locale string', () => {
      const timestamp = 1640995200000 // Jan 1, 2022 00:00:00 UTC
      const result = formatTimestamp(timestamp)
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('validateRectangleDimensions', () => {
    it('should return true for valid dimensions', () => {
      expect(validateRectangleDimensions(100, 100)).toBe(true)
      expect(validateRectangleDimensions(1, 1)).toBe(true)
      expect(validateRectangleDimensions(CANVAS_BOUNDS.MAX_X, CANVAS_BOUNDS.MAX_Y)).toBe(true)
    })

    it('should return false for invalid dimensions', () => {
      expect(validateRectangleDimensions(0, 100)).toBe(false)
      expect(validateRectangleDimensions(100, 0)).toBe(false)
      expect(validateRectangleDimensions(-1, 100)).toBe(false)
      expect(validateRectangleDimensions(100, -1)).toBe(false)
      expect(validateRectangleDimensions(CANVAS_BOUNDS.MAX_X + 1, 100)).toBe(false)
      expect(validateRectangleDimensions(100, CANVAS_BOUNDS.MAX_Y + 1)).toBe(false)
    })
  })
})
