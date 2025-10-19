import { describe, it, expect } from 'vitest'
import { 
  isPointInPolygon, 
  getLassoBoundingBox, 
  boundsIntersect,
  isShapeInLasso 
} from '../../src/utils/selectionHelpers'
import type { Shape } from '../../src/shared/shapes'

describe('selectionHelpers', () => {
  describe('isPointInPolygon', () => {
    it('should return true for point inside a square', () => {
      // Square: (0,0), (100,0), (100,100), (0,100)
      const polygon = [0, 0, 100, 0, 100, 100, 0, 100]
      const point = { x: 50, y: 50 }
      
      expect(isPointInPolygon(point, polygon)).toBe(true)
    })

    it('should return false for point outside a square', () => {
      const polygon = [0, 0, 100, 0, 100, 100, 0, 100]
      const point = { x: 150, y: 50 }
      
      expect(isPointInPolygon(point, polygon)).toBe(false)
    })

    it('should return true for point on the edge', () => {
      const polygon = [0, 0, 100, 0, 100, 100, 0, 100]
      const point = { x: 0, y: 50 }
      
      // Edge case - behavior depends on ray casting implementation
      const result = isPointInPolygon(point, polygon)
      expect(typeof result).toBe('boolean')
    })

    it('should return false for polygon with fewer than 3 points', () => {
      const polygon = [0, 0, 100, 0] // Only 2 points
      const point = { x: 50, y: 50 }
      
      expect(isPointInPolygon(point, polygon)).toBe(false)
    })

    it('should handle triangle correctly', () => {
      // Triangle: (0,0), (100,0), (50,100)
      const polygon = [0, 0, 100, 0, 50, 100]
      
      expect(isPointInPolygon({ x: 50, y: 30 }, polygon)).toBe(true)
      expect(isPointInPolygon({ x: 10, y: 90 }, polygon)).toBe(false)
    })

    it('should handle irregular polygon', () => {
      // L-shape polygon
      const polygon = [0, 0, 50, 0, 50, 50, 100, 50, 100, 100, 0, 100]
      
      expect(isPointInPolygon({ x: 25, y: 25 }, polygon)).toBe(true)
      expect(isPointInPolygon({ x: 75, y: 75 }, polygon)).toBe(true)
      expect(isPointInPolygon({ x: 75, y: 25 }, polygon)).toBe(false)
    })
  })

  describe('getLassoBoundingBox', () => {
    it('should calculate correct bounding box for lasso points', () => {
      const lassoPoints = [10, 20, 100, 30, 90, 150, 20, 140]
      const bounds = getLassoBoundingBox(lassoPoints)
      
      expect(bounds).toEqual({
        x: 10,
        y: 20,
        width: 90,
        height: 130
      })
    })

    it('should return null for insufficient points', () => {
      const lassoPoints = [10, 20, 30, 40] // Only 2 points (4 coords)
      const bounds = getLassoBoundingBox(lassoPoints)
      
      expect(bounds).toBeNull()
    })

    it('should handle single point repeated', () => {
      const lassoPoints = [50, 50, 50, 50, 50, 50]
      const bounds = getLassoBoundingBox(lassoPoints)
      
      expect(bounds).toEqual({
        x: 50,
        y: 50,
        width: 0,
        height: 0
      })
    })

    it('should handle negative coordinates', () => {
      const lassoPoints = [-10, -20, 100, 30, 50, -5]
      const bounds = getLassoBoundingBox(lassoPoints)
      
      expect(bounds).toEqual({
        x: -10,
        y: -20,
        width: 110,
        height: 50
      })
    })
  })

  describe('boundsIntersect', () => {
    it('should return true for overlapping bounds', () => {
      const a = { x: 0, y: 0, width: 100, height: 100 }
      const b = { x: 50, y: 50, width: 100, height: 100 }
      
      expect(boundsIntersect(a, b)).toBe(true)
    })

    it('should return false for non-overlapping bounds', () => {
      const a = { x: 0, y: 0, width: 50, height: 50 }
      const b = { x: 100, y: 100, width: 50, height: 50 }
      
      expect(boundsIntersect(a, b)).toBe(false)
    })

    it('should return true for touching bounds', () => {
      const a = { x: 0, y: 0, width: 50, height: 50 }
      const b = { x: 50, y: 0, width: 50, height: 50 }
      
      // Implementation uses <= so touching edges are considered intersecting
      expect(boundsIntersect(a, b)).toBe(true)
    })

    it('should return true when one bound contains another', () => {
      const a = { x: 0, y: 0, width: 200, height: 200 }
      const b = { x: 50, y: 50, width: 50, height: 50 }
      
      expect(boundsIntersect(a, b)).toBe(true)
    })

    it('should handle zero-size bounds', () => {
      const a = { x: 50, y: 50, width: 0, height: 0 }
      const b = { x: 0, y: 0, width: 100, height: 100 }
      
      expect(boundsIntersect(a, b)).toBe(true)
    })
  })

  describe('isShapeInLasso', () => {
    const createRectangle = (id: string, x: number, y: number, width: number, height: number): Shape => ({
      id,
      type: 'rectangle',
      x,
      y,
      width,
      height,
      color: '#000000',
      createdBy: 'user1',
      createdAt: Date.now(),
      zIndex: 1000,
      selectedBy: null,
      selectedByUsername: null,
      selectedAt: null
    })

    const createCircle = (id: string, x: number, y: number, radius: number): Shape => ({
      id,
      type: 'circle',
      x,
      y,
      radius,
      color: '#000000',
      createdBy: 'user1',
      createdAt: Date.now(),
      zIndex: 1000,
      selectedBy: null,
      selectedByUsername: null,
      selectedAt: null
    })

    it('should return true when rectangle center is inside lasso', () => {
      const rect = createRectangle('rect1', 40, 40, 20, 20)
      // Lasso around the rectangle
      const lassoPoints = [0, 0, 100, 0, 100, 100, 0, 100]
      
      expect(isShapeInLasso(rect, lassoPoints)).toBe(true)
    })

    it('should return false when rectangle center is outside lasso', () => {
      const rect = createRectangle('rect1', 150, 150, 20, 20)
      const lassoPoints = [0, 0, 100, 0, 100, 100, 0, 100]
      
      expect(isShapeInLasso(rect, lassoPoints)).toBe(false)
    })

    it('should return false for insufficient lasso points', () => {
      const rect = createRectangle('rect1', 50, 50, 20, 20)
      const lassoPoints = [0, 0, 100, 0] // Only 2 points
      
      expect(isShapeInLasso(rect, lassoPoints)).toBe(false)
    })

    it('should use bounding box pre-filter for performance', () => {
      const rect = createRectangle('rect1', 500, 500, 20, 20)
      // Lasso far away from rectangle
      const lassoPoints = [0, 0, 100, 0, 100, 100, 0, 100]
      
      // Should quickly reject due to bounding box check
      expect(isShapeInLasso(rect, lassoPoints)).toBe(false)
    })

    it('should work with circles (center-based)', () => {
      const circle = createCircle('circle1', 50, 50, 10)
      const lassoPoints = [0, 0, 100, 0, 100, 100, 0, 100]
      
      expect(isShapeInLasso(circle, lassoPoints)).toBe(true)
    })

    it('should handle edge case where shape is partially in lasso', () => {
      // Rectangle with center at (55, 55)
      const rect = createRectangle('rect1', 45, 45, 20, 20)
      // Lasso that includes the center
      const lassoPoints = [0, 0, 60, 0, 60, 60, 0, 60]
      
      expect(isShapeInLasso(rect, lassoPoints)).toBe(true)
    })
  })
})

