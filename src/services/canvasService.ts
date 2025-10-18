import {
  firebaseDatabase,
  dbRef,
  dbSet,
  dbGet,
  dbOnValue,
  dbOff,
  dbPush,
  dbUpdate,
  dbRemove
} from './firebaseService'
import type { DatabaseReference, DataSnapshot } from './firebaseService'
import { DB_PATHS, RECTANGLE_COLORS, RECTANGLE_CONSTRAINTS, CANVAS_BOUNDS } from '../utils/constants'

export interface Rectangle {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  selectedBy?: string | null
  selectedByUsername?: string | null
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface RectangleInput {
  x: number
  y: number
  width: number
  height: number
  color?: string
  createdBy: string
}

export class CanvasService {
  private rectanglesRef: DatabaseReference

  constructor() {
    this.rectanglesRef = dbRef(firebaseDatabase, DB_PATHS.RECTANGLES)
  }

  // Validate that a rectangle exists and return its data
  private async validateRectangleExists(rectangleId: string): Promise<Rectangle | null> {
    try {
      const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
      const snapshot = await dbGet(rectangleRef)
      
      if (!snapshot.exists()) {
        console.log(`Rectangle ${rectangleId} no longer exists`)
        return null
      }
      
      return snapshot.val() as Rectangle
    } catch (error) {
      console.error('Error validating rectangle existence:', error)
      throw error
    }
  }

  // Create a new rectangle
  async createRectangle(rectangleData: RectangleInput): Promise<Rectangle> {
    try {
      const now = Date.now()
      const newRectangleRef = dbPush(this.rectanglesRef)
      
      if (!newRectangleRef.key) {
        throw new Error('Failed to generate rectangle ID')
      }

      const rectangle: Rectangle = {
        id: newRectangleRef.key,
        ...rectangleData,
        color: rectangleData.color || RECTANGLE_COLORS.BLUE,
        createdAt: now,
        updatedAt: now
      }

      await dbSet(newRectangleRef, rectangle)
      return rectangle
    } catch (error) {
      console.error('Error creating rectangle:', error)
      throw error
    }
  }

  // Update an existing rectangle
  async updateRectangle(rectangleId: string, updates: Partial<Omit<Rectangle, 'id' | 'createdBy' | 'createdAt'>>): Promise<void> {
    try {
      // Validate rectangle exists (handles race conditions)
      const existingRectangle = await this.validateRectangleExists(rectangleId)
      if (!existingRectangle) {
        console.log(`Skipping update for non-existent rectangle ${rectangleId}`)
        return
      }
      
      const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
      const updateData = {
        ...updates,
        updatedAt: Date.now()
      }
      
      await dbUpdate(rectangleRef, updateData)
    } catch (error) {
      console.error('Error updating rectangle:', error)
      throw error
    }
  }

  // Resize an existing rectangle with validation
  async resizeRectangle(
    rectangleId: string, 
    newWidth: number, 
    newHeight: number, 
    newX?: number, 
    newY?: number
  ): Promise<void> {
    try {
      // Validate rectangle exists (handles race conditions)
      const existingRectangle = await this.validateRectangleExists(rectangleId)
      if (!existingRectangle) {
        console.log(`Skipping resize for non-existent rectangle ${rectangleId}`)
        return
      }
      
      // Validate dimensions
      const validatedWidth = Math.max(RECTANGLE_CONSTRAINTS.MIN_WIDTH, Math.min(newWidth, RECTANGLE_CONSTRAINTS.MAX_WIDTH))
      const validatedHeight = Math.max(RECTANGLE_CONSTRAINTS.MIN_HEIGHT, Math.min(newHeight, RECTANGLE_CONSTRAINTS.MAX_HEIGHT))
      
      // Prepare update data
      const updateData: Partial<Rectangle> = {
        width: validatedWidth,
        height: validatedHeight,
        updatedAt: Date.now()
      }
      
      // Include position updates if provided
      if (newX !== undefined) {
        updateData.x = Math.max(CANVAS_BOUNDS.MIN_X, Math.min(newX, CANVAS_BOUNDS.MAX_X - validatedWidth))
      }
      if (newY !== undefined) {
        updateData.y = Math.max(CANVAS_BOUNDS.MIN_Y, Math.min(newY, CANVAS_BOUNDS.MAX_Y - validatedHeight))
      }
      
      const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
      await dbUpdate(rectangleRef, updateData)
    } catch (error) {
      console.error('Error resizing rectangle:', error)
      throw error
    }
  }

  // Delete a rectangle
  async deleteRectangle(rectangleId: string): Promise<void> {
    try {
      const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
      await dbRemove(rectangleRef)
    } catch (error) {
      console.error('Error deleting rectangle:', error)
      throw error
    }
  }

  // Get all rectangles (one-time read)
  async getAllRectangles(): Promise<Rectangle[]> {
    try {
      const snapshot = await dbGet(this.rectanglesRef)
      
      if (!snapshot.exists()) {
        return []
      }

      const rectanglesData = snapshot.val()
      return Object.values(rectanglesData) as Rectangle[]
    } catch (error) {
      console.error('Error fetching rectangles:', error)
      throw error
    }
  }

  // Listen to rectangle changes (real-time)
  onRectanglesChange(callback: (rectangles: Rectangle[]) => void): () => void {
    const handleChange = (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        const rectanglesData = snapshot.val()
        const rectangles = Object.values(rectanglesData) as Rectangle[]
        callback(rectangles)
      } else {
        callback([])
      }
    }

    dbOnValue(this.rectanglesRef, handleChange)

    // Return unsubscribe function
    return () => {
      dbOff(this.rectanglesRef, 'value', handleChange)
    }
  }

  // Get a specific rectangle
  async getRectangle(rectangleId: string): Promise<Rectangle | null> {
    try {
      const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
      const snapshot = await dbGet(rectangleRef)
      
      if (snapshot.exists()) {
        return snapshot.val() as Rectangle
      }
      
      return null
    } catch (error) {
      console.error('Error fetching rectangle:', error)
      throw error
    }
  }

  // Select a rectangle (exclusive selection)
  async selectRectangle(rectangleId: string, userId: string, username: string): Promise<boolean> {
    try {
      // Validate rectangle exists
      const rectangle = await this.validateRectangleExists(rectangleId)
      if (!rectangle) {
        return false // Rectangle doesn't exist
      }
      
      // Check if already selected by another user
      if (rectangle.selectedBy && rectangle.selectedBy !== userId) {
        return false // Already selected by someone else
      }
      
      // Select the rectangle
      const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
      await dbUpdate(rectangleRef, {
        selectedBy: userId,
        selectedByUsername: username,
        updatedAt: Date.now()
      })
      
      return true
    } catch (error) {
      console.error('Error selecting rectangle:', error)
      throw error
    }
  }

  // Deselect a rectangle
  async deselectRectangle(rectangleId: string, userId: string): Promise<void> {
    try {
      // Validate rectangle exists
      const rectangle = await this.validateRectangleExists(rectangleId)
      if (!rectangle) {
        return // Rectangle doesn't exist, nothing to deselect
      }
      
      // Only deselect if this user selected it
      if (rectangle.selectedBy === userId) {
        const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
        await dbUpdate(rectangleRef, {
          selectedBy: null,
          selectedByUsername: null,
          updatedAt: Date.now()
        })
      }
    } catch (error) {
      console.error('Error deselecting rectangle:', error)
      throw error
    }
  }

  // Clear all selections by a specific user (for cleanup when user signs out)
  async clearUserSelections(userId: string): Promise<void> {
    try {
      const rectanglesRef = dbRef(firebaseDatabase, DB_PATHS.RECTANGLES)
      const snapshot = await dbGet(rectanglesRef)
      
      if (!snapshot.exists()) {
        return // No rectangles exist
      }
      
      const rectangles = snapshot.val() as Record<string, Rectangle>
      const updates: Record<string, null | number | string> = {}
      
      // Find all rectangles selected by this user and prepare batch update
      Object.entries(rectangles).forEach(([rectangleId, rectangle]) => {
        if (rectangle.selectedBy === userId) {
          updates[`${rectangleId}/selectedBy`] = null
          updates[`${rectangleId}/selectedByUsername`] = null
          updates[`${rectangleId}/updatedAt`] = Date.now()
        }
      })
      
      // Perform batch update if there are any selections to clear
      if (Object.keys(updates).length > 0) {
        await dbUpdate(rectanglesRef, updates)
        console.log(`Cleared ${Object.keys(updates).length / 3} rectangle selections for user ${userId}`)
      }
    } catch (error) {
      console.error('Error clearing user selections:', error)
      // Don't throw error - this is cleanup, shouldn't block sign out
    }
  }
}

// Export singleton instance
export const canvasService = new CanvasService()
