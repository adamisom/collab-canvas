import { describe, it, expect } from 'vitest'
import { calculateAlignedPosition, calculateDistributedPositions } from '../../src/utils/alignmentHelpers'
import type { Rectangle, CircleShape, LineShape } from '../../src/shared/shapes'

describe('alignmentHelpers', () => {
  describe('calculateAlignedPosition', () => {
    describe('Rectangle alignment', () => {
      const rect: Rectangle = {
        id: '1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        color: '#ff0000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      it('should align rectangle to left edge', () => {
        const newPos = calculateAlignedPosition(rect, 0, 'left')
        expect(newPos).toEqual({ x: 0 })
      })

      it('should align rectangle to horizontal center', () => {
        const newPos = calculateAlignedPosition(rect, 200, 'center-horizontal')
        // Center is at x: 200, rectangle width is 50, so left edge should be at 200 - 25 = 175
        expect(newPos).toEqual({ x: 175 })
      })

      it('should align rectangle to right edge', () => {
        const newPos = calculateAlignedPosition(rect, 300, 'right')
        // Right edge at 300, width is 50, so left edge should be at 250
        expect(newPos).toEqual({ x: 250 })
      })

      it('should align rectangle to top edge', () => {
        const newPos = calculateAlignedPosition(rect, 50, 'top')
        expect(newPos).toEqual({ y: 50 })
      })

      it('should align rectangle to vertical center', () => {
        const newPos = calculateAlignedPosition(rect, 150, 'center-vertical')
        // Center at y: 150, height is 30, so top edge should be at 150 - 15 = 135
        expect(newPos).toEqual({ y: 135 })
      })

      it('should align rectangle to bottom edge', () => {
        const newPos = calculateAlignedPosition(rect, 200, 'bottom')
        // Bottom at 200, height is 30, so top edge should be at 170
        expect(newPos).toEqual({ y: 170 })
      })
    })

    describe('Circle alignment', () => {
      const circle: CircleShape = {
        id: '1',
        type: 'circle',
        x: 100,
        y: 100,
        radius: 25,
        color: '#00ff00',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      it('should align circle to left edge', () => {
        const newPos = calculateAlignedPosition(circle, 0, 'left')
        // Left edge at 0, circle center should be at radius (25)
        expect(newPos).toEqual({ x: 25 })
      })

      it('should align circle to horizontal center', () => {
        const newPos = calculateAlignedPosition(circle, 200, 'center-horizontal')
        // Center at 200, circle center should be at 200
        expect(newPos).toEqual({ x: 200 })
      })

      it('should align circle to right edge', () => {
        const newPos = calculateAlignedPosition(circle, 300, 'right')
        // Right edge at 300, circle center should be at 300 - radius (275)
        expect(newPos).toEqual({ x: 275 })
      })

      it('should align circle to top edge', () => {
        const newPos = calculateAlignedPosition(circle, 50, 'top')
        expect(newPos).toEqual({ y: 75 })  // 50 + radius
      })

      it('should align circle to vertical center', () => {
        const newPos = calculateAlignedPosition(circle, 150, 'center-vertical')
        expect(newPos).toEqual({ y: 150 })
      })

      it('should align circle to bottom edge', () => {
        const newPos = calculateAlignedPosition(circle, 200, 'bottom')
        expect(newPos).toEqual({ y: 175 })  // 200 - radius
      })
    })

    describe('Line alignment', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        x: 100,
        y: 100,
        endX: 200,
        endY: 150,
        strokeWidth: 2,
        hasArrow: false,
        color: '#0000ff',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      it('should align line to left edge (translates both points)', () => {
        const newPos = calculateAlignedPosition(line, 0, 'left')
        // Line bounds: x=100, width=100. New left edge at 0, so delta = -100
        expect(newPos).toEqual({ 
          x: 0,      // 100 - 100
          endX: 100  // 200 - 100
        })
      })

      it('should align line to horizontal center', () => {
        const newPos = calculateAlignedPosition(line, 250, 'center-horizontal')
        // Line bounds: x=100, width=100, center at 150. New center at 250, delta = 100
        expect(newPos).toEqual({
          x: 200,    // 100 + 100
          endX: 300  // 200 + 100
        })
      })

      it('should align line to right edge', () => {
        const newPos = calculateAlignedPosition(line, 400, 'right')
        // Line bounds: right edge at 200. New right at 400, delta = 200
        expect(newPos).toEqual({
          x: 300,    // 100 + 200
          endX: 400  // 200 + 200
        })
      })

      it('should align line to top edge', () => {
        const newPos = calculateAlignedPosition(line, 50, 'top')
        // Line bounds: y=100, height=50. New top at 50, delta = -50
        expect(newPos).toEqual({
          y: 50,     // 100 - 50
          endY: 100  // 150 - 50
        })
      })

      it('should align line to vertical center', () => {
        const newPos = calculateAlignedPosition(line, 200, 'center-vertical')
        // Line bounds: y=100, height=50, center at 125. New center at 200, delta = 75
        expect(newPos).toEqual({
          y: 175,    // 100 + 75
          endY: 225  // 150 + 75
        })
      })
    })
  })

  describe('calculateDistributedPositions', () => {
    it('should return empty map for less than 3 shapes', () => {
      const rect1: Rectangle = {
        id: '1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        color: '#ff0000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const rect2 = { ...rect1, id: '2', x: 100 }

      const positions = calculateDistributedPositions([rect1, rect2], 'horizontal')
      expect(positions.size).toBe(0)
    })

    it('should distribute 3 rectangles evenly horizontally', () => {
      const rect1: Rectangle = {
        id: '1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        color: '#ff0000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }
      const rect2 = { ...rect1, id: '2', x: 100 }
      const rect3 = { ...rect1, id: '3', x: 300 }

      // Total space: 300 + 50 - 0 = 350
      // Total shape size: 50 + 50 + 50 = 150
      // Gap: (350 - 150) / 2 = 100

      const positions = calculateDistributedPositions([rect1, rect2, rect3], 'horizontal')
      
      expect(positions.size).toBe(3)
      expect(positions.get('1')).toEqual({ x: 0 })      // First stays at 0
      expect(positions.get('2')).toEqual({ x: 150 })    // 0 + 50 + 100
      expect(positions.get('3')).toEqual({ x: 300 })    // 150 + 50 + 100
    })

    it('should distribute 3 rectangles evenly vertically', () => {
      const rect1: Rectangle = {
        id: '1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 50,
        height: 40,
        color: '#ff0000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }
      const rect2 = { ...rect1, id: '2', y: 100 }
      const rect3 = { ...rect1, id: '3', y: 300 }

      // Total space: 300 + 40 - 0 = 340
      // Total shape size: 40 + 40 + 40 = 120
      // Gap: (340 - 120) / 2 = 110

      const positions = calculateDistributedPositions([rect1, rect2, rect3], 'vertical')
      
      expect(positions.size).toBe(3)
      expect(positions.get('1')).toEqual({ y: 0 })      // First stays at 0
      expect(positions.get('2')).toEqual({ y: 150 })    // 0 + 40 + 110
      expect(positions.get('3')).toEqual({ y: 300 })    // 150 + 40 + 110
    })

    it('should sort shapes before distributing', () => {
      // Provide shapes out of order
      const rect1: Rectangle = {
        id: '1',
        type: 'rectangle',
        x: 100,  // Middle
        y: 0,
        width: 50,
        height: 50,
        color: '#ff0000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }
      const rect2 = { ...rect1, id: '2', x: 0 }    // First
      const rect3 = { ...rect1, id: '3', x: 300 }  // Last

      const positions = calculateDistributedPositions([rect1, rect2, rect3], 'horizontal')
      
      // Should distribute based on sorted order (rect2, rect1, rect3)
      expect(positions.size).toBe(3)
      expect(positions.get('2')).toEqual({ x: 0 })    // Leftmost
      expect(positions.get('1')).toEqual({ x: 150 }) // Middle
      expect(positions.get('3')).toEqual({ x: 300 }) // Rightmost
    })

    it('should distribute circles correctly (center-based)', () => {
      const circle1: CircleShape = {
        id: '1',
        type: 'circle',
        x: 50,   // Center at 50
        y: 0,
        radius: 25,
        color: '#00ff00',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }
      const circle2 = { ...circle1, id: '2', x: 150 }
      const circle3 = { ...circle1, id: '3', x: 350 }

      // Bounds: [25-75], [125-175], [325-375]
      // Total space: 375 - 25 = 350
      // Total shape size: 50 + 50 + 50 = 150
      // Gap: (350 - 150) / 2 = 100

      const positions = calculateDistributedPositions([circle1, circle2, circle3], 'horizontal')
      
      expect(positions.size).toBe(3)
      // Circles return center positions
      expect(positions.get('1')).toEqual({ x: 50 })   // 25 + 25 (bounds.x + radius)
      expect(positions.get('2')).toEqual({ x: 200 })  // 175 + 25
      expect(positions.get('3')).toEqual({ x: 350 })  // 325 + 25
    })
  })
})
