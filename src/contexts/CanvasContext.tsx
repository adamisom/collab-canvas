import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { canvasService } from '../services/canvasService'
import type { Rectangle, RectangleInput } from '../services/canvasService'
import { useAuth } from './AuthContext'
import type { ViewportInfo } from '../shared/types'
import type { Shape, ShapeType } from '../shared/shapes'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants'

interface CanvasContextType {
  rectangles: Rectangle[]
  selectedShapes: Map<string, ShapeType> // REFACTORED: Phase 3C PR #5 - unified selection
  primarySelectionId: string | null  // Last clicked shape
  primarySelectionType: ShapeType | null  // NEW: Type of primary selection
  loading: boolean
  error: string | null
  toastMessage: string | null
  selectionLocked: boolean
  
  // Rectangle operations
  createRectangle: (x: number, y: number) => Promise<Rectangle | null>
  updateRectangle: (rectangleId: string, updates: Partial<Omit<Rectangle, 'id' | 'createdBy' | 'createdAt'>>) => Promise<void>
  resizeRectangle: (rectangleId: string, newWidth: number, newHeight: number, newX?: number, newY?: number) => Promise<void>
  deleteRectangle: (rectangleId: string) => Promise<void>
  changeRectangleColor: (rectangleId: string, color: string) => Promise<void>
  
  // Selection operations (UPDATED)
  selectRectangle: (rectangleId: string, additive?: boolean) => Promise<void>
  selectMultiple: (rectangleIds: string[]) => Promise<void>  // NEW
  selectAll: () => Promise<void>  // NEW
  clearSelection: () => Promise<void>  // NEW
  setSelectionLocked: (locked: boolean) => void
  
  // Bulk operations (NEW)
  deleteSelectedRectangles: () => Promise<void>
  changeSelectedRectanglesColor: (color: string) => Promise<void>
  
  // Clipboard operations (REFACTORED: PR #5)
  copySelectedRectangles: () => void  // Works with all selected shapes
  pasteRectangles: () => Promise<void>  // Handles Shape[] discriminated union
  duplicateRectangle: (rectangleId: string) => Promise<Rectangle | null>  // Unchanged (single only)
  hasClipboardData: () => boolean
  
  // Layering operations
  bringToFront: (rectangleId: string) => Promise<void>
  sendToBack: (rectangleId: string) => Promise<void>
  
  // Viewport operations (for AI agent)
  getViewportInfo: () => ViewportInfo | null
  updateViewportInfo: (info: ViewportInfo) => void
  
  // Utility operations
  clearError: () => void
  clearToast: () => void
  showToast: (message: string) => void  // NEW: Helper for toast messages
  refreshRectangles: () => Promise<void>
}

const CanvasContext = createContext<CanvasContextType | null>(null)

// Standard React context pattern: exporting hook with provider
// eslint-disable-next-line react-refresh/only-export-components
export const useCanvas = () => {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider')
  }
  return context
}

interface CanvasProviderProps {
  children: React.ReactNode
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [rectangles, setRectangles] = useState<Rectangle[]>([])
  const [selectedShapes, setSelectedShapes] = useState<Map<string, ShapeType>>(new Map())  // REFACTORED: PR #5
  const [primarySelectionId, setPrimarySelectionId] = useState<string | null>(null)
  const [primarySelectionType, setPrimarySelectionType] = useState<ShapeType | null>(null)  // NEW: PR #5
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [selectionLocked, setSelectionLocked] = useState(false)
  const [clipboardShapes, setClipboardShapes] = useState<Shape[]>([])  // REFACTORED: PR #5
  
  // Use ref to access current selection state in Firebase callback
  const selectedShapesRef = useRef<Map<string, ShapeType>>(new Map())  // REFACTORED: PR #5
  const primarySelectionIdRef = useRef<string | null>(null)
  const primarySelectionTypeRef = useRef<ShapeType | null>(null)  // NEW: PR #5
  
  // Use ref to track previous user ID for cleanup
  const prevUserIdRef = useRef<string | null>(null)
  
  // Use ref to store viewport info (doesn't cause re-renders when updated)
  const viewportInfoRef = useRef<ViewportInfo | null>(null)
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedShapesRef.current = selectedShapes
    primarySelectionIdRef.current = primarySelectionId
    primarySelectionTypeRef.current = primarySelectionType
  }, [selectedShapes, primarySelectionId, primarySelectionType])
  
  const { user, username } = useAuth()

  // Initialize canvas state and set up real-time listeners
  useEffect(() => {
    if (!user) {
      setRectangles([])
      setSelectedShapes(new Map())
      setPrimarySelectionId(null)
      setPrimarySelectionType(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Set up real-time listener for rectangles
    const unsubscribe = canvasService.onRectanglesChange((newRectangles) => {
      setRectangles(newRectangles)
      setLoading(false)
      
      // Clear selections for shapes that no longer exist
      const currentSelectedShapes = selectedShapesRef.current
      const currentPrimaryId = primarySelectionIdRef.current
      
      if (currentSelectedShapes.size > 0) {
        const existingIds = new Set(newRectangles.map(r => r.id))
        const updatedSelection = new Map<string, ShapeType>()
        
        // Keep only selections that still exist (rectangles only for now)
        for (const [id, type] of currentSelectedShapes) {
          if (type === 'rectangle' && existingIds.has(id)) {
            updatedSelection.set(id, type)
          }
        }
        
        if (updatedSelection.size !== currentSelectedShapes.size) {
          setSelectedShapes(updatedSelection)
        }
        
        // Clear primary if it no longer exists
        if (currentPrimaryId && !existingIds.has(currentPrimaryId)) {
          const firstId = updatedSelection.size > 0 ? Array.from(updatedSelection.keys())[0] : null
          setPrimarySelectionId(firstId)
          setPrimarySelectionType(firstId ? updatedSelection.get(firstId) || null : null)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [user])

  // Clean up user selections when user signs out
  useEffect(() => {
    if (user) {
      prevUserIdRef.current = user.uid
    } else if (prevUserIdRef.current) {
      // User signed out, clean up their selections
      canvasService.clearUserSelections(prevUserIdRef.current)
      prevUserIdRef.current = null
    }
  }, [user])

  // Clear clipboard and selection on sign out
  useEffect(() => {
    if (!user) {
      setClipboardShapes([])
      setSelectedShapes(new Map())
      setPrimarySelectionId(null)
      setPrimarySelectionType(null)
    }
  }, [user])

  // Create a new rectangle
  const createRectangle = useCallback(async (x: number, y: number): Promise<Rectangle | null> => {
    if (!user) {
      setError('Must be logged in to create rectangles')
      return null
    }

    try {
      const rectangleInput: RectangleInput = {
        x,
        y,
        width: 100,  // Default width
        height: 80,  // Default height
        createdBy: user.uid
      }

      const newRectangle = await canvasService.createRectangle(rectangleInput)
      
      // Select the newly created rectangle (single selection)
      const newSelection = new Map<string, ShapeType>()
      newSelection.set(newRectangle.id, 'rectangle')
      setSelectedShapes(newSelection)
      setPrimarySelectionId(newRectangle.id)
      setPrimarySelectionType('rectangle')
      
      return newRectangle
    } catch (error) {
      console.error('Error creating rectangle:', error)
      setError('Failed to create rectangle')
      return null
    }
  }, [user])

  // Update an existing rectangle
  const updateRectangle = useCallback(async (
    rectangleId: string, 
    updates: Partial<Omit<Rectangle, 'id' | 'createdBy' | 'createdAt'>>
  ): Promise<void> => {
    try {
      await canvasService.updateRectangle(rectangleId, updates)
    } catch (error) {
      console.error('Error updating rectangle:', error)
      setError('Failed to update rectangle')
    }
  }, [])

  // Resize an existing rectangle
  const resizeRectangle = useCallback(async (
    rectangleId: string, 
    newWidth: number, 
    newHeight: number, 
    newX?: number, 
    newY?: number
  ): Promise<void> => {
    try {
      await canvasService.resizeRectangle(rectangleId, newWidth, newHeight, newX, newY)
    } catch (error) {
      console.error('Error resizing rectangle:', error)
      setError('Failed to resize rectangle')
    }
  }, [])

  // Delete a rectangle
  const deleteRectangle = useCallback(async (rectangleId: string): Promise<void> => {
    try {
      await canvasService.deleteRectangle(rectangleId)
      
      // Remove from selection if deleted
      if (selectedShapes.has(rectangleId)) {
        setSelectedShapes(prev => {
          const next = new Map(prev)
          next.delete(rectangleId)
          return next
        })
        
        // Update primary if it was deleted
        if (primarySelectionId === rectangleId) {
          const remaining = Array.from(selectedShapes.keys()).filter(id => id !== rectangleId)
          setPrimarySelectionId(remaining.length > 0 ? remaining[0] : null)
          setPrimarySelectionType(remaining.length > 0 ? selectedShapes.get(remaining[0]) || null : null)
        }
      }
    } catch (error) {
      console.error('Error deleting rectangle:', error)
      setError('Failed to delete rectangle')
    }
  }, [selectedShapes, primarySelectionId])

  // NEW: Helper to show toast messages
  const showToast = useCallback((message: string) => {
    setToastMessage(message)
  }, [])

  // Get current viewport info (for AI agent)
  const getViewportInfo = useCallback((): ViewportInfo | null => {
    return viewportInfoRef.current
  }, [])

  // Update viewport info (called by Canvas component on pan/zoom/resize)
  const updateViewportInfo = useCallback((info: ViewportInfo): void => {
    viewportInfoRef.current = info
  }, [])

  // UPDATED: Select rectangle with additive mode support
  const selectRectangle = useCallback(async (rectangleId: string, additive: boolean = false) => {
    if (!user || !username) return
    
    // Don't allow selection changes when locked (during AI processing)
    if (selectionLocked) {
      console.log('Selection locked, ignoring selection change')
      return
    }

    const rectangle = rectangles.find(r => r.id === rectangleId)
    if (!rectangle) {
      showToast('Rectangle not found')
      return
    }

    // Check if another user has it selected (exclusive selection per rectangle)
    if (rectangle.selectedBy && rectangle.selectedBy !== user.uid) {
      showToast(`Rectangle is currently selected by ${rectangle.selectedByUsername || 'another user'}`)
      return
    }

    if (!additive) {
      // Clear all previous selections
      for (const prevId of selectedShapes.keys()) {
        await canvasService.deselectRectangle(prevId, user.uid)
      }

      // Select this one
      const newSelection = new Map<string, ShapeType>()
      newSelection.set(rectangleId, 'rectangle')
      setSelectedShapes(newSelection)
      setPrimarySelectionId(rectangleId)
      setPrimarySelectionType('rectangle')
      await canvasService.selectRectangle(rectangleId, user.uid, username)
    } else {
      // Add/remove from selection (toggle)
      const isCurrentlySelected = selectedShapes.has(rectangleId)

      if (isCurrentlySelected) {
        // Remove from selection
        await canvasService.deselectRectangle(rectangleId, user.uid)

        setSelectedShapes(prev => {
          const next = new Map(prev)
          next.delete(rectangleId)

          // If removing primary, set new primary
          if (rectangleId === primarySelectionId) {
            if (next.size > 0) {
              const newPrimary = Array.from(next.keys())[0]
              setPrimarySelectionId(newPrimary)
              setPrimarySelectionType(next.get(newPrimary) || null)
            } else {
              setPrimarySelectionId(null)
              setPrimarySelectionType(null)
            }
          }
          return next
        })
      } else {
        // Add to selection
        await canvasService.selectRectangle(rectangleId, user.uid, username)

        setSelectedShapes(prev => {
          const next = new Map(prev)
          next.set(rectangleId, 'rectangle')
          return next
        })
        setPrimarySelectionId(rectangleId)
        setPrimarySelectionType('rectangle')
      }
    }
  }, [user, username, rectangles, selectedShapes, primarySelectionId, selectionLocked, showToast])

  // NEW: Select multiple rectangles (used by drag selection box)
  const selectMultiple = useCallback(async (rectangleIds: string[]) => {
    if (selectionLocked) return
    if (!user || !username) return

    // Enforce selection limit
    if (rectangleIds.length > 25) {
      showToast('Selection too large (max 25 rectangles)')
      // Clear selection
      for (const prevId of selectedShapes.keys()) {
        await canvasService.deselectRectangle(prevId, user.uid)
      }
      setSelectedShapes(new Map())
      setPrimarySelectionId(null)
      setPrimarySelectionType(null)
      return
    }

    // Clear previous selections
    for (const prevId of selectedShapes.keys()) {
      await canvasService.deselectRectangle(prevId, user.uid)
    }

    // Select new ones sequentially, checking before each write
    const selected: string[] = []
    const skipped: string[] = []

    for (const id of rectangleIds) {
      const rect = rectangles.find(r => r.id === id)

      // Check right before writing to minimize race condition
      if (rect && (!rect.selectedBy || rect.selectedBy === user.uid)) {
        await canvasService.selectRectangle(id, user.uid, username)
        selected.push(id)
      } else {
        skipped.push(id)
      }
    }

    const newSelection = new Map<string, ShapeType>()
    selected.forEach(id => newSelection.set(id, 'rectangle'))
    setSelectedShapes(newSelection)
    setPrimarySelectionId(selected[selected.length - 1] || null)
    setPrimarySelectionType(selected.length > 0 ? 'rectangle' : null)

    if (skipped.length > 0) {
      showToast(`Selected ${selected.length}, ${skipped.length} already taken by other users`)
    } else if (selected.length > 0) {
      showToast(`Selected ${selected.length} rectangles`)
    }
  }, [selectionLocked, user, username, rectangles, selectedShapes, showToast])

  // NEW: Select all available rectangles (skip those selected by others)
  const selectAll = useCallback(async () => {
    if (selectionLocked) return
    if (!user || !username) return

    // Filter to only available rectangles
    const availableIds = rectangles
      .filter(r => !r.selectedBy || r.selectedBy === user.uid)
      .map(r => r.id)

    // Enforce selection limit
    if (availableIds.length > 25) {
      showToast(`Too many rectangles (${availableIds.length}). Max selection is 25.`)
      return
    }

    // Clear previous selections
    for (const prevId of selectedShapes.keys()) {
      await canvasService.deselectRectangle(prevId, user.uid)
    }

    // Select all available ones
    for (const id of availableIds) {
      await canvasService.selectRectangle(id, user.uid, username)
    }

    const newSelection = new Map<string, ShapeType>()
    availableIds.forEach(id => newSelection.set(id, 'rectangle'))
    setSelectedShapes(newSelection)
    setPrimarySelectionId(availableIds[availableIds.length - 1] || null)
    setPrimarySelectionType(availableIds.length > 0 ? 'rectangle' : null)

    showToast(`Selected all ${availableIds.length} rectangles`)
  }, [selectionLocked, user, username, rectangles, selectedShapes, showToast])

  // NEW: Clear selection
  const clearSelection = useCallback(async () => {
    if (!user) return

    // Clear all selections in Firebase
    for (const id of selectedShapes.keys()) {
      await canvasService.deselectRectangle(id, user.uid)
    }

    setSelectedShapes(new Map())
    setPrimarySelectionId(null)
    setPrimarySelectionType(null)
  }, [user, selectedShapes])

  // NEW: Delete all selected rectangles
  const deleteSelectedRectangles = useCallback(async () => {
    const idsToDelete = Array.from(selectedShapes.keys())
    if (idsToDelete.length === 0) return

    // Delete all sequentially
    for (const id of idsToDelete) {
      await canvasService.deleteRectangle(id)
    }

    setSelectedShapes(new Map())
    setPrimarySelectionId(null)
    setPrimarySelectionType(null)

    const count = idsToDelete.length
    showToast(`Deleted ${count} rectangle${count > 1 ? 's' : ''}`)
  }, [selectedShapes, showToast])

  // NEW: Change color of all selected rectangles
  const changeSelectedRectanglesColor = useCallback(async (color: string) => {
    const idsToUpdate = Array.from(selectedShapes.keys())
    if (idsToUpdate.length === 0) return

    // Update all sequentially
    for (const id of idsToUpdate) {
      await canvasService.updateRectangle(id, { color })
    }

    const count = idsToUpdate.length
    showToast(`Changed color of ${count} rectangle${count > 1 ? 's' : ''}`)
  }, [selectedShapes, showToast])

  // Clear any error messages
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Clear toast messages
  const clearToast = useCallback(() => {
    setToastMessage(null)
  }, [])

  // Change rectangle color
  const changeRectangleColor = useCallback(async (rectangleId: string, color: string): Promise<void> => {
    try {
      await canvasService.updateRectangle(rectangleId, { color })
    } catch (error) {
      console.error('Error changing rectangle color:', error)
      setError('Failed to change rectangle color')
    }
  }, [])

  // Refresh rectangles manually
  const refreshRectangles = useCallback(async (): Promise<void> => {
    if (!user) return

    try {
      setLoading(true)
      const freshRectangles = await canvasService.getAllRectangles()
      setRectangles(freshRectangles)
    } catch (error) {
      console.error('Error refreshing rectangles:', error)
      setError('Failed to refresh rectangles')
    } finally {
      setLoading(false)
    }
  }, [user])

  // REFACTORED PR #5: Copy all selected shapes to clipboard (currently only rectangles)
  const copySelectedRectangles = useCallback(() => {
    const selected = rectangles.filter(r => selectedShapes.has(r.id))
    if (selected.length === 0) {
      showToast('No rectangles selected to copy')
      return
    }

    // Store as Shape[] (rectangles implement Rectangle interface which extends BaseShape)
    setClipboardShapes(selected as Shape[])
    const count = selected.length
    showToast(`Copied ${count} rectangle${count > 1 ? 's' : ''}`)
  }, [rectangles, selectedShapes, showToast])

  // REFACTORED PR #5: Paste all clipboard shapes (type-discriminated handling)
  const pasteRectangles = useCallback(async (): Promise<void> => {
    if (!user || !username) {
      setError('You must be signed in to paste')
      return
    }

    if (clipboardShapes.length === 0) {
      showToast('Nothing to paste')
      return
    }

    try {
      const PASTE_OFFSET = 20
      const newSelection = new Map<string, ShapeType>()

      // For now, only handle rectangles (Phase 3C PR #5)
      // In future PRs, we'll add circle, line, text handling
      const rectanglesToPaste = clipboardShapes.filter(s => s.type === 'rectangle') as Rectangle[]

      if (rectanglesToPaste.length === 0) {
        showToast('Clipboard contains no rectangles')
        return
      }

      // Calculate bounding box of all clipboard rectangles
      const minX = Math.min(...rectanglesToPaste.map(r => r.x))
      const minY = Math.min(...rectanglesToPaste.map(r => r.y))

      // Paste all rectangles with same relative positions
      for (const original of rectanglesToPaste) {
        // Calculate position relative to group's top-left
        const relativeX = original.x - minX
        const relativeY = original.y - minY

        // Apply uniform offset to entire group
        const newX = Math.min(
          minX + PASTE_OFFSET + relativeX,
          CANVAS_WIDTH - original.width
        )
        const newY = Math.min(
          minY + PASTE_OFFSET + relativeY,
          CANVAS_HEIGHT - original.height
        )

        const input: RectangleInput = {
          x: newX,
          y: newY,
          width: original.width,
          height: original.height,
          color: original.color,
          createdBy: user.uid
        }

        const newRectangle = await canvasService.createRectangle(input)
        if (newRectangle) {
          newSelection.set(newRectangle.id, 'rectangle')
          // Select the newly pasted rectangle in Firebase
          await canvasService.selectRectangle(newRectangle.id, user.uid, username)
        }
      }

      // Select all newly pasted shapes
      setSelectedShapes(newSelection)
      const newIds = Array.from(newSelection.keys())
      setPrimarySelectionId(newIds[newIds.length - 1] || null)
      setPrimarySelectionType(newIds.length > 0 ? 'rectangle' : null)

      const count = newIds.length
      showToast(`Pasted ${count} rectangle${count > 1 ? 's' : ''}`)
    } catch (err) {
      console.error('Error pasting rectangles:', err)
      setError(err instanceof Error ? err.message : 'Failed to paste rectangles')
    }
  }, [user, username, clipboardShapes, showToast])

  // UPDATED: Duplicate rectangle (single selection only, kept for compatibility)
  const duplicateRectangle = useCallback(async (rectangleId: string): Promise<Rectangle | null> => {
    if (!user || !username) {
      setError('You must be signed in to duplicate')
      return null
    }

    const rectangle = rectangles.find(r => r.id === rectangleId)
    if (!rectangle) {
      showToast('Rectangle not found')
      return null
    }

    try {
      const DUPLICATE_OFFSET = 20
      const newX = Math.min(
        rectangle.x + DUPLICATE_OFFSET,
        CANVAS_WIDTH - rectangle.width
      )
      const newY = Math.min(
        rectangle.y + DUPLICATE_OFFSET,
        CANVAS_HEIGHT - rectangle.height
      )

      const input: RectangleInput = {
        x: newX,
        y: newY,
        width: rectangle.width,
        height: rectangle.height,
        color: rectangle.color,
        createdBy: user.uid
      }

      const duplicated = await canvasService.createRectangle(input)

      if (duplicated) {
        // Select the duplicated rectangle
        await canvasService.selectRectangle(duplicated.id, user.uid, username)
        const newSelection = new Map<string, ShapeType>()
        newSelection.set(duplicated.id, 'rectangle')
        setSelectedShapes(newSelection)
        setPrimarySelectionId(duplicated.id)
        setPrimarySelectionType('rectangle')
        showToast('Rectangle duplicated')
      }

      return duplicated
    } catch (err) {
      console.error('Error duplicating rectangle:', err)
      setError(err instanceof Error ? err.message : 'Failed to duplicate rectangle')
      return null
    }
  }, [user, username, rectangles, showToast])

  // Check if clipboard has data
  const hasClipboardData = useCallback(() => {
    return clipboardShapes.length > 0
  }, [clipboardShapes])

  // Bring rectangle to front
  const bringToFront = useCallback(async (rectangleId: string): Promise<void> => {
    try {
      await canvasService.bringToFront(rectangleId)
      setToastMessage('Brought to front')
    } catch (error) {
      console.error('Error bringing rectangle to front:', error)
      setError('Failed to bring rectangle to front')
    }
  }, [])

  // Send rectangle to back
  const sendToBack = useCallback(async (rectangleId: string): Promise<void> => {
    try {
      await canvasService.sendToBack(rectangleId)
      setToastMessage('Sent to back')
    } catch (error) {
      console.error('Error sending rectangle to back:', error)
      setError('Failed to send rectangle to back')
    }
  }, [])

  const value: CanvasContextType = {
    rectangles,
    selectedShapes,
    primarySelectionId,
    primarySelectionType,
    loading,
    error,
    toastMessage,
    selectionLocked,
    createRectangle,
    updateRectangle,
    resizeRectangle,
    deleteRectangle,
    changeRectangleColor,
    selectRectangle,
    selectMultiple,
    selectAll,
    clearSelection,
    setSelectionLocked,
    deleteSelectedRectangles,
    changeSelectedRectanglesColor,
    copySelectedRectangles,
    pasteRectangles,
    duplicateRectangle,
    hasClipboardData,
    bringToFront,
    sendToBack,
    getViewportInfo,
    updateViewportInfo,
    clearError,
    clearToast,
    showToast,
    refreshRectangles
  }

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  )
}
