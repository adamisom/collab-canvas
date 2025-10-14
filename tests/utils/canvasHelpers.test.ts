import { describe, it, expect, vi } from 'vitest'
import {
  generateRectangleId,
  isWithinCanvasBounds,
  constrainToCanvas,
  calculateDistance,
  isPointInRectangle,
  createDefaultRectangle,
  throttle,
  debounce,
  formatTimestamp,
  validateRectangleDimensions
} from '../../src/utils/canvasHelpers'
import { CANVAS_BOUNDS, DEFAULT_RECT } from '../../src/utils/constants'

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
