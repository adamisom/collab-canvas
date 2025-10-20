import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getLastViewedAt, updateLastViewedAt } from '../../src/services/commentsService'

const LAST_VIEWED_KEY = 'collab-canvas-comments-last-viewed'

describe('commentsService - localStorage helpers', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    // Clean up after each test
    localStorage.clear()
  })

  describe('getLastViewedAt', () => {
    it('should return 0 when no data exists', () => {
      const result = getLastViewedAt('shape-123')
      expect(result).toBe(0)
    })

    it('should return 0 when shape has not been viewed', () => {
      localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify({
        'shape-456': 1000000
      }))

      const result = getLastViewedAt('shape-123')
      expect(result).toBe(0)
    })

    it('should return correct timestamp for viewed shape', () => {
      const timestamp = 1234567890
      localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify({
        'shape-123': timestamp
      }))

      const result = getLastViewedAt('shape-123')
      expect(result).toBe(timestamp)
    })

    it('should handle multiple shapes correctly', () => {
      const timestamp1 = 1000000
      const timestamp2 = 2000000
      localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify({
        'shape-1': timestamp1,
        'shape-2': timestamp2
      }))

      expect(getLastViewedAt('shape-1')).toBe(timestamp1)
      expect(getLastViewedAt('shape-2')).toBe(timestamp2)
      expect(getLastViewedAt('shape-3')).toBe(0)
    })

    it('should return 0 when localStorage data is corrupted', () => {
      localStorage.setItem(LAST_VIEWED_KEY, 'invalid-json{')

      const result = getLastViewedAt('shape-123')
      expect(result).toBe(0)
    })

    it('should return 0 when localStorage throws error', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const result = getLastViewedAt('shape-123')
      expect(result).toBe(0)

      vi.restoreAllMocks()
    })
  })

  describe('updateLastViewedAt', () => {
    it('should create new entry when no data exists', () => {
      const timestamp = 1234567890
      updateLastViewedAt('shape-123', timestamp)

      const stored = JSON.parse(localStorage.getItem(LAST_VIEWED_KEY)!)
      expect(stored['shape-123']).toBe(timestamp)
    })

    it('should update existing shape timestamp', () => {
      const oldTimestamp = 1000000
      const newTimestamp = 2000000
      
      localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify({
        'shape-123': oldTimestamp
      }))

      updateLastViewedAt('shape-123', newTimestamp)

      const stored = JSON.parse(localStorage.getItem(LAST_VIEWED_KEY)!)
      expect(stored['shape-123']).toBe(newTimestamp)
    })

    it('should preserve other shapes when updating one', () => {
      const timestamp1 = 1000000
      const timestamp2 = 2000000
      const timestamp3 = 3000000

      localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify({
        'shape-1': timestamp1,
        'shape-2': timestamp2
      }))

      updateLastViewedAt('shape-1', timestamp3)

      const stored = JSON.parse(localStorage.getItem(LAST_VIEWED_KEY)!)
      expect(stored['shape-1']).toBe(timestamp3) // Updated
      expect(stored['shape-2']).toBe(timestamp2) // Preserved
    })

    it('should handle adding new shape to existing data', () => {
      const timestamp1 = 1000000
      const timestamp2 = 2000000

      localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify({
        'shape-1': timestamp1
      }))

      updateLastViewedAt('shape-2', timestamp2)

      const stored = JSON.parse(localStorage.getItem(LAST_VIEWED_KEY)!)
      expect(stored['shape-1']).toBe(timestamp1)
      expect(stored['shape-2']).toBe(timestamp2)
    })

    it('should log error but not throw when data is corrupted', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      localStorage.setItem(LAST_VIEWED_KEY, 'invalid-json{')

      const timestamp = 1234567890
      
      // Should not throw
      expect(() => {
        updateLastViewedAt('shape-123', timestamp)
      }).not.toThrow()

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalled()

      // Corrupted data remains (error handling doesn't overwrite)
      expect(localStorage.getItem(LAST_VIEWED_KEY)).toBe('invalid-json{')

      vi.restoreAllMocks()
    })

    it('should not throw when localStorage fails', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage error')
      })

      expect(() => {
        updateLastViewedAt('shape-123', 1234567890)
      }).not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalled()

      vi.restoreAllMocks()
    })
  })

  describe('Integration scenarios', () => {
    it('should support typical read-write-read workflow', () => {
      const shapeId = 'shape-123'
      
      // Initial read - no data
      expect(getLastViewedAt(shapeId)).toBe(0)

      // Write timestamp
      const timestamp1 = 1000000
      updateLastViewedAt(shapeId, timestamp1)

      // Read back
      expect(getLastViewedAt(shapeId)).toBe(timestamp1)

      // Update timestamp
      const timestamp2 = 2000000
      updateLastViewedAt(shapeId, timestamp2)

      // Read updated value
      expect(getLastViewedAt(shapeId)).toBe(timestamp2)
    })

    it('should handle multiple shapes independently', () => {
      const shapes = ['rect-1', 'circle-2', 'line-3', 'text-4']
      const timestamps = [1000, 2000, 3000, 4000]

      // Update all shapes
      shapes.forEach((shapeId, i) => {
        updateLastViewedAt(shapeId, timestamps[i])
      })

      // Verify all shapes
      shapes.forEach((shapeId, i) => {
        expect(getLastViewedAt(shapeId)).toBe(timestamps[i])
      })

      // Update one shape
      updateLastViewedAt('circle-2', 9999)

      // Verify only that shape changed
      expect(getLastViewedAt('rect-1')).toBe(1000)
      expect(getLastViewedAt('circle-2')).toBe(9999)
      expect(getLastViewedAt('line-3')).toBe(3000)
      expect(getLastViewedAt('text-4')).toBe(4000)
    })
  })
})

