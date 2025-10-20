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
import type { Rectangle, CircleShape, LineShape, TextShape } from '../shared/shapes'

// Re-export Rectangle for backward compatibility with existing imports
export type { Rectangle } from '../shared/shapes'

export interface RectangleInput {
  x: number
  y: number
  width: number
  height: number
  color?: string
  createdBy: string
  createdByUsername?: string
}

export interface CircleInput {
  x: number
  y: number
  radius: number
  color?: string
  createdBy: string
}

export interface LineInput {
  x: number
  y: number
  endX: number
  endY: number
  strokeWidth?: number
  color?: string
  hasArrow?: boolean
  createdBy: string
}

export interface TextInput {
  x: number
  y: number
  text?: string
  color?: string
  createdBy: string
}

/**
 * Canvas Service
 * Handles all Firebase Realtime Database operations for shapes (rectangles, circles, etc.)
 * Provides CRUD operations and real-time synchronization
 * 
 * Phase 3C: Shapes are stored in separate Firebase collections:
 * - /rectangles
 * - /circles (PR #6)
 * - /lines (PR #7)
 * - /text (PR #8)
 */
export class CanvasService {
  private rectanglesRef: DatabaseReference
  private circlesRef: DatabaseReference  // PR #6
  private linesRef: DatabaseReference  // PR #7
  private textsRef: DatabaseReference  // PR #8

  constructor() {
    this.rectanglesRef = dbRef(firebaseDatabase, DB_PATHS.RECTANGLES)
    this.circlesRef = dbRef(firebaseDatabase, '/circles')  // PR #6
    this.linesRef = dbRef(firebaseDatabase, '/lines')  // PR #7
    this.textsRef = dbRef(firebaseDatabase, '/texts')  // PR #8
  }

  /**
   * Get the maximum z-index across ALL shape types (rectangles, circles, lines, text)
   * MIGRATED (Post-3C): Updated to use Rectangle from shapes.ts (zIndex is now required)
   * Used to ensure new shapes appear on top
   * @private
   * @returns Maximum z-index found, or 0 if no shapes exist
   */
  private async getMaxZIndexAcrossAllShapes(): Promise<number> {
    try {
      let maxZ = 0

      // Check rectangles - zIndex is now required (not optional)
      const rectSnapshot = await dbGet(this.rectanglesRef)
      if (rectSnapshot.exists()) {
        const rectangles = Object.values(rectSnapshot.val() as Record<string, Rectangle>)
        const rectMax = Math.max(...rectangles.map(r => r.zIndex))
        maxZ = Math.max(maxZ, rectMax)
      }

      // Check circles (PR #6)
      const circleSnapshot = await dbGet(this.circlesRef)
      if (circleSnapshot.exists()) {
        const circles = Object.values(circleSnapshot.val() as Record<string, CircleShape>)
        const circleMax = Math.max(...circles.map(c => c.zIndex))
        maxZ = Math.max(maxZ, circleMax)
      }

      // Check lines (PR #7)
      const lineSnapshot = await dbGet(this.linesRef)
      if (lineSnapshot.exists()) {
        const lines = Object.values(lineSnapshot.val() as Record<string, LineShape>)
        const lineMax = Math.max(...lines.map(l => l.zIndex))
        maxZ = Math.max(maxZ, lineMax)
      }

      // Check texts (PR #8)
      const textSnapshot = await dbGet(this.textsRef)
      if (textSnapshot.exists()) {
        const texts = Object.values(textSnapshot.val() as Record<string, TextShape>)
        const textMax = Math.max(...texts.map(t => t.zIndex))
        maxZ = Math.max(maxZ, textMax)
      }

      return maxZ
    } catch (error) {
      console.error('Error fetching max zIndex across shapes:', error)
      return 1000 // Fallback
    }
  }

  /**
   * Get minimum zIndex across all shape types
   * Used for sendToBack operation
   */
  private async getMinZIndexAcrossAllShapes(): Promise<number> {
    try {
      let minZ = Infinity

      // Check rectangles
      const rectSnapshot = await dbGet(this.rectanglesRef)
      if (rectSnapshot.exists()) {
        const rectangles = Object.values(rectSnapshot.val() as Record<string, Rectangle>)
        const rectMin = Math.min(...rectangles.map(r => r.zIndex))
        minZ = Math.min(minZ, rectMin)
      }

      // Check circles
      const circleSnapshot = await dbGet(this.circlesRef)
      if (circleSnapshot.exists()) {
        const circles = Object.values(circleSnapshot.val() as Record<string, CircleShape>)
        const circleMin = Math.min(...circles.map(c => c.zIndex))
        minZ = Math.min(minZ, circleMin)
      }

      // Check lines
      const lineSnapshot = await dbGet(this.linesRef)
      if (lineSnapshot.exists()) {
        const lines = Object.values(lineSnapshot.val() as Record<string, LineShape>)
        const lineMin = Math.min(...lines.map(l => l.zIndex))
        minZ = Math.min(minZ, lineMin)
      }

      // Check texts
      const textSnapshot = await dbGet(this.textsRef)
      if (textSnapshot.exists()) {
        const texts = Object.values(textSnapshot.val() as Record<string, TextShape>)
        const textMin = Math.min(...texts.map(t => t.zIndex))
        minZ = Math.min(minZ, textMin)
      }

      return minZ === Infinity ? 0 : minZ
    } catch (error) {
      console.error('Error fetching min zIndex across shapes:', error)
      return 0 // Fallback
    }
  }

  /**
   * REFACTORED (Post-3C): Generic select shape method
   * Eliminates 100% duplication across circle/line/text selection
   * @private
   */
  private async selectShapeGeneric(
    shapeId: string,
    collectionPath: string,
    userId: string,
    username: string
  ): Promise<void> {
    const shapeRef = dbRef(firebaseDatabase, `${collectionPath}/${shapeId}`)
    await dbUpdate(shapeRef, {
      selectedBy: userId,
      selectedByUsername: username,
      selectedAt: Date.now()
    })
  }

  /**
   * REFACTORED (Post-3C): Generic deselect shape method
   * Eliminates 100% duplication across circle/line/text deselection
   * @private
   */
  private async deselectShapeGeneric(
    shapeId: string,
    collectionPath: string,
    userId: string
  ): Promise<void> {
    const shapeRef = dbRef(firebaseDatabase, `${collectionPath}/${shapeId}`)
    const snapshot = await dbGet(shapeRef)
    
    if (snapshot.exists()) {
      const shape = snapshot.val() as { selectedBy?: string | null }
      if (shape.selectedBy === userId) {
        await dbUpdate(shapeRef, {
          selectedBy: null,
          selectedByUsername: null,
          selectedAt: null
        })
      }
    }
  }

  /**
   * REFACTORED (Post-3C): Generic clear shape selection by user
   * Used for cleanup when user signs out
   * @private
   */
  private async clearShapeSelectionByUser(
    collectionRef: DatabaseReference,
    userId: string
  ): Promise<void> {
    const snapshot = await dbGet(collectionRef)
    if (!snapshot.exists()) return

    const shapes = snapshot.val() as Record<string, { selectedBy?: string | null }>
    const updates: Record<string, unknown> = {}

    for (const [id, shape] of Object.entries(shapes)) {
      if (shape.selectedBy === userId) {
        updates[`${id}/selectedBy`] = null
        updates[`${id}/selectedByUsername`] = null
        updates[`${id}/selectedAt`] = null
      }
    }

    if (Object.keys(updates).length > 0) {
      await dbUpdate(collectionRef, updates)
    }
  }

  /**
   * Validate that a rectangle exists and return its data
   * @private
   */
  private async validateRectangleExists(rectangleId: string): Promise<Rectangle | null> {
    try {
      const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
      const snapshot = await dbGet(rectangleRef)
      
      if (!snapshot.exists()) {
        return null
      }
      
      return snapshot.val() as Rectangle
    } catch (error) {
      console.error('Error validating rectangle existence:', error)
      throw error
    }
  }

  /**
   * Create a new rectangle in the database
   * MIGRATED (Post-3C): Now uses shared Rectangle type from shapes.ts
   * @param rectangleData - Rectangle properties (x, y, width, height, color, createdBy)
   * @returns The created rectangle with generated ID
   */
  async createRectangle(rectangleData: RectangleInput): Promise<Rectangle> {
    try {
      const now = Date.now()
      const newRectangleRef = dbPush(this.rectanglesRef)
      
      if (!newRectangleRef.key) {
        throw new Error('Failed to generate rectangle ID')
      }

      // Get max zIndex across ALL shape types
      const maxZ = await this.getMaxZIndexAcrossAllShapes()

      const rectangle: Rectangle = {
        id: newRectangleRef.key,
        type: 'rectangle',  // MIGRATION: Added type field
        ...rectangleData,
        color: rectangleData.color || RECTANGLE_COLORS.BLUE,
        zIndex: maxZ + 1000, // Required field, not optional
        createdBy: rectangleData.createdBy,
        createdByUsername: rectangleData.createdByUsername || 'Unknown',
        createdAt: now,
        selectedBy: null,  // MIGRATION: Required field
        selectedByUsername: null,
        selectedAt: null,  // MIGRATION: Required field
        updatedAt: now  // Keep for backward compatibility
      }

      await dbSet(newRectangleRef, rectangle)
      return rectangle
    } catch (error) {
      console.error('Error creating rectangle:', error)
      throw error
    }
  }

  /**
   * Update an existing rectangle's properties
   * @param rectangleId - ID of the rectangle to update
   * @param updates - Partial rectangle updates (position, size, color, selection)
   */
  async updateRectangle(rectangleId: string, updates: Partial<Omit<Rectangle, 'id' | 'createdBy' | 'createdAt'>>): Promise<void> {
    try {
      // Validate rectangle exists (handles race conditions)
      const existingRectangle = await this.validateRectangleExists(rectangleId)
      if (!existingRectangle) {
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

  /**
   * Resize a rectangle with optional position adjustment
   * Validates dimensions against constraints (20-3000px)
   * @param rectangleId - ID of the rectangle to resize
   * @param newWidth - New width in pixels
   * @param newHeight - New height in pixels
   * @param newX - Optional new X position (for corner resizing)
   * @param newY - Optional new Y position (for corner resizing)
   */
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

  /**
   * Delete a rectangle from the database
   * @param rectangleId - ID of the rectangle to delete
   */
  async deleteRectangle(rectangleId: string): Promise<void> {
    try {
      const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
      await dbRemove(rectangleRef)
    } catch (error) {
      console.error('Error deleting rectangle:', error)
      throw error
    }
  }

  /**
   * Bring rectangle to front (sets zIndex to max + 1000)
   * @param rectangleId - ID of the rectangle to bring to front
   */
  async bringToFront(shapeId: string): Promise<void> {
    try {
      // Get max zIndex across ALL shape types
      const maxZ = await this.getMaxZIndexAcrossAllShapes()
      
      // Determine which shape type this is and update accordingly
      const rectSnapshot = await dbGet(dbRef(firebaseDatabase, `rectangles/${shapeId}`))
      if (rectSnapshot.exists()) {
        await this.updateRectangle(shapeId, { zIndex: maxZ + 1000 })
        return
      }

      const circleSnapshot = await dbGet(dbRef(firebaseDatabase, `circles/${shapeId}`))
      if (circleSnapshot.exists()) {
        await dbUpdate(dbRef(firebaseDatabase, `circles/${shapeId}`), { zIndex: maxZ + 1000 })
        return
      }

      const lineSnapshot = await dbGet(dbRef(firebaseDatabase, `lines/${shapeId}`))
      if (lineSnapshot.exists()) {
        await dbUpdate(dbRef(firebaseDatabase, `lines/${shapeId}`), { zIndex: maxZ + 1000 })
        return
      }

      const textSnapshot = await dbGet(dbRef(firebaseDatabase, `texts/${shapeId}`))
      if (textSnapshot.exists()) {
        await dbUpdate(dbRef(firebaseDatabase, `texts/${shapeId}`), { zIndex: maxZ + 1000 })
        return
      }

      throw new Error(`Shape ${shapeId} not found`)
    } catch (error) {
      console.error('Error bringing shape to front:', error)
      throw error
    }
  }

  /**
   * Send shape to back (sets zIndex to min - 1000)
   * @param shapeId - ID of the shape to send to back
   */
  async sendToBack(shapeId: string): Promise<void> {
    try {
      // Get min zIndex across ALL shape types
      const minZ = await this.getMinZIndexAcrossAllShapes()
      
      // Determine which shape type this is and update accordingly
      const rectSnapshot = await dbGet(dbRef(firebaseDatabase, `rectangles/${shapeId}`))
      if (rectSnapshot.exists()) {
        await this.updateRectangle(shapeId, { zIndex: minZ - 1000 })
        return
      }

      const circleSnapshot = await dbGet(dbRef(firebaseDatabase, `circles/${shapeId}`))
      if (circleSnapshot.exists()) {
        await dbUpdate(dbRef(firebaseDatabase, `circles/${shapeId}`), { zIndex: minZ - 1000 })
        return
      }

      const lineSnapshot = await dbGet(dbRef(firebaseDatabase, `lines/${shapeId}`))
      if (lineSnapshot.exists()) {
        await dbUpdate(dbRef(firebaseDatabase, `lines/${shapeId}`), { zIndex: minZ - 1000 })
        return
      }

      const textSnapshot = await dbGet(dbRef(firebaseDatabase, `texts/${shapeId}`))
      if (textSnapshot.exists()) {
        await dbUpdate(dbRef(firebaseDatabase, `texts/${shapeId}`), { zIndex: minZ - 1000 })
        return
      }

      throw new Error(`Shape ${shapeId} not found`)
    } catch (error) {
      console.error('Error sending shape to back:', error)
      throw error
    }
  }

  /**
   * Get maximum zIndex from rectangles (defaults to 1000 if no rectangles)
   * @param rectangles - Array of rectangles to search
   * @returns Maximum zIndex value
   */
  private getMaxZIndex(rectangles: Rectangle[]): number {
    if (rectangles.length === 0) return 1000
    
    return Math.max(
      ...rectangles.map(r => r.zIndex ?? 0)
    )
  }

  /**
   * Get minimum zIndex from rectangles (defaults to 0 if no rectangles)
   * @param rectangles - Array of rectangles to search
   * @returns Minimum zIndex value
   */
  private getMinZIndex(rectangles: Rectangle[]): number {
    if (rectangles.length === 0) return 0
    
    return Math.min(
      ...rectangles.map(r => r.zIndex ?? 0)
    )
  }

  /**
   * Get all rectangles from the database (one-time fetch)
   * @returns Array of all rectangles
   */
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

  /**
   * Subscribe to real-time rectangle changes
   * @param callback - Function called whenever rectangles change
   * @returns Unsubscribe function
   */
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

  /**
   * Get a single rectangle by ID (one-time fetch)
   * @param rectangleId - ID of the rectangle to fetch
   * @returns Rectangle data or null if not found
   */
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

  /**
   * Mark a rectangle as selected by a user (exclusive selection)
   * @param rectangleId - ID of the rectangle to select
   * @param userId - ID of the user selecting the rectangle
   * @param username - Username of the user (for display)
   * @returns true if selection was successful, false if already selected by another user
   */
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

  /**
   * Deselect a rectangle (remove user's selection)
   * @param rectangleId - ID of the rectangle to deselect
   * @param userId - ID of the user deselecting (must match current selectedBy)
   */
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

  /**
   * Clear all selections for a specific user (used on sign out)
   * Batch operation to remove user's selections from all rectangles
   * @param userId - ID of the user whose selections should be cleared
   */
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
      }
    } catch (error) {
      console.error('Error clearing user selections:', error)
      // Don't throw error - this is cleanup, shouldn't block sign out
    }
  }

  // ============================================================================
  // PR #6: CIRCLE OPERATIONS
  // ============================================================================

  /**
   * Create a new circle in the database
   * @param circleData - Circle properties (x, y, radius, color, createdBy)
   * @returns The created circle with generated ID
   */
  async createCircle(circleData: CircleInput): Promise<CircleShape> {
    try {
      const now = Date.now()
      const newCircleRef = dbPush(this.circlesRef)
      
      if (!newCircleRef.key) {
        throw new Error('Failed to generate circle ID')
      }

      // Get max zIndex across ALL shapes and add 1000
      const maxZ = await this.getMaxZIndexAcrossAllShapes()

      const circle: CircleShape = {
        id: newCircleRef.key,
        type: 'circle',
        x: circleData.x,
        y: circleData.y,
        radius: circleData.radius,
        color: circleData.color || RECTANGLE_COLORS.BLUE,
        zIndex: maxZ + 1000,
        createdBy: circleData.createdBy,
        createdAt: now,
        selectedBy: null,
        selectedAt: null
      }

      await dbUpdate(newCircleRef, circle)
      return circle
    } catch (error) {
      console.error('Error creating circle:', error)
      throw error
    }
  }

  /**
   * Listen for real-time changes to all circles
   * @param callback - Function called with array of circles on each update
   * @returns Unsubscribe function to stop listening
   */
  onCirclesChange(callback: (circles: CircleShape[]) => void): () => void {
    const handleChange = (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) {
        callback([])
        return
      }

      const circlesData = snapshot.val() as Record<string, CircleShape>
      const circles = Object.entries(circlesData).map(([key, value]) => ({
        ...value,
        id: key
      }))

      callback(circles)
    }

    dbOnValue(this.circlesRef, handleChange)

    return () => {
      dbOff(this.circlesRef, 'value', handleChange)
    }
  }

  /**
   * Update an existing circle
   * @param circleId - ID of the circle to update
   * @param updates - Partial circle data to update
   */
  async updateCircle(circleId: string, updates: Partial<CircleShape>): Promise<void> {
    try {
      const circleRef = dbRef(firebaseDatabase, `/circles/${circleId}`)
      await dbUpdate(circleRef, updates)
    } catch (error) {
      console.error('Error updating circle:', error)
      throw error
    }
  }

  /**
   * Resize a circle (updates radius and position)
   * @param circleId - ID of the circle to resize
   * @param radius - New radius
   * @param x - New x position (optional)
   * @param y - New y position (optional)
   */
  async resizeCircle(circleId: string, radius: number, x?: number, y?: number): Promise<void> {
    try {
      const updates: Partial<CircleShape> = { radius }
      if (x !== undefined) updates.x = x
      if (y !== undefined) updates.y = y
      await this.updateCircle(circleId, updates)
    } catch (error) {
      console.error('Error resizing circle:', error)
      throw error
    }
  }

  /**
   * Delete a circle
   * @param circleId - ID of the circle to delete
   */
  async deleteCircle(circleId: string): Promise<void> {
    try {
      const circleRef = dbRef(firebaseDatabase, `/circles/${circleId}`)
      await dbRemove(circleRef)
    } catch (error) {
      console.error('Error deleting circle:', error)
      throw error
    }
  }

  /**
   * Select a circle (mark as selected by a user)
   * @param circleId - ID of the circle to select
   * @param userId - ID of the user selecting the circle
   * @param username - Username of the user (for display)
   * @returns true if selection was successful
   */
  async selectCircle(circleId: string, userId: string, username: string): Promise<boolean> {
    try {
      // REFACTORED (Post-3C): Use generic method
      await this.selectShapeGeneric(circleId, '/circles', userId, username)
      return true
    } catch (error) {
      console.error('Error selecting circle:', error)
      throw error
    }
  }

  /**
   * Deselect a circle (remove user's selection)
   * @param circleId - ID of the circle to deselect
   * @param userId - ID of the user deselecting (must match current selectedBy)
   */
  async deselectCircle(circleId: string, userId: string): Promise<void> {
    try {
      // REFACTORED (Post-3C): Use generic method
      await this.deselectShapeGeneric(circleId, '/circles', userId)
    } catch (error) {
      console.error('Error deselecting circle:', error)
      throw error
    }
  }

  /**
   * Clear all circle selections for a specific user
   * @param userId - ID of the user whose selections should be cleared
   */
  async clearCircleSelection(userId: string): Promise<void> {
    try {
      const snapshot = await dbGet(this.circlesRef)
      
      if (!snapshot.exists()) {
        return
      }
      
      const circles = snapshot.val() as Record<string, CircleShape>
      const updates: Record<string, null | number> = {}
      
      Object.entries(circles).forEach(([circleId, circle]) => {
        if (circle.selectedBy === userId) {
          updates[`${circleId}/selectedBy`] = null
          updates[`${circleId}/selectedByUsername`] = null
          updates[`${circleId}/selectedAt`] = null
        }
      })
      
      if (Object.keys(updates).length > 0) {
        await dbUpdate(this.circlesRef, updates)
      }
    } catch (error) {
      console.error('Error clearing circle selections:', error)
    }
  }

  // ============================================================================
  // PR #7: LINE/ARROW OPERATIONS
  // ============================================================================

  async createLine(lineData: LineInput): Promise<LineShape> {
    try {
      const now = Date.now()
      const newLineRef = dbPush(this.linesRef)
      
      if (!newLineRef.key) {
        throw new Error('Failed to generate line ID')
      }

      // Get max zIndex across ALL shapes and add 1000
      const maxZ = await this.getMaxZIndexAcrossAllShapes()

      const line: LineShape = {
        id: newLineRef.key,
        type: 'line',
        x: lineData.x,
        y: lineData.y,
        endX: lineData.endX,
        endY: lineData.endY,
        strokeWidth: lineData.strokeWidth || 4,
        color: lineData.color || RECTANGLE_COLORS.BLUE,
        hasArrow: lineData.hasArrow || false,
        zIndex: maxZ + 1000,
        createdBy: lineData.createdBy,
        createdAt: now,
        selectedBy: null,
        selectedAt: null
      }

      await dbUpdate(newLineRef, line)
      return line
    } catch (error) {
      console.error('Error creating line:', error)
      throw error
    }
  }

  onLinesChange(callback: (lines: LineShape[]) => void): () => void {
    return dbOnValue(this.linesRef, (snapshot: DataSnapshot) => {
      const lines: LineShape[] = []
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const line = childSnapshot.val() as LineShape
          lines.push(line)
        })
      }
      callback(lines)
    })
  }

  async updateLine(lineId: string, updates: Partial<LineShape>): Promise<void> {
    try {
      const lineRef = dbRef(firebaseDatabase, `${DB_PATHS.LINES}/${lineId}`)
      await dbUpdate(lineRef, updates)
    } catch (error) {
      console.error('Error updating line:', error)
      throw error
    }
  }

  async updateLineEndpoints(lineId: string, endX: number, endY: number): Promise<void> {
    try {
      const lineRef = dbRef(firebaseDatabase, `${DB_PATHS.LINES}/${lineId}`)
      await dbUpdate(lineRef, { endX, endY })
    } catch (error) {
      console.error('Error updating line endpoints:', error)
      throw error
    }
  }

  async deleteLine(lineId: string): Promise<void> {
    try {
      const lineRef = dbRef(firebaseDatabase, `${DB_PATHS.LINES}/${lineId}`)
      await dbRemove(lineRef)
    } catch (error) {
      console.error('Error deleting line:', error)
      throw error
    }
  }

  async selectLine(lineId: string, userId: string, username: string): Promise<void> {
    try {
      // REFACTORED (Post-3C): Use generic method
      await this.selectShapeGeneric(lineId, DB_PATHS.LINES, userId, username)
    } catch (error) {
      console.error('Error selecting line:', error)
      throw error
    }
  }

  async deselectLine(lineId: string, userId: string): Promise<void> {
    try {
      // REFACTORED (Post-3C): Use generic method
      await this.deselectShapeGeneric(lineId, DB_PATHS.LINES, userId)
    } catch (error) {
      console.error('Error deselecting line:', error)
      throw error
    }
  }

  async clearLineSelection(userId: string): Promise<void> {
    try {
      // REFACTORED (Post-3C): Use generic method
      await this.clearShapeSelectionByUser(this.linesRef, userId)
    } catch (error) {
      console.error('Error clearing line selections:', error)
    }
  }

  // ============================================================================
  // PR #8: TEXT OPERATIONS
  // ============================================================================

  async createText(textData: TextInput): Promise<TextShape> {
    try {
      const now = Date.now()
      const newTextRef = dbPush(this.textsRef)
      
      if (!newTextRef.key) {
        throw new Error('Failed to generate text ID')
      }

      // Get max zIndex across ALL shapes and add 1000
      const maxZ = await this.getMaxZIndexAcrossAllShapes()

      const text: TextShape = {
        id: newTextRef.key,
        type: 'text',
        x: textData.x,
        y: textData.y,
        text: textData.text || 'New Text',
        fontSize: 16,  // Default for PR #8
        fontFamily: 'Arial',  // Default for PR #8
        fontWeight: 'normal',  // PR #9: Default
        fontStyle: 'normal',  // PR #9: Default
        color: textData.color || RECTANGLE_COLORS.BLUE,
        zIndex: maxZ + 1000,
        createdBy: textData.createdBy,
        createdAt: now,
        selectedBy: null,
        selectedAt: null
      }

      await dbUpdate(newTextRef, text)
      return text
    } catch (error) {
      console.error('Error creating text:', error)
      throw error
    }
  }

  onTextsChange(callback: (texts: TextShape[]) => void): () => void {
    return dbOnValue(this.textsRef, (snapshot: DataSnapshot) => {
      const texts: TextShape[] = []
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const text = childSnapshot.val() as TextShape
          texts.push(text)
        })
      }
      callback(texts)
    })
  }

  async updateText(textId: string, updates: Partial<TextShape>): Promise<void> {
    try {
      const textRef = dbRef(firebaseDatabase, `${DB_PATHS.TEXTS}/${textId}`)
      await dbUpdate(textRef, updates)
    } catch (error) {
      console.error('Error updating text:', error)
      throw error
    }
  }

  async deleteText(textId: string): Promise<void> {
    try {
      const textRef = dbRef(firebaseDatabase, `${DB_PATHS.TEXTS}/${textId}`)
      await dbRemove(textRef)
    } catch (error) {
      console.error('Error deleting text:', error)
      throw error
    }
  }

  async selectText(textId: string, userId: string, username: string): Promise<void> {
    try {
      // REFACTORED (Post-3C): Use generic method
      await this.selectShapeGeneric(textId, DB_PATHS.TEXTS, userId, username)
    } catch (error) {
      console.error('Error selecting text:', error)
      throw error
    }
  }

  async deselectText(textId: string, userId: string): Promise<void> {
    try {
      // REFACTORED (Post-3C): Use generic method
      await this.deselectShapeGeneric(textId, DB_PATHS.TEXTS, userId)
    } catch (error) {
      console.error('Error deselecting text:', error)
      throw error
    }
  }

  async clearTextSelection(userId: string): Promise<void> {
    try {
      // REFACTORED (Post-3C): Use generic method
      await this.clearShapeSelectionByUser(this.textsRef, userId)
    } catch (error) {
      console.error('Error clearing text selections:', error)
    }
  }
}

// Export singleton instance
export const canvasService = new CanvasService()
