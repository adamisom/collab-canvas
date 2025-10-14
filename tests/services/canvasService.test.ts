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
  
  beforeEach(() => {
    vi.clearAllMocks()
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
      vi.mocked(dbPush).mockReturnValue({ key: null } as any)

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
      const { dbUpdate } = await import('../../src/services/firebaseService')

      const updates = {
        x: 200,
        y: 250,
        width: 300,
        height: 150
      }

      await canvasService.updateRectangle('test-id', updates)

      expect(dbUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...updates,
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
      })

      canvasService.onRectanglesChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith([])
    })
  })
})
