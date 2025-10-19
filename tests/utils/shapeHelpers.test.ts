import { describe, it, expect } from 'vitest'
import { getShapeBounds, getShapeCenter } from '../../src/utils/shapeHelpers'
import type { Shape } from '../../src/shared/shapes'

describe('shapeHelpers', () => {
  describe('getShapeBounds', () => {
    describe('rectangle bounds', () => {
      const createRectangle = (x: number, y: number, width: number, height: number): Shape => ({
        id: 'rect1',
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

      it('should return correct bounds for rectangle', () => {
        const rect = createRectangle(100, 50, 80, 60)
        const bounds = getShapeBounds(rect)
        
        expect(bounds).toEqual({
          x: 100,
          y: 50,
          width: 80,
          height: 60
        })
      })

      it('should handle rectangle at origin', () => {
        const rect = createRectangle(0, 0, 100, 100)
        const bounds = getShapeBounds(rect)
        
        expect(bounds).toEqual({
          x: 0,
          y: 0,
          width: 100,
          height: 100
        })
      })

      it('should handle negative coordinates', () => {
        const rect = createRectangle(-50, -30, 40, 20)
        const bounds = getShapeBounds(rect)
        
        expect(bounds).toEqual({
          x: -50,
          y: -30,
          width: 40,
          height: 20
        })
      })
    })

    describe('circle bounds', () => {
      const createCircle = (x: number, y: number, radius: number): Shape => ({
        id: 'circle1',
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

      it('should return correct bounds for circle', () => {
        const circle = createCircle(100, 100, 30)
        const bounds = getShapeBounds(circle)
        
        expect(bounds).toEqual({
          x: 70,
          y: 70,
          width: 60,
          height: 60
        })
      })

      it('should handle circle at origin', () => {
        const circle = createCircle(0, 0, 50)
        const bounds = getShapeBounds(circle)
        
        expect(bounds).toEqual({
          x: -50,
          y: -50,
          width: 100,
          height: 100
        })
      })

      it('should handle small radius', () => {
        const circle = createCircle(100, 100, 5)
        const bounds = getShapeBounds(circle)
        
        expect(bounds).toEqual({
          x: 95,
          y: 95,
          width: 10,
          height: 10
        })
      })
    })

    describe('line bounds', () => {
      const createLine = (x: number, y: number, endX: number, endY: number): Shape => ({
        id: 'line1',
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

      it('should return correct bounds for horizontal line', () => {
        const line = createLine(50, 100, 200, 100)
        const bounds = getShapeBounds(line)
        
        expect(bounds).toEqual({
          x: 50,
          y: 100,
          width: 150,
          height: 0
        })
      })

      it('should return correct bounds for vertical line', () => {
        const line = createLine(100, 50, 100, 200)
        const bounds = getShapeBounds(line)
        
        expect(bounds).toEqual({
          x: 100,
          y: 50,
          width: 0,
          height: 150
        })
      })

      it('should return correct bounds for diagonal line', () => {
        const line = createLine(50, 50, 150, 200)
        const bounds = getShapeBounds(line)
        
        expect(bounds).toEqual({
          x: 50,
          y: 50,
          width: 100,
          height: 150
        })
      })

      it('should handle line drawn backwards (end before start)', () => {
        const line = createLine(200, 200, 50, 50)
        const bounds = getShapeBounds(line)
        
        expect(bounds).toEqual({
          x: 50,
          y: 50,
          width: 150,
          height: 150
        })
      })
    })

    describe('text bounds', () => {
      const createText = (
        x: number, 
        y: number, 
        text: string, 
        fontSize: number,
        measuredWidth?: number,
        measuredHeight?: number
      ): Shape => ({
        id: 'text1',
        type: 'text',
        x,
        y,
        text,
        fontSize,
        fontFamily: 'Arial',
        measuredWidth,
        measuredHeight,
        color: '#000000',
        createdBy: 'user1',
        createdAt: Date.now(),
        zIndex: 1000,
        selectedBy: null,
        selectedByUsername: null,
        selectedAt: null
      })

      it('should use measured dimensions when available', () => {
        const text = createText(100, 100, 'Hello', 20, 50, 24)
        const bounds = getShapeBounds(text)
        
        expect(bounds).toEqual({
          x: 100,
          y: 100,
          width: 50,
          height: 24
        })
      })

      it('should estimate dimensions when measurements unavailable', () => {
        const text = createText(100, 100, 'Hello', 20)
        const bounds = getShapeBounds(text)
        
        // Estimation: width = length * fontSize * 0.6, height = fontSize * 1.2
        expect(bounds.x).toBe(100)
        expect(bounds.y).toBe(100)
        expect(bounds.width).toBe(5 * 20 * 0.6) // 60
        expect(bounds.height).toBe(20 * 1.2) // 24
      })

      it('should handle empty text', () => {
        const text = createText(100, 100, '', 20)
        const bounds = getShapeBounds(text)
        
        expect(bounds.width).toBe(0)
        expect(bounds.height).toBe(24)
      })

      it('should handle long text', () => {
        const text = createText(50, 50, 'This is a long text string', 16, 200, 20)
        const bounds = getShapeBounds(text)
        
        expect(bounds).toEqual({
          x: 50,
          y: 50,
          width: 200,
          height: 20
        })
      })
    })
  })

  describe('getShapeCenter', () => {
    describe('rectangle center', () => {
      const createRectangle = (x: number, y: number, width: number, height: number): Shape => ({
        id: 'rect1',
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

      it('should return correct center for rectangle', () => {
        const rect = createRectangle(100, 50, 80, 60)
        const center = getShapeCenter(rect)
        
        expect(center).toEqual({ x: 140, y: 80 })
      })

      it('should handle rectangle at origin', () => {
        const rect = createRectangle(0, 0, 100, 100)
        const center = getShapeCenter(rect)
        
        expect(center).toEqual({ x: 50, y: 50 })
      })
    })

    describe('circle center', () => {
      const createCircle = (x: number, y: number, radius: number): Shape => ({
        id: 'circle1',
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

      it('should return circle position as center', () => {
        const circle = createCircle(100, 100, 30)
        const center = getShapeCenter(circle)
        
        expect(center).toEqual({ x: 100, y: 100 })
      })
    })

    describe('line center', () => {
      const createLine = (x: number, y: number, endX: number, endY: number): Shape => ({
        id: 'line1',
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

      it('should return midpoint of line', () => {
        const line = createLine(0, 0, 100, 100)
        const center = getShapeCenter(line)
        
        expect(center).toEqual({ x: 50, y: 50 })
      })

      it('should handle horizontal line', () => {
        const line = createLine(50, 100, 200, 100)
        const center = getShapeCenter(line)
        
        expect(center).toEqual({ x: 125, y: 100 })
      })

      it('should handle vertical line', () => {
        const line = createLine(100, 50, 100, 200)
        const center = getShapeCenter(line)
        
        expect(center).toEqual({ x: 100, y: 125 })
      })
    })

    describe('text center', () => {
      const createText = (
        x: number, 
        y: number, 
        text: string, 
        fontSize: number,
        measuredWidth?: number,
        measuredHeight?: number
      ): Shape => ({
        id: 'text1',
        type: 'text',
        x,
        y,
        text,
        fontSize,
        fontFamily: 'Arial',
        measuredWidth,
        measuredHeight,
        color: '#000000',
        createdBy: 'user1',
        createdAt: Date.now(),
        zIndex: 1000,
        selectedBy: null,
        selectedByUsername: null,
        selectedAt: null
      })

      it('should calculate center using measured dimensions', () => {
        const text = createText(100, 100, 'Hello', 20, 50, 24)
        const center = getShapeCenter(text)
        
        expect(center).toEqual({ x: 125, y: 112 })
      })

      it('should calculate center using estimated dimensions', () => {
        const text = createText(100, 100, 'Hello', 20)
        const center = getShapeCenter(text)
        
        // Estimated width = 60, height = 24
        expect(center).toEqual({ x: 130, y: 112 })
      })
    })
  })
})

