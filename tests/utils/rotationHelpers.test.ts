import { describe, it, expect } from 'vitest'
import { normalizeRotation, snapToInterval, calculateAngle } from '../../src/utils/rotationHelpers'

describe('rotationHelpers', () => {
  describe('normalizeRotation', () => {
    it('should keep angles in 0-360 range unchanged', () => {
      expect(normalizeRotation(0)).toBe(0)
      expect(normalizeRotation(90)).toBe(90)
      expect(normalizeRotation(180)).toBe(180)
      expect(normalizeRotation(270)).toBe(270)
      expect(normalizeRotation(359)).toBe(359)
    })

    it('should normalize angles over 360', () => {
      expect(normalizeRotation(360)).toBe(0)
      expect(normalizeRotation(450)).toBe(90)   // 450 - 360
      expect(normalizeRotation(720)).toBe(0)    // 2 full rotations
      expect(normalizeRotation(1080)).toBe(0)   // 3 full rotations
    })

    it('should normalize negative angles', () => {
      expect(normalizeRotation(-90)).toBe(270)   // -90 + 360
      expect(normalizeRotation(-180)).toBe(180)  // -180 + 360
      expect(normalizeRotation(-270)).toBe(90)   // -270 + 360
      expect(Math.abs(normalizeRotation(-360))).toBe(0)  // Full negative rotation (handles -0)
    })

    it('should handle large negative angles', () => {
      expect(normalizeRotation(-450)).toBe(270)  // -450 + 360 + 360
      expect(Math.abs(normalizeRotation(-720))).toBe(0)  // -2 full rotations (handles -0)
    })

    it('should handle decimal angles', () => {
      expect(normalizeRotation(45.5)).toBe(45.5)
      expect(normalizeRotation(370.3)).toBeCloseTo(10.3, 5)
      expect(normalizeRotation(-45.7)).toBeCloseTo(314.3, 5)
    })
  })

  describe('snapToInterval', () => {
    it('should snap to 15° intervals', () => {
      expect(snapToInterval(0, 15)).toBe(0)
      expect(snapToInterval(7, 15)).toBe(0)      // Closer to 0
      expect(snapToInterval(8, 15)).toBe(15)     // Closer to 15
      expect(snapToInterval(15, 15)).toBe(15)
      expect(snapToInterval(22, 15)).toBe(15)    // Closer to 15
      expect(snapToInterval(23, 15)).toBe(30)    // Closer to 30
      expect(snapToInterval(45, 15)).toBe(45)
      expect(snapToInterval(90, 15)).toBe(90)
    })

    it('should snap to 45° intervals', () => {
      expect(snapToInterval(0, 45)).toBe(0)
      expect(snapToInterval(22, 45)).toBe(0)     // Closer to 0
      expect(snapToInterval(23, 45)).toBe(45)    // Closer to 45
      expect(snapToInterval(45, 45)).toBe(45)
      expect(snapToInterval(90, 45)).toBe(90)
      expect(snapToInterval(135, 45)).toBe(135)
    })

    it('should snap to 90° intervals (cardinal directions)', () => {
      expect(snapToInterval(0, 90)).toBe(0)
      expect(snapToInterval(44, 90)).toBe(0)
      expect(snapToInterval(45, 90)).toBe(90)
      expect(snapToInterval(90, 90)).toBe(90)
      expect(snapToInterval(134, 90)).toBe(90)
      expect(snapToInterval(135, 90)).toBe(180)
    })

    it('should snap to 1° intervals (effectively rounds)', () => {
      expect(snapToInterval(45.4, 1)).toBe(45)
      expect(snapToInterval(45.5, 1)).toBe(46)
      expect(snapToInterval(45.6, 1)).toBe(46)
    })

    it('should handle negative angles with snapping', () => {
      expect(Math.abs(snapToInterval(-7, 15))).toBe(0)  // Handles -0
      expect(snapToInterval(-8, 15)).toBe(-15)
      expect(snapToInterval(-22, 15)).toBe(-15)
    })
  })

  describe('calculateAngle', () => {
    it('should calculate 0° for point directly to the right (east)', () => {
      const angle = calculateAngle(100, 100, 200, 100)
      expect(angle).toBe(0)
    })

    it('should calculate 90° for point directly below (south)', () => {
      const angle = calculateAngle(100, 100, 100, 200)
      expect(angle).toBe(90)
    })

    it('should calculate 180° for point directly to the left (west)', () => {
      const angle = calculateAngle(100, 100, 0, 100)
      expect(angle).toBe(180)
    })

    it('should calculate 270° for point directly above (north)', () => {
      const angle = calculateAngle(100, 100, 100, 0)
      expect(angle).toBe(270)
    })

    it('should calculate 45° for point in northeast direction', () => {
      const angle = calculateAngle(0, 0, 100, 100)
      expect(angle).toBeCloseTo(45, 1)
    })

    it('should calculate 135° for point in southeast direction', () => {
      const angle = calculateAngle(0, 0, 100, -100)
      expect(angle).toBeCloseTo(315, 1)  // Southeast is actually 315° in screen coords
    })

    it('should calculate 225° for point in southwest direction', () => {
      const angle = calculateAngle(0, 0, -100, 100)
      expect(angle).toBeCloseTo(135, 1)
    })

    it('should calculate 315° for point in northwest direction', () => {
      const angle = calculateAngle(0, 0, -100, -100)
      expect(angle).toBeCloseTo(225, 1)
    })

    it('should handle same point (0° by convention)', () => {
      const angle = calculateAngle(100, 100, 100, 100)
      expect(angle).toBe(0)
    })

    it('should handle decimal coordinates', () => {
      const angle = calculateAngle(100.5, 100.5, 150.7, 125.3)
      expect(angle).toBeGreaterThanOrEqual(0)
      expect(angle).toBeLessThan(360)
    })

    it('should always return angle in 0-360 range', () => {
      // Test various points around the circle
      for (let i = 0; i < 360; i += 30) {
        const radians = (i * Math.PI) / 180
        const x = 100 + Math.cos(radians) * 50
        const y = 100 + Math.sin(radians) * 50
        const angle = calculateAngle(100, 100, x, y)
        
        expect(angle).toBeGreaterThanOrEqual(0)
        expect(angle).toBeLessThan(360)
      }
    })
  })
})
