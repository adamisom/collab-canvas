import { describe, it, expect } from 'vitest'
import { getShapeBounds, getShapeCenter } from '../../src/utils/shapeHelpers'
import type { Rectangle, CircleShape, LineShape, TextShape } from '../../src/shared/shapes'

describe('shapeHelpers', () => {
  describe('getShapeBounds', () => {
    it('should calculate bounds for rectangle', () => {
      const rect: Rectangle = {
        id: '1',
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        color: '#ff0000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const bounds = getShapeBounds(rect)
      
      expect(bounds).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50
      })
    })

    it('should calculate bounds for circle (center-based positioning)', () => {
      const circle: CircleShape = {
        id: '1',
        type: 'circle',
        x: 100,
        y: 100,
        radius: 50,
        color: '#00ff00',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const bounds = getShapeBounds(circle)
      
      // Circle bounds should be top-left of bounding box
      expect(bounds).toEqual({
        x: 50,  // center - radius
        y: 50,  // center - radius
        width: 100,  // radius * 2
        height: 100
      })
    })

    it('should calculate bounds for line (min/max coordinates)', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        x: 50,
        y: 30,
        endX: 150,
        endY: 80,
        strokeWidth: 2,
        hasArrow: false,
        color: '#0000ff',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const bounds = getShapeBounds(line)
      
      expect(bounds).toEqual({
        x: 50,
        y: 30,
        width: 100,  // 150 - 50
        height: 50   // 80 - 30
      })
    })

    it('should calculate bounds for line with reversed coordinates', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        x: 150,      // Start is further right
        y: 80,       // Start is lower
        endX: 50,
        endY: 30,
        strokeWidth: 2,
        hasArrow: false,
        color: '#0000ff',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const bounds = getShapeBounds(line)
      
      // Should still use min/max correctly
      expect(bounds).toEqual({
        x: 50,
        y: 30,
        width: 100,
        height: 50
      })
    })

    it('should calculate bounds for text with measured dimensions', () => {
      const text: TextShape = {
        id: '1',
        type: 'text',
        x: 10,
        y: 20,
        text: 'Hello World',
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null,
        measuredWidth: 85,
        measuredHeight: 20
      }

      const bounds = getShapeBounds(text)
      
      expect(bounds).toEqual({
        x: 10,
        y: 20,
        width: 85,
        height: 20
      })
    })

    it('should estimate bounds for text without measured dimensions', () => {
      const text: TextShape = {
        id: '1',
        type: 'text',
        x: 10,
        y: 20,
        text: 'Hello',  // 5 characters
        fontSize: 20,
        fontFamily: 'Arial',
        color: '#000000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const bounds = getShapeBounds(text)
      
      // Estimated: length * fontSize * 0.6, fontSize * 1.2
      expect(bounds).toEqual({
        x: 10,
        y: 20,
        width: 60,  // 5 * 20 * 0.6
        height: 24  // 20 * 1.2
      })
    })
  })

  describe('getShapeCenter', () => {
    it('should calculate center for rectangle', () => {
      const rect: Rectangle = {
        id: '1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        color: '#ff0000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const center = getShapeCenter(rect)
      
      expect(center).toEqual({
        x: 50,  // 0 + 100/2
        y: 25   // 0 + 50/2
      })
    })

    it('should return stored center for circle', () => {
      const circle: CircleShape = {
        id: '1',
        type: 'circle',
        x: 150,
        y: 200,
        radius: 50,
        color: '#00ff00',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const center = getShapeCenter(circle)
      
      // Circle stores center directly
      expect(center).toEqual({
        x: 150,
        y: 200
      })
    })

    it('should calculate center for line', () => {
      const line: LineShape = {
        id: '1',
        type: 'line',
        x: 0,
        y: 0,
        endX: 100,
        endY: 50,
        strokeWidth: 2,
        hasArrow: false,
        color: '#0000ff',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const center = getShapeCenter(line)
      
      // Center of bounding box
      expect(center).toEqual({
        x: 50,  // (0 + 100) / 2
        y: 25   // (0 + 50) / 2
      })
    })

    it('should calculate center for text', () => {
      const text: TextShape = {
        id: '1',
        type: 'text',
        x: 10,
        y: 20,
        text: 'Hello',
        fontSize: 20,
        fontFamily: 'Arial',
        color: '#000000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null,
        measuredWidth: 60,
        measuredHeight: 24
      }

      const center = getShapeCenter(text)
      
      expect(center).toEqual({
        x: 40,  // 10 + 60/2
        y: 32   // 20 + 24/2
      })
    })
  })
})
