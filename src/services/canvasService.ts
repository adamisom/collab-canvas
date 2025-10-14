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
import { DB_PATHS } from '../utils/constants'

export interface Rectangle {
  id: string
  x: number
  y: number
  width: number
  height: number
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface RectangleInput {
  x: number
  y: number
  width: number
  height: number
  createdBy: string
}

export class CanvasService {
  private rectanglesRef: DatabaseReference

  constructor() {
    this.rectanglesRef = dbRef(firebaseDatabase, DB_PATHS.RECTANGLES)
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
}

// Export singleton instance
export const canvasService = new CanvasService()
