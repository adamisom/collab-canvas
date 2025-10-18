import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CursorService } from '../../src/services/cursorService'
import type { CursorPosition } from '../../src/services/cursorService'

// Mock Firebase
vi.mock('../../src/services/firebaseService', () => ({
  firebaseDatabase: {},
  dbRef: vi.fn(() => ({ key: 'mock-ref' })),
  dbSet: vi.fn(),
  dbGet: vi.fn(),
  dbOnValue: vi.fn(),
  dbOff: vi.fn(),
  dbRemove: vi.fn()
}))

// Mock canvas helpers
vi.mock('../../src/utils/canvasHelpers', () => ({
  throttle: vi.fn((fn) => fn) // Return the function directly for testing
}))

describe('CursorService', () => {
  let cursorService: CursorService
  
  beforeEach(() => {
    vi.clearAllMocks()
    cursorService = new CursorService()
  })

  describe('updateCursor', () => {
    it('should update cursor position with throttling', async () => {
      const { dbSet } = await import('../../src/services/firebaseService')
      
      await cursorService.updateCursor('user123', 100, 200, 'TestUser')

      expect(dbSet).toHaveBeenCalled()
      
      // Get the cursor data that was set
      const setCall = vi.mocked(dbSet).mock.calls[0]
      const cursorData = setCall[1] as CursorPosition
      
      expect(cursorData).toEqual(expect.objectContaining({
        x: 100,
        y: 200,
        username: 'TestUser',
        userId: 'user123',
        timestamp: expect.any(Number)
      }))
    })
  })

  describe('removeCursor', () => {
    it('should remove user cursor from Firebase', async () => {
      const { dbRemove } = await import('../../src/services/firebaseService')
      
      await cursorService.removeCursor('user123')
      
      expect(dbRemove).toHaveBeenCalled()
    })
  })

  describe('getAllCursors', () => {
    it('should return empty object when no cursors exist', async () => {
      const { dbGet } = await import('../../src/services/firebaseService')
      vi.mocked(dbGet).mockResolvedValue({ 
        exists: () => false 
      } as any)

      const result = await cursorService.getAllCursors()

      expect(result).toEqual({})
    })

    it('should return active cursors and filter out stale ones', async () => {
      const { dbGet } = await import('../../src/services/firebaseService')
      const now = Date.now()
      
      const mockData = {
        'user1': { 
          x: 100, 
          y: 200, 
          username: 'User1', 
          userId: 'user1',
          timestamp: now - 1000 // 1 second ago (active)
        },
        'user2': { 
          x: 300, 
          y: 400, 
          username: 'User2', 
          userId: 'user2',
          timestamp: now - 60000 // 60 seconds ago (stale)
        }
      }
      
      vi.mocked(dbGet).mockResolvedValue({ 
        exists: () => true,
        val: () => mockData
      } as any)

      const result = await cursorService.getAllCursors()

      expect(result).toHaveProperty('user1')
      expect(result).not.toHaveProperty('user2') // Should filter out stale cursor
    })
  })

  describe('onCursorsChange', () => {
    it('should call callback with active cursors when data exists', async () => {
      const { dbOnValue } = await import('../../src/services/firebaseService')
      const mockCallback = vi.fn()
      const now = Date.now()
      
      const mockData = {
        'user1': { 
          x: 100, 
          y: 200, 
          username: 'User1', 
          userId: 'user1',
          timestamp: now - 1000 // Active cursor
        }
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

      cursorService.onCursorsChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith({ 'user1': mockData.user1 })
    })

    it('should call callback with empty object when no data exists', async () => {
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

      cursorService.onCursorsChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith({})
    })

    it('should filter out stale cursors in real-time updates', async () => {
      const { dbOnValue } = await import('../../src/services/firebaseService')
      const mockCallback = vi.fn()
      const now = Date.now()
      
      const mockData = {
        'user1': { 
          x: 100, 
          y: 200, 
          username: 'User1', 
          userId: 'user1',
          timestamp: now - 1000 // Active
        },
        'user2': { 
          x: 300, 
          y: 400, 
          username: 'User2', 
          userId: 'user2',
          timestamp: now - 35000 // Stale (>30 seconds)
        }
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

      cursorService.onCursorsChange(mockCallback)

      const callbackArg = vi.mocked(mockCallback).mock.calls[0][0]
      expect(callbackArg).toHaveProperty('user1')
      expect(callbackArg).not.toHaveProperty('user2') // Stale cursor filtered out
    })
  })

  describe('cleanupStaleCursors', () => {
    it('should remove cursors older than 30 seconds', async () => {
      const { dbRemove, dbRef } = await import('../../src/services/firebaseService')
      const now = Date.now()
      
      const mockData = {
        'user1': { 
          x: 100, 
          y: 200, 
          username: 'User1', 
          userId: 'user1',
          timestamp: now - 1000 // Active
        },
        'user2': { 
          x: 300, 
          y: 400, 
          username: 'User2', 
          userId: 'user2',
          timestamp: now - 35000 // Stale
        }
      }
      
      // Mock getAllCursors to return the full data (including stale cursors)
      // We need to spy on the actual getAllCursors method rather than mocking dbGet
      vi.spyOn(cursorService, 'getAllCursors').mockResolvedValue(mockData)
      
      // Mock dbRef to return a reference for each cursor
      vi.mocked(dbRef).mockReturnValue({ key: 'mock-ref' } as any)

      await cursorService.cleanupStaleCursors()

      // Should remove stale cursor - dbRemove should be called
      expect(dbRemove).toHaveBeenCalled()
    })
  })
})
