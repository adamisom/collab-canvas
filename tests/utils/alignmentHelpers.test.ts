import { describe, it, expect } from 'vitest'
import { calculateAlignedPosition, calculateDistributedPositions } from '../../src/utils/alignmentHelpers'
import type { Shape } from '../../src/shared/shapes'

describe('alignmentHelpers', () => {
  describe('calculateAlignedPosition', () => {
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

    describe('horizontal alignment', () => {
      it('should align rectangle to left edge', () => {
        const rect = createRectangle('rect1', 100, 50, 80, 60)
        const result = calculateAlignedPosition(rect, 20, 'left')
        
        expect(result).toEqual({ x: 20 })
      })

      it('should align rectangle to center horizontally', () => {
        const rect = createRectangle('rect1', 100, 50, 80, 60)
        const centerX = 200
        const result = calculateAlignedPosition(rect, centerX, 'center-horizontal')
        
        // Center should be at centerX, so x = centerX - width/2
        expect(result).toEqual({ x: 160 })
      })

      it('should align rectangle to right edge', () => {
        const rect = createRectangle('rect1', 100, 50, 80, 60)
        const rightEdge = 300
        const result = calculateAlignedPosition(rect, rightEdge, 'right')
        
        // Right edge at 300, so x = 300 - 80 = 220
        expect(result).toEqual({ x: 220 })
      })
    })

    describe('vertical alignment', () => {
      it('should align rectangle to top edge', () => {
        const rect = createRectangle('rect1', 100, 50, 80, 60)
        const result = calculateAlignedPosition(rect, 10, 'top')
        
        expect(result).toEqual({ y: 10 })
      })

      it('should align rectangle to center vertically', () => {
        const rect = createRectangle('rect1', 100, 50, 80, 60)
        const centerY = 200
        const result = calculateAlignedPosition(rect, centerY, 'center-vertical')
        
        // Center should be at centerY, so y = centerY - height/2
        expect(result).toEqual({ y: 170 })
      })

      it('should align rectangle to bottom edge', () => {
        const rect = createRectangle('rect1', 100, 50, 80, 60)
        const bottomEdge = 300
        const result = calculateAlignedPosition(rect, bottomEdge, 'bottom')
        
        // Bottom edge at 300, so y = 300 - 60 = 240
        expect(result).toEqual({ y: 240 })
      })
    })

    describe('circle alignment', () => {
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

      it('should align circle horizontally (center-based)', () => {
        const circle = createCircle('circle1', 100, 100, 30)
        const result = calculateAlignedPosition(circle, 200, 'center-horizontal')
        
        // Circle x is already center, so x = targetValue
        expect(result).toEqual({ x: 200 })
      })

      it('should align circle to right edge', () => {
        const circle = createCircle('circle1', 100, 100, 30)
        const rightEdge = 300
        const result = calculateAlignedPosition(circle, rightEdge, 'right')
        
        // Right edge = x + radius, so x = 300 - 30 = 270
        expect(result).toEqual({ x: 270 })
      })
    })

    describe('line alignment', () => {
      const createLine = (id: string, x: number, y: number, endX: number, endY: number): Shape => ({
        id,
        type: 'line',
        x,
        y,
        endX,
        endY,
        color: '#000000',
        strokeWidth: 2,
        createdBy: 'user1',
        createdAt: Date.now(),
        zIndex: 1000,
        selectedBy: null,
        selectedByUsername: null,
        selectedAt: null
      })

      it('should align line to left edge (translates both points)', () => {
        const line = createLine('line1', 100, 50, 200, 150)
        const result = calculateAlignedPosition(line, 20, 'left')
        
        // Line left edge is at 100, move to 20, delta = -80
        expect(result).toEqual({ x: 20, endX: 120 })
      })

      it('should align line to center horizontally', () => {
        const line = createLine('line1', 100, 50, 200, 150)
        const centerX = 200
        const result = calculateAlignedPosition(line, centerX, 'center-horizontal')
        
        // Current center = (100 + 200) / 2 = 150
        // Delta = 200 - 150 = 50
        expect(result).toEqual({ x: 150, endX: 250 })
      })
    })
  })

  describe('calculateDistributedPositions', () => {
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

    it('should distribute shapes horizontally with equal spacing', () => {
      const shapes: Shape[] = [
        createRectangle('rect1', 0, 0, 50, 50),
        createRectangle('rect2', 100, 0, 50, 50),
        createRectangle('rect3', 200, 0, 50, 50)
      ]

      const result = calculateDistributedPositions(shapes, 'horizontal')

      // Total span: 0 to 250 (200 + 50)
      // Total shape width: 150
      // Available space: 250 - 150 = 100
      // Gap between shapes: 100 / 2 = 50
      
      expect(result.get('rect1')).toEqual({ x: 0 })
      expect(result.get('rect2')).toEqual({ x: 100 })
      expect(result.get('rect3')).toEqual({ x: 200 })
    })

    it('should distribute shapes vertically with equal spacing', () => {
      const shapes: Shape[] = [
        createRectangle('rect1', 0, 0, 50, 40),
        createRectangle('rect2', 0, 100, 50, 40),
        createRectangle('rect3', 0, 200, 50, 40)
      ]

      const result = calculateDistributedPositions(shapes, 'vertical')

      // Total span: 0 to 240 (200 + 40)
      // Total shape height: 120
      // Available space: 240 - 120 = 120
      // Gap between shapes: 120 / 2 = 60
      
      expect(result.get('rect1')).toEqual({ y: 0 })
      expect(result.get('rect2')).toEqual({ y: 100 })
      expect(result.get('rect3')).toEqual({ y: 200 })
    })

    it('should handle two shapes (single gap)', () => {
      const shapes: Shape[] = [
        createRectangle('rect1', 0, 0, 50, 50),
        createRectangle('rect2', 200, 0, 50, 50)
      ]

      const result = calculateDistributedPositions(shapes, 'horizontal')

      // With only 2 shapes, there's nothing to distribute between them
      // The function returns empty map (first and last stay in place by definition)
      expect(result.size).toBe(0)
    })

    it('should return empty map for single shape', () => {
      const shapes: Shape[] = [
        createRectangle('rect1', 100, 100, 50, 50)
      ]

      const result = calculateDistributedPositions(shapes, 'horizontal')

      expect(result.size).toBe(0)
    })

    it('should handle shapes with different sizes', () => {
      const shapes: Shape[] = [
        createRectangle('rect1', 0, 0, 30, 50),
        createRectangle('rect2', 100, 0, 60, 50),
        createRectangle('rect3', 200, 0, 40, 50)
      ]

      const result = calculateDistributedPositions(shapes, 'horizontal')

      // Should distribute evenly regardless of size
      expect(result.has('rect1')).toBe(true)
      expect(result.has('rect2')).toBe(true)
      expect(result.has('rect3')).toBe(true)
    })
  })
})

