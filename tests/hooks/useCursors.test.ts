import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCursors } from '../../src/hooks/useCursors'

// Mock the AuthContext
const mockUser = { uid: 'user1' }
const mockUsername = 'Alice'

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    username: mockUsername
  }))
}))

// Mock the cursorService
vi.mock('../../src/services/cursorService', () => ({
  cursorService: {
    updateCursor: vi.fn(),
    onCursorsChange: vi.fn(),
    removeCursor: vi.fn()
  }
}))

describe('useCursors Hook', () => {
  let mockUpdateCursor: any
  let mockOnCursorsChange: any
  let mockRemoveCursor: any

  beforeEach(async () => {
    // Get the mocked functions
    const { cursorService } = await import('../../src/services/cursorService')
    mockUpdateCursor = cursorService.updateCursor
    mockOnCursorsChange = cursorService.onCursorsChange
    mockRemoveCursor = cursorService.removeCursor

    vi.clearAllMocks()
    
    // Setup default mock behavior
    vi.mocked(mockUpdateCursor).mockResolvedValue(undefined)
    vi.mocked(mockOnCursorsChange).mockReturnValue(vi.fn()) // Return unsubscribe function
    vi.mocked(mockRemoveCursor).mockResolvedValue(undefined)
  })

  describe('cursors state management', () => {
    it('should initialize with empty cursors object', () => {
      const { result } = renderHook(() => useCursors())

      expect(result.current.cursors).toEqual({})
    })

    it('should call cursorService.updateCursor with correct parameters', async () => {
      const { result } = renderHook(() => useCursors())

      await act(async () => {
        await result.current.updateCursor(150, 250)
      })

      expect(mockUpdateCursor).toHaveBeenCalledWith('user1', 150, 250, 'Alice')
    })

    it('should not include own cursor in cursors object', () => {
      const mockOtherUsersCursors = {
        'user2': {
          userId: 'user2',
          x: 50,
          y: 75,
          username: 'Bob',
          timestamp: Date.now()
        }
      }

      // Mock the onCursorsChange to simulate receiving data with own cursor
      vi.mocked(mockOnCursorsChange).mockImplementation((callback) => {
        const allCursors = {
          ...mockOtherUsersCursors,
          'user1': { // Own cursor should be filtered out
            userId: 'user1',
            x: 100,
            y: 100,
            username: 'Alice',
            timestamp: Date.now()
          }
        }
        callback(allCursors)
        return vi.fn() // Return unsubscribe function
      })

      const { result } = renderHook(() => useCursors())

      // Should only contain other users, not own cursor
      expect(result.current.cursors).toEqual(mockOtherUsersCursors)
      expect(result.current.cursors).not.toHaveProperty('user1')
    })

    it('should handle empty cursors object', () => {
      vi.mocked(mockOnCursorsChange).mockImplementation((callback) => {
        callback({}) // Empty cursors
        return vi.fn()
      })

      const { result } = renderHook(() => useCursors())

      expect(result.current.cursors).toEqual({})
    })

    it('should update cursors when other users move', () => {
      let mockCallback: ((cursors: any) => void) | null = null
      
      vi.mocked(mockOnCursorsChange).mockImplementation((callback) => {
        mockCallback = callback
        return vi.fn()
      })

      const { result } = renderHook(() => useCursors())

      // Initial state
      expect(result.current.cursors).toEqual({})

      // Simulate other user cursor update
      const newCursors = {
        'user2': {
          userId: 'user2',
          x: 200,
          y: 300,
          username: 'Bob',
          timestamp: Date.now()
        }
      }

      act(() => {
        mockCallback?.(newCursors)
      })

      expect(result.current.cursors).toEqual(newCursors)
    })
  })

  describe('error handling', () => {
    it('should initialize with no error', () => {
      const { result } = renderHook(() => useCursors())

      expect(result.current.error).toBeNull()
    })

    it('should have clearError function', () => {
      const { result } = renderHook(() => useCursors())

      expect(typeof result.current.clearError).toBe('function')
    })

    it('should not update cursor when user is null', async () => {
      const { useAuth } = await import('../../src/contexts/AuthContext')
      vi.mocked(useAuth).mockReturnValue({ user: null, username: null })

      const { result } = renderHook(() => useCursors())

      await act(async () => {
        await result.current.updateCursor(100, 200)
      })

      expect(mockUpdateCursor).not.toHaveBeenCalled()
    })

    it('should not update cursor when username is null', async () => {
      const { useAuth } = await import('../../src/contexts/AuthContext')
      vi.mocked(useAuth).mockReturnValue({ user: mockUser, username: null })

      const { result } = renderHook(() => useCursors())

      await act(async () => {
        await result.current.updateCursor(100, 200)
      })

      expect(mockUpdateCursor).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should call removeCursor on unmount', () => {
      const { unmount } = renderHook(() => useCursors())

      unmount()

      expect(mockRemoveCursor).toHaveBeenCalledWith('user1')
    })

    it('should not call removeCursor if no user', async () => {
      const { useAuth } = await import('../../src/contexts/AuthContext')
      vi.mocked(useAuth).mockReturnValue({ user: null, username: null })

      const { unmount } = renderHook(() => useCursors())

      unmount()

      expect(mockRemoveCursor).not.toHaveBeenCalled()
    })
  })
})
