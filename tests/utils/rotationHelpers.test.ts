import { describe, it, expect } from 'vitest'
import { normalizeRotation, snapToInterval, calculateAngle } from '../../src/utils/rotationHelpers'

describe('rotationHelpers', () => {
  describe('normalizeRotation', () => {
    it('should keep angles in 0-360 range unchanged', () => {
      expect(normalizeRotation(0)).toBe(0)
      expect(normalizeRotation(45)).toBe(45)
      expect(normalizeRotation(180)).toBe(180)
      expect(normalizeRotation(359)).toBe(359)
    })

    it('should normalize angles greater than 360', () => {
      expect(normalizeRotation(360)).toBe(0)
      expect(normalizeRotation(370)).toBe(10)
      expect(normalizeRotation(450)).toBe(90)
      expect(normalizeRotation(720)).toBe(0)
    })

    it('should normalize negative angles', () => {
      expect(normalizeRotation(-10)).toBe(350)
      expect(normalizeRotation(-90)).toBe(270)
      expect(normalizeRotation(-180)).toBe(180)
      expect(Math.abs(normalizeRotation(-360))).toBe(0) // Handle -0 vs 0
    })

    it('should handle large positive angles', () => {
      expect(normalizeRotation(1080)).toBe(0)
      expect(normalizeRotation(1125)).toBe(45)
    })

    it('should handle large negative angles', () => {
      expect(Math.abs(normalizeRotation(-720))).toBe(0) // Handle -0 vs 0
      expect(normalizeRotation(-765)).toBe(315)
    })

    it('should handle decimal angles', () => {
      expect(normalizeRotation(45.5)).toBe(45.5)
      expect(normalizeRotation(360.5)).toBe(0.5)
      expect(normalizeRotation(-45.5)).toBe(314.5)
    })
  })

  describe('snapToInterval', () => {
    it('should snap to 15° intervals', () => {
      expect(snapToInterval(0, 15)).toBe(0)
      expect(snapToInterval(7, 15)).toBe(0)
      expect(snapToInterval(8, 15)).toBe(15)
      expect(snapToInterval(22, 15)).toBe(15)
      expect(snapToInterval(23, 15)).toBe(30)
      expect(snapToInterval(45, 15)).toBe(45)
    })

    it('should snap to 45° intervals', () => {
      expect(snapToInterval(0, 45)).toBe(0)
      expect(snapToInterval(20, 45)).toBe(0)
      expect(snapToInterval(23, 45)).toBe(45)
      expect(snapToInterval(67, 45)).toBe(45)
      expect(snapToInterval(68, 45)).toBe(90)
    })

    it('should snap to 90° intervals', () => {
      expect(snapToInterval(0, 90)).toBe(0)
      expect(snapToInterval(44, 90)).toBe(0)
      expect(snapToInterval(45, 90)).toBe(90)
      expect(snapToInterval(135, 90)).toBe(180)
    })

    it('should handle negative angles', () => {
      expect(Math.abs(snapToInterval(-7, 15))).toBe(0) // Handle -0 vs 0
      expect(snapToInterval(-8, 15)).toBe(-15)
      expect(snapToInterval(-22, 15)).toBe(-15)
      expect(snapToInterval(-23, 15)).toBe(-30)
    })

    it('should handle decimal angles', () => {
      expect(snapToInterval(7.4, 15)).toBe(0)
      expect(snapToInterval(7.5, 15)).toBe(15)
      expect(snapToInterval(22.4, 15)).toBe(15)
      expect(snapToInterval(22.5, 15)).toBe(30)
    })

    it('should handle interval of 1 (no snapping)', () => {
      expect(snapToInterval(45.7, 1)).toBe(46)
      expect(snapToInterval(45.4, 1)).toBe(45)
    })
  })

  describe('calculateAngle', () => {
    it('should return 0° for point directly to the right', () => {
      const angle = calculateAngle(100, 100, 200, 100)
      expect(angle).toBe(0)
    })

    it('should return 90° for point directly below', () => {
      const angle = calculateAngle(100, 100, 100, 200)
      expect(angle).toBe(90)
    })

    it('should return 180° for point directly to the left', () => {
      const angle = calculateAngle(100, 100, 0, 100)
      expect(angle).toBe(180)
    })

    it('should return 270° for point directly above', () => {
      const angle = calculateAngle(100, 100, 100, 0)
      expect(angle).toBe(270)
    })

    it('should return 45° for point at diagonal (bottom-right)', () => {
      const angle = calculateAngle(0, 0, 100, 100)
      expect(angle).toBe(45)
    })

    it('should return 135° for point at diagonal (bottom-left)', () => {
      const angle = calculateAngle(100, 0, 0, 100)
      expect(angle).toBe(135)
    })

    it('should return 225° for point at diagonal (top-left)', () => {
      const angle = calculateAngle(100, 100, 0, 0)
      expect(angle).toBe(225)
    })

    it('should return 315° for point at diagonal (top-right)', () => {
      const angle = calculateAngle(0, 100, 100, 0)
      expect(angle).toBe(315)
    })

    it('should handle same point (undefined angle)', () => {
      const angle = calculateAngle(100, 100, 100, 100)
      // When dx=0 and dy=0, atan2(0,0) = 0
      expect(angle).toBe(0)
    })

    it('should handle negative coordinates', () => {
      const angle = calculateAngle(-100, -100, 0, 0)
      expect(angle).toBe(45)
    })

    it('should return normalized angle (0-360)', () => {
      const angle = calculateAngle(100, 100, 50, 50)
      expect(angle).toBeGreaterThanOrEqual(0)
      expect(angle).toBeLessThan(360)
    })

    it('should handle fractional coordinates', () => {
      const angle = calculateAngle(100.5, 100.5, 200.5, 100.5)
      expect(angle).toBeCloseTo(0, 5)
    })
  })

  describe('integration: normalizeRotation + snapToInterval', () => {
    it('should snap and normalize in sequence', () => {
      // Rotate 370° and snap to 15°
      const angle = normalizeRotation(370) // 10°
      const snapped = snapToInterval(angle, 15) // 15°
      expect(snapped).toBe(15)
    })

    it('should handle negative rotation with snap', () => {
      const angle = normalizeRotation(-23) // 337°
      const snapped = snapToInterval(angle, 15) // 330° or 345°
      expect([330, 345]).toContain(snapped)
    })
  })

  describe('integration: calculateAngle + snapToInterval', () => {
    it('should calculate angle and snap to 15° grid', () => {
      // Point slightly off 45° diagonal
      const angle = calculateAngle(0, 0, 100, 105)
      const snapped = snapToInterval(angle, 15)
      expect(snapped).toBe(45)
    })

    it('should calculate angle and snap to 90° cardinal directions', () => {
      // Point slightly off horizontal
      const angle = calculateAngle(100, 100, 200, 105)
      const snapped = snapToInterval(angle, 90)
      expect(snapped).toBe(0)
    })
  })
})

