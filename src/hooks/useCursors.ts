import { useState, useEffect, useCallback } from 'react'
import { cursorService } from '../services/cursorService'
import type { CursorData } from '../services/cursorService'
import { useAuth } from '../contexts/AuthContext'

interface UseCursorsReturn {
  cursors: CursorData
  updateCursor: (x: number, y: number) => void
  loading: boolean
  error: string | null
  clearError: () => void
}

export const useCursors = (): UseCursorsReturn => {
  const [cursors, setCursors] = useState<CursorData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { user, username } = useAuth()

  // Update current user's cursor position
  const updateCursor = useCallback(async (x: number, y: number) => {
    if (!user || !username) {
      return
    }

    try {
      await cursorService.updateCursor(user.uid, x, y, username)
    } catch (error) {
      console.error('Error updating cursor:', error)
      setError('Failed to update cursor position')
    }
  }, [user, username])

  // Clear error messages
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // PERFORMANCE NOTE: These three useEffect hooks could potentially be consolidated
  // into one, but Firebase cleanup timing is critical. Current separation provides
  // clear concerns and safer cleanup behavior.

  // Set up cursor listeners
  useEffect(() => {
    if (!user) {
      setCursors({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Set up real-time listener for all cursor positions
    const unsubscribe = cursorService.onCursorsChange((newCursors) => {
      // Filter out current user's cursor from the display
      const otherUsersCursors: CursorData = {}
      
      Object.entries(newCursors).forEach(([userId, cursor]) => {
        if (userId !== user.uid && cursor) {
          otherUsersCursors[userId] = cursor
        }
      })
      
      setCursors(otherUsersCursors)
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [user])

  // Clean up user's cursor on unmount or user change
  useEffect(() => {
    return () => {
      if (user) {
        cursorService.removeCursor(user.uid).catch(error => {
          console.error('Error cleaning up cursor on unmount:', error)
        })
      }
    }
  }, [user])

  // Cleanup cursor when user signs out
  useEffect(() => {
    if (!user) {
      // User signed out, no need to clean up cursor as it will be handled by Firebase disconnect
      setCursors({})
    }
  }, [user])

  return {
    cursors,
    updateCursor,
    loading,
    error,
    clearError
  }
}
