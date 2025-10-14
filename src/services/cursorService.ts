import {
  firebaseDatabase,
  dbRef,
  dbSet,
  dbOnValue,
  dbOff,
  dbRemove
} from './firebaseService'
import type { DatabaseReference, DataSnapshot } from './firebaseService'
import { DB_PATHS, CURSOR_THROTTLE_MS } from '../utils/constants'
import { throttle } from '../utils/canvasHelpers'

export interface CursorPosition {
  x: number
  y: number
  username: string
  userId: string
  timestamp: number
}

export interface CursorData {
  [userId: string]: CursorPosition
}

export class CursorService {
  private cursorsRef: DatabaseReference
  private throttledUpdateCursor: (userId: string, position: Omit<CursorPosition, 'userId'>) => void

  constructor() {
    this.cursorsRef = dbRef(firebaseDatabase, DB_PATHS.CURSORS)
    
    // Throttle cursor updates to avoid overwhelming Firebase
    this.throttledUpdateCursor = throttle(
      (userId: string, position: Omit<CursorPosition, 'userId'>) => {
        this.updateCursorImmediate(userId, position)
      },
      CURSOR_THROTTLE_MS
    )
  }

  // Update cursor position (throttled)
  async updateCursor(userId: string, x: number, y: number, username: string): Promise<void> {
    const position: Omit<CursorPosition, 'userId'> = {
      x,
      y,
      username,
      timestamp: Date.now()
    }

    // Use throttled update to avoid too many Firebase calls
    this.throttledUpdateCursor(userId, position)
  }

  // Update cursor position immediately (internal use)
  private async updateCursorImmediate(userId: string, position: Omit<CursorPosition, 'userId'>): Promise<void> {
    try {
      const userCursorRef = dbRef(firebaseDatabase, `${DB_PATHS.CURSORS}/${userId}`)
      const cursorData: CursorPosition = {
        ...position,
        userId
      }
      
      await dbSet(userCursorRef, cursorData)
    } catch (error) {
      console.error('Error updating cursor position:', error)
      throw error
    }
  }

  // Remove user cursor (when user disconnects)
  async removeCursor(userId: string): Promise<void> {
    try {
      const userCursorRef = dbRef(firebaseDatabase, `${DB_PATHS.CURSORS}/${userId}`)
      await dbRemove(userCursorRef)
    } catch (error) {
      console.error('Error removing cursor:', error)
      throw error
    }
  }

  // Listen to all cursor position changes (real-time)
  onCursorsChange(callback: (cursors: CursorData) => void): () => void {
    const handleChange = (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        const cursorsData = snapshot.val() as CursorData
        
        // Filter out stale cursors (older than 30 seconds)
        const now = Date.now()
        const activeCursors: CursorData = {}
        
        Object.entries(cursorsData).forEach(([userId, cursor]) => {
          if (cursor && cursor.timestamp && (now - cursor.timestamp) < 30000) {
            activeCursors[userId] = cursor
          }
        })
        
        callback(activeCursors)
      } else {
        callback({})
      }
    }

    dbOnValue(this.cursorsRef, handleChange)

    // Return unsubscribe function
    return () => {
      dbOff(this.cursorsRef, 'value', handleChange)
    }
  }

  // Get all cursor positions (one-time read)
  async getAllCursors(): Promise<CursorData> {
    try {
      const { dbGet } = await import('./firebaseService')
      const snapshot = await dbGet(this.cursorsRef)
      
      if (snapshot.exists()) {
        const cursorsData = snapshot.val() as CursorData
        
        // Filter out stale cursors
        const now = Date.now()
        const activeCursors: CursorData = {}
        
        Object.entries(cursorsData).forEach(([userId, cursor]) => {
          if (cursor && cursor.timestamp && (now - cursor.timestamp) < 30000) {
            activeCursors[userId] = cursor
          }
        })
        
        return activeCursors
      }
      
      return {}
    } catch (error) {
      console.error('Error fetching cursors:', error)
      throw error
    }
  }

  // Clean up stale cursors (optional maintenance function)
  async cleanupStaleCursors(): Promise<void> {
    try {
      const cursors = await this.getAllCursors()
      const now = Date.now()
      
      const cleanupPromises = Object.entries(cursors).map(async ([userId, cursor]) => {
        if (cursor && cursor.timestamp && (now - cursor.timestamp) > 30000) {
          await this.removeCursor(userId)
        }
      })
      
      await Promise.all(cleanupPromises)
    } catch (error) {
      console.error('Error cleaning up stale cursors:', error)
    }
  }
}

// Export singleton instance
export const cursorService = new CursorService()
