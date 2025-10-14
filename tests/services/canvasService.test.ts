import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CanvasService } from '../../src/services/canvasService'
import type { RectangleInput } from '../../src/services/canvasService'

// Mock Firebase
vi.mock('../../src/services/firebaseService', () => ({
  firebaseDatabase: {},
  dbRef: vi.fn(() => ({ key: 'mock-ref' })),
  dbSet: vi.fn(),
  dbGet: vi.fn(),
  dbOnValue: vi.fn(),
  dbOff: vi.fn(),
  dbPush: vi.fn(() => ({ key: 'test-rectangle-id' })),
  dbUpdate: vi.fn(),
  dbRemove: vi.fn()
}))

describe('CanvasService', () => {
  let canvasService: CanvasService
  
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Reset dbPush to default value
    const { dbPush } = await import('../../src/services/firebaseService')
    vi.mocked(dbPush).mockReturnValue({ key: 'test-rectangle-id' } as any)
    
    canvasService = new CanvasService()
  })

  describe('createRectangle', () => {
    it('should create a rectangle with valid data', async () => {
      const { dbSet, dbPush } = await import('../../src/services/firebaseService')
      
      const rectangleInput: RectangleInput = {
        x: 100,
        y: 150,
        width: 200,
        height: 100,
        createdBy: 'user123'
      }

      const result = await canvasService.createRectangle(rectangleInput)

      expect(dbPush).toHaveBeenCalled()
      expect(dbSet).toHaveBeenCalled()
      expect(result).toEqual(expect.objectContaining({
        id: 'test-rectangle-id',
        x: 100,
        y: 150,
        width: 200,
        height: 100,
        createdBy: 'user123',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number)
      }))
    })

    it('should throw error if rectangle ID generation fails', async () => {
      const { dbPush } = await import('../../src/services/firebaseService')
      
      // Mock dbPush to return null key for this specific test
      vi.mocked(dbPush).mockReturnValueOnce({ key: null } as any)

      const rectangleInput: RectangleInput = {
        x: 100,
        y: 150,
        width: 200,
        height: 100,
        createdBy: 'user123'
      }

      await expect(canvasService.createRectangle(rectangleInput)).rejects.toThrow('Failed to generate rectangle ID')
    })
  })

  describe('updateRectangle', () => {
    it('should update rectangle with new data and timestamp', async () => {
      const { dbUpdate, dbGet } = await import('../../src/services/firebaseService')
      
      // Mock dbGet to return existing rectangle
      vi.mocked(dbGet).mockResolvedValue({
        exists: () => true,
        val: () => ({ id: 'test-id', x: 100, y: 100 })
      } as any)

      const updates = {
        x: 200,
        y: 250,
        width: 300,
        height: 150
      }

      await canvasService.updateRectangle('test-id', updates)

      expect(dbGet).toHaveBeenCalled()
      expect(dbUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...updates,
          updatedAt: expect.any(Number)
        })
      )
    })

    it('should handle race condition when rectangle no longer exists', async () => {
      const { dbUpdate, dbGet } = await import('../../src/services/firebaseService')
      
      // Mock dbGet to return non-existing rectangle
      vi.mocked(dbGet).mockResolvedValue({
        exists: () => false
      } as any)

      const updates = {
        x: 200,
        y: 250,
        width: 300,
        height: 150
      }

      // Should not throw an error - should silently ignore
      await expect(canvasService.updateRectangle('test-id', updates)).resolves.toBeUndefined()

      expect(dbGet).toHaveBeenCalled()
      expect(dbUpdate).not.toHaveBeenCalled() // Should not update if rectangle doesn't exist
    })
  })

  describe('resizeRectangle', () => {
    it('should resize rectangle with dimension validation', async () => {
      const { dbUpdate, dbGet } = await import('../../src/services/firebaseService')
      
      // Mock dbGet to return existing rectangle
      vi.mocked(dbGet).mockResolvedValue({
        exists: () => true,
        val: () => ({ id: 'test-id', x: 100, y: 100 })
      } as any)

      await canvasService.resizeRectangle('test-id', 200, 150)

      expect(dbGet).toHaveBeenCalled()
      expect(dbUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          width: 200,
          height: 150,
          updatedAt: expect.any(Number)
        })
      )
    })

    it('should resize rectangle with position updates', async () => {
      const { dbUpdate, dbGet } = await import('../../src/services/firebaseService')
      
      // Mock dbGet to return existing rectangle
      vi.mocked(dbGet).mockResolvedValue({
        exists: () => true,
        val: () => ({ id: 'test-id', x: 100, y: 100 })
      } as any)

      await canvasService.resizeRectangle('test-id', 200, 150, 100, 50)

      expect(dbGet).toHaveBeenCalled()
      expect(dbUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          width: 200,
          height: 150,
          x: 100,
          y: 50,
          updatedAt: expect.any(Number)
        })
      )
    })

    it('should enforce minimum dimensions', async () => {
      const { dbUpdate, dbGet } = await import('../../src/services/firebaseService')
      
      // Mock dbGet to return existing rectangle
      vi.mocked(dbGet).mockResolvedValue({
        exists: () => true,
        val: () => ({ id: 'test-id', x: 100, y: 100 })
      } as any)

      // Try to resize smaller than minimum (20x20)
      await canvasService.resizeRectangle('test-id', 10, 5)

      expect(dbGet).toHaveBeenCalled()
      expect(dbUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          width: 20, // Should be constrained to minimum
          height: 20, // Should be constrained to minimum
          updatedAt: expect.any(Number)
        })
      )
    })

    it('should enforce maximum dimensions', async () => {
      const { dbUpdate, dbGet } = await import('../../src/services/firebaseService')
      
      // Mock dbGet to return existing rectangle
      vi.mocked(dbGet).mockResolvedValue({
        exists: () => true,
        val: () => ({ id: 'test-id', x: 100, y: 100 })
      } as any)

      // Try to resize larger than canvas
      await canvasService.resizeRectangle('test-id', 5000, 4000)

      expect(dbGet).toHaveBeenCalled()
      expect(dbUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          width: 3000, // Should be constrained to canvas width
          height: 3000, // Should be constrained to canvas height
          updatedAt: expect.any(Number)
        })
      )
    })

    it('should constrain position to canvas bounds', async () => {
      const { dbUpdate, dbGet } = await import('../../src/services/firebaseService')
      
      // Mock dbGet to return existing rectangle
      vi.mocked(dbGet).mockResolvedValue({
        exists: () => true,
        val: () => ({ id: 'test-id', x: 100, y: 100 })
      } as any)

      // Try to position outside canvas
      await canvasService.resizeRectangle('test-id', 100, 100, -50, -50)

      expect(dbGet).toHaveBeenCalled()
      expect(dbUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          width: 100,
          height: 100,
          x: 0, // Should be constrained to canvas minimum
          y: 0, // Should be constrained to canvas minimum
          updatedAt: expect.any(Number)
        })
      )
    })
  })

  describe('deleteRectangle', () => {
    it('should call dbRemove with correct reference', async () => {
      const { dbRemove } = await import('../../src/services/firebaseService')

      await canvasService.deleteRectangle('test-id')

      expect(dbRemove).toHaveBeenCalled()
    })
  })

  describe('getAllRectangles', () => {
    it('should return empty array when no rectangles exist', async () => {
      const { dbGet } = await import('../../src/services/firebaseService')
      vi.mocked(dbGet).mockResolvedValue({ 
        exists: () => false 
      } as any)

      const result = await canvasService.getAllRectangles()

      expect(result).toEqual([])
    })

    it('should return rectangles array when data exists', async () => {
      const { dbGet } = await import('../../src/services/firebaseService')
      const mockData = {
        'rect1': { id: 'rect1', x: 0, y: 0, width: 100, height: 100 },
        'rect2': { id: 'rect2', x: 200, y: 200, width: 150, height: 150 }
      }
      
      vi.mocked(dbGet).mockResolvedValue({ 
        exists: () => true,
        val: () => mockData
      } as any)

      const result = await canvasService.getAllRectangles()

      expect(result).toHaveLength(2)
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'rect1' }),
        expect.objectContaining({ id: 'rect2' })
      ]))
    })
  })

  describe('getRectangle', () => {
    it('should return rectangle when it exists', async () => {
      const { dbGet } = await import('../../src/services/firebaseService')
      const mockRectangle = { 
        id: 'test-id', 
        x: 100, 
        y: 100, 
        width: 200, 
        height: 150 
      }
      
      vi.mocked(dbGet).mockResolvedValue({ 
        exists: () => true,
        val: () => mockRectangle
      } as any)

      const result = await canvasService.getRectangle('test-id')

      expect(result).toEqual(mockRectangle)
    })

    it('should return null when rectangle does not exist', async () => {
      const { dbGet } = await import('../../src/services/firebaseService')
      vi.mocked(dbGet).mockResolvedValue({ 
        exists: () => false 
      } as any)

      const result = await canvasService.getRectangle('nonexistent-id')

      expect(result).toBeNull()
    })
  })

  describe('onRectanglesChange', () => {
    it('should call callback with rectangles when data exists', async () => {
      const { dbOnValue } = await import('../../src/services/firebaseService')
      const mockCallback = vi.fn()
      const mockData = {
        'rect1': { id: 'rect1', x: 0, y: 0 }
      }

      // Mock the listener
      vi.mocked(dbOnValue).mockImplementation((ref, callback) => {
        const mockSnapshot = {
          exists: () => true,
          val: () => mockData
        }
        callback(mockSnapshot as any)
        return vi.fn() // Return unsubscribe function
      })

      canvasService.onRectanglesChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith([{ id: 'rect1', x: 0, y: 0 }])
    })

    it('should call callback with empty array when no data exists', async () => {
      const { dbOnValue } = await import('../../src/services/firebaseService')
      const mockCallback = vi.fn()

      // Mock the listener
      vi.mocked(dbOnValue).mockImplementation((ref, callback) => {
        const mockSnapshot = {
          exists: () => false
        }
        callback(mockSnapshot as any)
        return vi.fn() // Return unsubscribe function
      })

      canvasService.onRectanglesChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith([])
    })
  })
})
