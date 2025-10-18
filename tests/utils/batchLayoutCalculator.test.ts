import { describe, it, expect } from 'vitest'
import { calculateBatchLayout, type BatchLayoutOptions } from '../../src/utils/batchLayoutCalculator'

describe('calculateBatchLayout', () => {
  const baseOptions: BatchLayoutOptions = {
    count: 3,
    layout: 'row',
    startX: 100,
    startY: 100,
    width: 100,
    height: 80,
    offset: 25
  }

  describe('Row Layout', () => {
    it('should create rectangles in a horizontal row', () => {
      const positions = calculateBatchLayout(baseOptions)

      expect(positions).toHaveLength(3)
      expect(positions[0]).toEqual({ x: 100, y: 100 })
      expect(positions[1]).toEqual({ x: 225, y: 100 }) // 100 + (100 + 25)
      expect(positions[2]).toEqual({ x: 350, y: 100 }) // 100 + 2*(100 + 25)
    })

    it('should handle single rectangle in row', () => {
      const positions = calculateBatchLayout({ ...baseOptions, count: 1 })

      expect(positions).toHaveLength(1)
      expect(positions[0]).toEqual({ x: 100, y: 100 })
    })

    it('should handle large offset in row', () => {
      const positions = calculateBatchLayout({ ...baseOptions, offset: 100 })

      expect(positions).toHaveLength(3)
      expect(positions[0]).toEqual({ x: 100, y: 100 })
      expect(positions[1]).toEqual({ x: 300, y: 100 }) // 100 + (100 + 100)
      expect(positions[2]).toEqual({ x: 500, y: 100 }) // 100 + 2*(100 + 100)
    })
  })

  describe('Column Layout', () => {
    it('should create rectangles in a vertical column', () => {
      const positions = calculateBatchLayout({ ...baseOptions, layout: 'column' })

      expect(positions).toHaveLength(3)
      expect(positions[0]).toEqual({ x: 100, y: 100 })
      expect(positions[1]).toEqual({ x: 100, y: 205 }) // 100 + (80 + 25)
      expect(positions[2]).toEqual({ x: 100, y: 310 }) // 100 + 2*(80 + 25)
    })

    it('should handle single rectangle in column', () => {
      const positions = calculateBatchLayout({ ...baseOptions, layout: 'column', count: 1 })

      expect(positions).toHaveLength(1)
      expect(positions[0]).toEqual({ x: 100, y: 100 })
    })

    it('should handle large offset in column', () => {
      const positions = calculateBatchLayout({ ...baseOptions, layout: 'column', offset: 50 })

      expect(positions).toHaveLength(3)
      expect(positions[0]).toEqual({ x: 100, y: 100 })
      expect(positions[1]).toEqual({ x: 100, y: 230 }) // 100 + (80 + 50)
      expect(positions[2]).toEqual({ x: 100, y: 360 }) // 100 + 2*(80 + 50)
    })
  })

  describe('Grid Layout', () => {
    it('should create a 2x2 grid for 4 rectangles', () => {
      const positions = calculateBatchLayout({ ...baseOptions, layout: 'grid', count: 4 })

      expect(positions).toHaveLength(4)
      // First row
      expect(positions[0]).toEqual({ x: 100, y: 100 })
      expect(positions[1]).toEqual({ x: 225, y: 100 })
      // Second row
      expect(positions[2]).toEqual({ x: 100, y: 205 })
      expect(positions[3]).toEqual({ x: 225, y: 205 })
    })

    it('should create a 3x3 grid for 9 rectangles', () => {
      const positions = calculateBatchLayout({ ...baseOptions, layout: 'grid', count: 9 })

      expect(positions).toHaveLength(9)
      // First row
      expect(positions[0]).toEqual({ x: 100, y: 100 })
      expect(positions[1]).toEqual({ x: 225, y: 100 })
      expect(positions[2]).toEqual({ x: 350, y: 100 })
      // Second row
      expect(positions[3]).toEqual({ x: 100, y: 205 })
      expect(positions[4]).toEqual({ x: 225, y: 205 })
      expect(positions[5]).toEqual({ x: 350, y: 205 })
      // Third row
      expect(positions[6]).toEqual({ x: 100, y: 310 })
      expect(positions[7]).toEqual({ x: 225, y: 310 })
      expect(positions[8]).toEqual({ x: 350, y: 310 })
    })

    it('should handle non-square grid (5 rectangles -> 3 cols)', () => {
      const positions = calculateBatchLayout({ ...baseOptions, layout: 'grid', count: 5 })

      expect(positions).toHaveLength(5)
      // First row (3 items)
      expect(positions[0]).toEqual({ x: 100, y: 100 })
      expect(positions[1]).toEqual({ x: 225, y: 100 })
      expect(positions[2]).toEqual({ x: 350, y: 100 })
      // Second row (2 items)
      expect(positions[3]).toEqual({ x: 100, y: 205 })
      expect(positions[4]).toEqual({ x: 225, y: 205 })
    })

    it('should handle single rectangle in grid', () => {
      const positions = calculateBatchLayout({ ...baseOptions, layout: 'grid', count: 1 })

      expect(positions).toHaveLength(1)
      expect(positions[0]).toEqual({ x: 100, y: 100 })
    })

    it('should use square root for grid columns', () => {
      // 8 rectangles -> ceil(sqrt(8)) = 3 columns
      const positions = calculateBatchLayout({ ...baseOptions, layout: 'grid', count: 8 })

      expect(positions).toHaveLength(8)
      // Verify column count by checking x-positions
      const uniqueXPositions = new Set(positions.map(p => p.x))
      expect(uniqueXPositions.size).toBe(3) // 3 columns
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero offset', () => {
      const positions = calculateBatchLayout({ ...baseOptions, offset: 0 })

      expect(positions).toHaveLength(3)
      expect(positions[0]).toEqual({ x: 100, y: 100 })
      expect(positions[1]).toEqual({ x: 200, y: 100 }) // Just width, no gap
      expect(positions[2]).toEqual({ x: 300, y: 100 })
    })

    it('should handle negative start coordinates', () => {
      const positions = calculateBatchLayout({ ...baseOptions, startX: -50, startY: -50 })

      expect(positions).toHaveLength(3)
      expect(positions[0]).toEqual({ x: -50, y: -50 })
      expect(positions[1]).toEqual({ x: 75, y: -50 })
      expect(positions[2]).toEqual({ x: 200, y: -50 })
    })

    it('should handle large count', () => {
      const positions = calculateBatchLayout({ ...baseOptions, count: 50, layout: 'grid' })

      expect(positions).toHaveLength(50)
      // Verify all positions are calculated
      expect(positions[49]).toBeDefined()
    })

    it('should handle different rectangle dimensions', () => {
      const positions = calculateBatchLayout({
        ...baseOptions,
        width: 50,
        height: 200,
        layout: 'column'
      })

      expect(positions).toHaveLength(3)
      expect(positions[0]).toEqual({ x: 100, y: 100 })
      expect(positions[1]).toEqual({ x: 100, y: 325 }) // 100 + (200 + 25)
      expect(positions[2]).toEqual({ x: 100, y: 550 }) // 100 + 2*(200 + 25)
    })
  })
})

