import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CanvasService } from '../../src/services/canvasService'
import type { RectangleInput } from '../../src/services/canvasService'
import type { DataSnapshot, ThenableReference } from 'firebase/database'

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
    vi.mocked(dbPush).mockReturnValue({ key: 'test-rectangle-id' } as Partial<ThenableReference> as ThenableReference)
    
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
        color: '#3b82f6', // Default blue color
        createdBy: 'user123',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number)
      }))
    })

    it('should throw error if rectangle ID generation fails', async () => {
      const { dbPush } = await import('../../src/services/firebaseService')
      
      // Mock dbPush to return null key for this specific test
      vi.mocked(dbPush).mockReturnValueOnce({ key: null } as Partial<ThenableReference> as ThenableReference)

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
      } as Partial<DataSnapshot> as DataSnapshot)

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
      } as Partial<DataSnapshot> as DataSnapshot)

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
      } as Partial<DataSnapshot> as DataSnapshot)

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
      } as Partial<DataSnapshot> as DataSnapshot)

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
      } as Partial<DataSnapshot> as DataSnapshot)

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
      } as Partial<DataSnapshot> as DataSnapshot)

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
      } as Partial<DataSnapshot> as DataSnapshot)

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
      } as Partial<DataSnapshot> as DataSnapshot)

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
      } as Partial<DataSnapshot> as DataSnapshot)

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
      } as Partial<DataSnapshot> as DataSnapshot)

      const result = await canvasService.getRectangle('test-id')

      expect(result).toEqual(mockRectangle)
    })

    it('should return null when rectangle does not exist', async () => {
      const { dbGet } = await import('../../src/services/firebaseService')
      vi.mocked(dbGet).mockResolvedValue({ 
        exists: () => false 
      } as Partial<DataSnapshot> as DataSnapshot)

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
        callback(mockSnapshot as Partial<DataSnapshot> as DataSnapshot)
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
        callback(mockSnapshot as Partial<DataSnapshot> as DataSnapshot)
        return vi.fn() // Return unsubscribe function
      })

      canvasService.onRectanglesChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith([])
    })
  })

  describe('Exclusive Selection Logic', () => {
    beforeEach(async () => {
      const { dbGet } = await import('../../src/services/firebaseService')
      // Mock rectangle exists by default
      vi.mocked(dbGet).mockResolvedValue({
        exists: () => true,
        val: () => ({
          id: 'test-rectangle-id',
          x: 100,
          y: 150,
          width: 200,
          height: 100,
          color: '#3b82f6',
          createdBy: 'user123',
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      } as Partial<DataSnapshot> as DataSnapshot)
    })

    describe('selectRectangle', () => {
      it('should successfully select an unselected rectangle', async () => {
        const { dbUpdate } = await import('../../src/services/firebaseService')
        
        const result = await canvasService.selectRectangle('test-rectangle-id', 'user456', 'TestUser')
        
        expect(result).toBe(true)
        expect(dbUpdate).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            selectedBy: 'user456',
            selectedByUsername: 'TestUser',
            updatedAt: expect.any(Number)
          })
        )
      })

      it('should allow same user to select already selected rectangle', async () => {
        const { dbGet, dbUpdate } = await import('../../src/services/firebaseService')
        
        // Mock rectangle already selected by same user
        vi.mocked(dbGet).mockResolvedValueOnce({
          exists: () => true,
          val: () => ({
            id: 'test-rectangle-id',
            selectedBy: 'user456',
            selectedByUsername: 'TestUser'
          })
        } as Partial<DataSnapshot> as DataSnapshot)
        
        const result = await canvasService.selectRectangle('test-rectangle-id', 'user456', 'TestUser')
        
        expect(result).toBe(true)
        expect(dbUpdate).toHaveBeenCalled()
      })

      it('should reject selection if rectangle is selected by another user', async () => {
        const { dbGet, dbUpdate } = await import('../../src/services/firebaseService')
        
        // Mock rectangle selected by different user
        vi.mocked(dbGet).mockResolvedValueOnce({
          exists: () => true,
          val: () => ({
            id: 'test-rectangle-id',
            selectedBy: 'other-user',
            selectedByUsername: 'OtherUser'
          })
        } as Partial<DataSnapshot> as DataSnapshot)
        
        const result = await canvasService.selectRectangle('test-rectangle-id', 'user456', 'TestUser')
        
        expect(result).toBe(false)
        expect(dbUpdate).not.toHaveBeenCalled()
      })

      it('should return false if rectangle does not exist', async () => {
        const { dbGet, dbUpdate } = await import('../../src/services/firebaseService')
        
        vi.mocked(dbGet).mockResolvedValueOnce({
          exists: () => false
        } as Partial<DataSnapshot> as DataSnapshot)
        
        const result = await canvasService.selectRectangle('nonexistent-id', 'user456', 'TestUser')
        
        expect(result).toBe(false)
        expect(dbUpdate).not.toHaveBeenCalled()
      })
    })

    describe('deselectRectangle', () => {
      it('should successfully deselect rectangle selected by same user', async () => {
        const { dbGet, dbUpdate } = await import('../../src/services/firebaseService')
        
        // Mock rectangle selected by same user
        vi.mocked(dbGet).mockResolvedValueOnce({
          exists: () => true,
          val: () => ({
            id: 'test-rectangle-id',
            selectedBy: 'user456',
            selectedByUsername: 'TestUser'
          })
        } as Partial<DataSnapshot> as DataSnapshot)
        
        await canvasService.deselectRectangle('test-rectangle-id', 'user456')
        
        expect(dbUpdate).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            selectedBy: null,
            selectedByUsername: null,
            updatedAt: expect.any(Number)
          })
        )
      })

      it('should not deselect rectangle selected by different user', async () => {
        const { dbGet, dbUpdate } = await import('../../src/services/firebaseService')
        
        // Mock rectangle selected by different user
        vi.mocked(dbGet).mockResolvedValueOnce({
          exists: () => true,
          val: () => ({
            id: 'test-rectangle-id',
            selectedBy: 'other-user',
            selectedByUsername: 'OtherUser'
          })
        } as Partial<DataSnapshot> as DataSnapshot)
        
        await canvasService.deselectRectangle('test-rectangle-id', 'user456')
        
        expect(dbUpdate).not.toHaveBeenCalled()
      })

      it('should handle nonexistent rectangle gracefully', async () => {
        const { dbGet, dbUpdate } = await import('../../src/services/firebaseService')
        
        vi.mocked(dbGet).mockResolvedValueOnce({
          exists: () => false
        } as Partial<DataSnapshot> as DataSnapshot)
        
        await expect(canvasService.deselectRectangle('nonexistent-id', 'user456')).resolves.not.toThrow()
        expect(dbUpdate).not.toHaveBeenCalled()
      })
    })
  })

  describe('Rectangle Color Properties', () => {
    it('should create rectangle with default blue color when no color provided', async () => {
      const { dbSet } = await import('../../src/services/firebaseService')
      
      const rectangleInput: RectangleInput = {
        x: 100,
        y: 150,
        width: 200,
        height: 100,
        createdBy: 'user123'
      }

      const result = await canvasService.createRectangle(rectangleInput)

      expect(result.color).toBe('#3b82f6') // RECTANGLE_COLORS.BLUE
      expect(dbSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          color: '#3b82f6'
        })
      )
    })

    it('should create rectangle with specified color', async () => {
      const { dbSet } = await import('../../src/services/firebaseService')
      
      const rectangleInput: RectangleInput = {
        x: 100,
        y: 150,
        width: 200,
        height: 100,
        color: '#ef4444', // Red
        createdBy: 'user123'
      }

      const result = await canvasService.createRectangle(rectangleInput)

      expect(result.color).toBe('#ef4444')
      expect(dbSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          color: '#ef4444'
        })
      )
    })

    it('should create rectangle with no initial selection', async () => {
      const rectangleInput: RectangleInput = {
        x: 100,
        y: 150,
        width: 200,
        height: 100,
        createdBy: 'user123'
      }

      const result = await canvasService.createRectangle(rectangleInput)

      expect(result.selectedBy).toBeUndefined()
      expect(result.selectedByUsername).toBeUndefined()
    })
  })

  describe('clearUserSelections', () => {
    it('should clear all selections by a specific user', async () => {
      const { dbGet, dbUpdate } = await import('../../src/services/firebaseService')
      const userId = 'user123'
      const mockRectangles = {
        'rect1': {
          id: 'rect1',
          selectedBy: userId,
          selectedByUsername: 'Alice',
          x: 100,
          y: 100,
          width: 50,
          height: 50
        },
        'rect2': {
          id: 'rect2',
          selectedBy: 'otherUser',
          selectedByUsername: 'Bob',
          x: 200,
          y: 200,
          width: 50,
          height: 50
        },
        'rect3': {
          id: 'rect3',
          selectedBy: userId,
          selectedByUsername: 'Alice',
          x: 300,
          y: 300,
          width: 50,
          height: 50
        }
      }

      vi.mocked(dbGet).mockResolvedValueOnce({
        exists: () => true,
        val: () => mockRectangles
      } as Partial<DataSnapshot> as DataSnapshot)

      await canvasService.clearUserSelections(userId)

      expect(dbUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        {
          'rect1/selectedBy': null,
          'rect1/selectedByUsername': null,
          'rect1/updatedAt': expect.any(Number),
          'rect3/selectedBy': null,
          'rect3/selectedByUsername': null,
          'rect3/updatedAt': expect.any(Number)
        }
      )
    })

    it('should handle case when no rectangles exist', async () => {
      const { dbGet, dbUpdate } = await import('../../src/services/firebaseService')

      vi.mocked(dbGet).mockResolvedValueOnce({
        exists: () => false,
        val: () => null
      } as Partial<DataSnapshot> as DataSnapshot)

      await canvasService.clearUserSelections('user123')

      expect(dbUpdate).not.toHaveBeenCalled()
    })

    it('should handle case when user has no selections', async () => {
      const { dbGet, dbUpdate } = await import('../../src/services/firebaseService')
      const mockRectangles = {
        'rect1': {
          id: 'rect1',
          selectedBy: 'otherUser',
          selectedByUsername: 'Bob',
          x: 100,
          y: 100,
          width: 50,
          height: 50
        }
      }

      vi.mocked(dbGet).mockResolvedValueOnce({
        exists: () => true,
        val: () => mockRectangles
      } as Partial<DataSnapshot> as DataSnapshot)

      await canvasService.clearUserSelections('user123')

      expect(dbUpdate).not.toHaveBeenCalled()
    })

    it('should not throw error on database failure', async () => {
      const { dbGet } = await import('../../src/services/firebaseService')
      
      vi.mocked(dbGet).mockRejectedValueOnce(new Error('Database error'))

      // Should not throw
      await expect(canvasService.clearUserSelections('user123')).resolves.toBeUndefined()
    })
  })
})
