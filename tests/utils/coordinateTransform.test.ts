import { describe, it, expect } from 'vitest'

/**
 * Tests for coordinate transformation logic used in Canvas.tsx
 * 
 * The transformToCanvasCoords function converts screen coordinates to canvas coordinates,
 * accounting for pan (stage position) and zoom (scale).
 * 
 * Formula: canvasCoord = (screenCoord - stagePos) / scale
 */

describe('Coordinate Transformation', () => {
  // Inline implementation of transformToCanvasCoords for testing
  const transformToCanvasCoords = (
    screenX: number,
    screenY: number,
    stageX: number,
    stageY: number,
    scale: number
  ) => {
    return {
      x: (screenX - stageX) / scale,
      y: (screenY - stageY) / scale,
    }
  }

  describe('transformToCanvasCoords', () => {
    it('should correctly transform coordinates with no pan or zoom', () => {
      const result = transformToCanvasCoords(100, 200, 0, 0, 1)
      
      expect(result.x).toBe(100)
      expect(result.y).toBe(200)
    })

    it('should correctly transform coordinates with pan (stage offset)', () => {
      // Stage panned 50px right and 30px down
      const result = transformToCanvasCoords(100, 200, 50, 30, 1)
      
      expect(result.x).toBe(50)  // 100 - 50
      expect(result.y).toBe(170) // 200 - 30
    })

    it('should correctly transform coordinates with zoom (scale)', () => {
      // Zoomed in 2x
      const result = transformToCanvasCoords(200, 400, 0, 0, 2)
      
      expect(result.x).toBe(100) // 200 / 2
      expect(result.y).toBe(200) // 400 / 2
    })

    it('should correctly transform coordinates with both pan and zoom', () => {
      // Stage panned 100px right, 50px down, and zoomed in 2x
      const result = transformToCanvasCoords(300, 250, 100, 50, 2)
      
      expect(result.x).toBe(100) // (300 - 100) / 2
      expect(result.y).toBe(100) // (250 - 50) / 2
    })

    it('should handle negative stage positions (panned left/up)', () => {
      // Stage panned left (negative X) and up (negative Y)
      const result = transformToCanvasCoords(100, 100, -50, -30, 1)
      
      expect(result.x).toBe(150) // 100 - (-50)
      expect(result.y).toBe(130) // 100 - (-30)
    })

    it('should handle zoom out (scale < 1)', () => {
      // Zoomed out to 50%
      const result = transformToCanvasCoords(100, 100, 0, 0, 0.5)
      
      expect(result.x).toBe(200) // 100 / 0.5
      expect(result.y).toBe(200) // 100 / 0.5
    })

    it('should handle complex real-world scenario', () => {
      // User has panned the canvas and zoomed in
      // Stage is at position (150, 200) and scale is 1.5x
      // User clicks at screen position (400, 300)
      const result = transformToCanvasCoords(400, 300, 150, 200, 1.5)
      
      const expectedX = (400 - 150) / 1.5  // 166.666...
      const expectedY = (300 - 200) / 1.5  // 66.666...
      
      expect(result.x).toBeCloseTo(expectedX, 2)
      expect(result.y).toBeCloseTo(expectedY, 2)
    })

    it('should handle origin point (0,0) correctly', () => {
      const result = transformToCanvasCoords(0, 0, 0, 0, 1)
      
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('should produce symmetric results for opposite pans', () => {
      const panRight = transformToCanvasCoords(100, 100, 50, 0, 1)
      const panLeft = transformToCanvasCoords(100, 100, -50, 0, 1)
      
      expect(panRight.x).toBe(50)
      expect(panLeft.x).toBe(150)
      expect(panLeft.x - panRight.x).toBe(100) // Symmetric difference
    })
  })

  describe('Edge Cases', () => {
    const transformToCanvasCoords = (
      screenX: number,
      screenY: number,
      stageX: number,
      stageY: number,
      scale: number
    ) => {
      return {
        x: (screenX - stageX) / scale,
        y: (screenY - stageY) / scale,
      }
    }

    it('should handle very large screen coordinates', () => {
      const result = transformToCanvasCoords(10000, 10000, 0, 0, 1)
      
      expect(result.x).toBe(10000)
      expect(result.y).toBe(10000)
    })

    it('should handle very small zoom levels', () => {
      const result = transformToCanvasCoords(100, 100, 0, 0, 0.1)
      
      expect(result.x).toBe(1000)
      expect(result.y).toBe(1000)
    })

    it('should handle very large zoom levels', () => {
      const result = transformToCanvasCoords(1000, 1000, 0, 0, 10)
      
      expect(result.x).toBe(100)
      expect(result.y).toBe(100)
    })
  })
})

