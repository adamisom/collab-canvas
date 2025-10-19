import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { canvasService } from '../services/canvasService'
import type { Rectangle, RectangleInput, CircleInput, LineInput, TextInput } from '../services/canvasService'
import { useAuth } from './AuthContext'
import type { ViewportInfo } from '../shared/types'
import type { Shape, ShapeType, CircleShape, LineShape, TextShape } from '../shared/shapes'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants'

interface CanvasContextType {
  rectangles: Rectangle[]
  circles: CircleShape[]  // PR #6
  lines: LineShape[]  // PR #7
  texts: TextShape[]  // PR #8
  shapeMode: 'rectangle' | 'circle' | 'line' | 'text'  // PR #8: Added 'text'
  selectedShapes: Map<string, ShapeType> // REFACTORED: Phase 3C PR #5 - unified selection
  primarySelectionId: string | null  // Last clicked shape
  primarySelectionType: ShapeType | null  // NEW: Type of primary selection
  loading: boolean
  error: string | null
  toastMessage: string | null
  selectionLocked: boolean
  
  // Shape mode operations (PR #6, updated PR #8)
  setShapeMode: (mode: 'rectangle' | 'circle' | 'line' | 'text') => void  // PR #8: Added 'text'
  
  // Rectangle operations
  createRectangle: (x: number, y: number) => Promise<Rectangle | null>
  updateRectangle: (rectangleId: string, updates: Partial<Omit<Rectangle, 'id' | 'createdBy' | 'createdAt'>>) => Promise<void>
  resizeRectangle: (rectangleId: string, newWidth: number, newHeight: number, newX?: number, newY?: number) => Promise<void>
  deleteRectangle: (rectangleId: string) => Promise<void>
  changeRectangleColor: (rectangleId: string, color: string) => Promise<void>
  
  // Circle operations (PR #6)
  createCircle: (x: number, y: number) => Promise<CircleShape | null>
  updateCircle: (circleId: string, updates: Partial<CircleShape>) => Promise<void>
  resizeCircle: (circleId: string, radius: number, x?: number, y?: number) => Promise<void>
  deleteCircle: (circleId: string) => Promise<void>
  changeCircleColor: (circleId: string, color: string) => Promise<void>
  
  // Line operations (PR #7)
  createLine: (x: number, y: number, endX: number, endY: number, hasArrow?: boolean) => Promise<LineShape | null>
  updateLine: (lineId: string, updates: Partial<LineShape>) => Promise<void>
  updateLineEndpoints: (lineId: string, endX: number, endY: number) => Promise<void>
  deleteLine: (lineId: string) => Promise<void>
  changeLineColor: (lineId: string, color: string) => Promise<void>
  
  // Text operations (PR #8)
  createText: (x: number, y: number, text?: string) => Promise<TextShape | null>
  updateText: (textId: string, updates: Partial<TextShape>) => Promise<void>
  deleteText: (textId: string) => Promise<void>
  changeTextColor: (textId: string, color: string) => Promise<void>
  // PR #9: Text formatting operations
  changeTextFontSize: (textId: string, fontSize: number) => Promise<void>
  toggleTextBold: (textId: string) => Promise<void>
  toggleTextItalic: (textId: string) => Promise<void>
  
  // Unified shape operations (PR #6, updated PR #8)
  selectShape: (shapeId: string, shapeType: ShapeType, additive?: boolean) => Promise<void>
  deleteShape: (shapeId: string, shapeType: ShapeType) => Promise<void>
  changeShapeColor: (shapeId: string, shapeType: ShapeType, color: string) => Promise<void>
  
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
  const [circles, setCircles] = useState<CircleShape[]>([])  // PR #6
  const [lines, setLines] = useState<LineShape[]>([])  // PR #7
  const [texts, setTexts] = useState<TextShape[]>([])  // PR #8
  const [shapeMode, setShapeMode] = useState<'rectangle' | 'circle' | 'line' | 'text'>('rectangle')  // PR #8: Added 'text'
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
      setCircles([])  // PR #6
      setLines([])  // PR #7
      setTexts([])  // PR #8
      setSelectedShapes(new Map())
      setPrimarySelectionId(null)
      setPrimarySelectionType(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Set up real-time listener for rectangles
    const unsubscribeRectangles = canvasService.onRectanglesChange((newRectangles) => {
      setRectangles(newRectangles)
      setLoading(false)
      
      // Clear selections for shapes that no longer exist
      const currentSelectedShapes = selectedShapesRef.current
      const currentPrimaryId = primarySelectionIdRef.current
      
      if (currentSelectedShapes.size > 0) {
        const existingRectIds = new Set(newRectangles.map(r => r.id))
        const updatedSelection = new Map<string, ShapeType>()
        
        // Keep only selections that still exist
        for (const [id, type] of currentSelectedShapes) {
          if (type === 'rectangle' && existingRectIds.has(id)) {
            updatedSelection.set(id, type)
          } else if (type !== 'rectangle') {
            // Keep non-rectangle selections (circles, etc.) - they'll be validated separately
            updatedSelection.set(id, type)
          }
        }
        
        if (updatedSelection.size !== currentSelectedShapes.size) {
          setSelectedShapes(updatedSelection)
        }
        
        // Clear primary if it no longer exists and was a rectangle
        if (currentPrimaryId && primarySelectionTypeRef.current === 'rectangle' && !existingRectIds.has(currentPrimaryId)) {
          const firstId = updatedSelection.size > 0 ? Array.from(updatedSelection.keys())[0] : null
          setPrimarySelectionId(firstId)
          setPrimarySelectionType(firstId ? updatedSelection.get(firstId) || null : null)
        }
      }
    })

    // PR #6: Set up real-time listener for circles
    const unsubscribeCircles = canvasService.onCirclesChange((newCircles) => {
      setCircles(newCircles)
      
      // Similar cleanup logic for circles
      const currentSelectedShapes = selectedShapesRef.current
      const currentPrimaryId = primarySelectionIdRef.current
      
      if (currentSelectedShapes.size > 0) {
        const existingCircleIds = new Set(newCircles.map(c => c.id))
        const updatedSelection = new Map<string, ShapeType>()
        
        for (const [id, type] of currentSelectedShapes) {
          if (type === 'circle' && existingCircleIds.has(id)) {
            updatedSelection.set(id, type)
          } else if (type !== 'circle') {
            updatedSelection.set(id, type)
          }
        }
        
        if (updatedSelection.size !== currentSelectedShapes.size) {
          setSelectedShapes(updatedSelection)
        }
        
        // Clear primary if it no longer exists and was a circle
        if (currentPrimaryId && primarySelectionTypeRef.current === 'circle' && !existingCircleIds.has(currentPrimaryId)) {
          const firstId = updatedSelection.size > 0 ? Array.from(updatedSelection.keys())[0] : null
          setPrimarySelectionId(firstId)
          setPrimarySelectionType(firstId ? updatedSelection.get(firstId) || null : null)
        }
      }
    })

    // PR #7: Set up real-time listener for lines
    const unsubscribeLines = canvasService.onLinesChange((newLines) => {
      setLines(newLines)
      
      // Similar cleanup logic for lines
      const currentSelectedShapes = selectedShapesRef.current
      const currentPrimaryId = primarySelectionIdRef.current
      
      if (currentSelectedShapes.size > 0) {
        const existingLineIds = new Set(newLines.map(l => l.id))
        const updatedSelection = new Map<string, ShapeType>()
        
        for (const [id, type] of currentSelectedShapes) {
          if (type === 'line' && existingLineIds.has(id)) {
            updatedSelection.set(id, type)
          } else if (type !== 'line') {
            updatedSelection.set(id, type)
          }
        }
        
        if (updatedSelection.size !== currentSelectedShapes.size) {
          setSelectedShapes(updatedSelection)
        }
        
        // Clear primary if it no longer exists and was a line
        if (currentPrimaryId && primarySelectionTypeRef.current === 'line' && !existingLineIds.has(currentPrimaryId)) {
          const firstId = updatedSelection.size > 0 ? Array.from(updatedSelection.keys())[0] : null
          setPrimarySelectionId(firstId)
          setPrimarySelectionType(firstId ? updatedSelection.get(firstId) || null : null)
        }
      }
    })

    // PR #8: Set up real-time listener for texts
    const unsubscribeTexts = canvasService.onTextsChange((newTexts) => {
      setTexts(newTexts)
      
      // Similar cleanup logic for texts
      const currentSelectedShapes = selectedShapesRef.current
      const currentPrimaryId = primarySelectionIdRef.current
      
      if (currentSelectedShapes.size > 0) {
        const existingTextIds = new Set(newTexts.map(t => t.id))
        const updatedSelection = new Map<string, ShapeType>()
        
        for (const [id, type] of currentSelectedShapes) {
          if (type === 'text' && existingTextIds.has(id)) {
            updatedSelection.set(id, type)
          } else if (type !== 'text') {
            updatedSelection.set(id, type)
          }
        }
        
        if (updatedSelection.size !== currentSelectedShapes.size) {
          setSelectedShapes(updatedSelection)
        }
        
        // Clear primary if it no longer exists and was text
        if (currentPrimaryId && primarySelectionTypeRef.current === 'text' && !existingTextIds.has(currentPrimaryId)) {
          const firstId = updatedSelection.size > 0 ? Array.from(updatedSelection.keys())[0] : null
          setPrimarySelectionId(firstId)
          setPrimarySelectionType(firstId ? updatedSelection.get(firstId) || null : null)
        }
      }
    })

    return () => {
      unsubscribeRectangles()
      unsubscribeCircles()  // PR #6
      unsubscribeLines()  // PR #7
      unsubscribeTexts()  // PR #8
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

  // ============================================================================
  // PR #6: CIRCLE OPERATIONS
  // ============================================================================

  // Create a new circle
  const createCircle = useCallback(async (x: number, y: number): Promise<CircleShape | null> => {
    if (!user) {
      setError('Must be logged in to create circles')
      return null
    }

    try {
      const circleInput: CircleInput = {
        x,
        y,
        radius: 40,  // Default radius
        createdBy: user.uid
      }

      const newCircle = await canvasService.createCircle(circleInput)
      
      // Select the newly created circle (single selection)
      const newSelection = new Map<string, ShapeType>()
      newSelection.set(newCircle.id, 'circle')
      setSelectedShapes(newSelection)
      setPrimarySelectionId(newCircle.id)
      setPrimarySelectionType('circle')
      
      return newCircle
    } catch (error) {
      console.error('Error creating circle:', error)
      setError('Failed to create circle')
      return null
    }
  }, [user])

  // Update an existing circle
  const updateCircle = useCallback(async (
    circleId: string, 
    updates: Partial<CircleShape>
  ): Promise<void> => {
    try {
      await canvasService.updateCircle(circleId, updates)
    } catch (error) {
      console.error('Error updating circle:', error)
      setError('Failed to update circle')
    }
  }, [])

  // Resize an existing circle
  const resizeCircle = useCallback(async (
    circleId: string, 
    radius: number, 
    x?: number, 
    y?: number
  ): Promise<void> => {
    try {
      await canvasService.resizeCircle(circleId, radius, x, y)
    } catch (error) {
      console.error('Error resizing circle:', error)
      setError('Failed to resize circle')
    }
  }, [])

  // Delete a circle
  const deleteCircle = useCallback(async (circleId: string): Promise<void> => {
    try {
      await canvasService.deleteCircle(circleId)
      
      // Remove from selection if deleted
      if (selectedShapes.has(circleId)) {
        setSelectedShapes(prev => {
          const next = new Map(prev)
          next.delete(circleId)
          return next
        })
        
        // Update primary if it was deleted
        if (primarySelectionId === circleId) {
          const remaining = Array.from(selectedShapes.keys()).filter(id => id !== circleId)
          setPrimarySelectionId(remaining.length > 0 ? remaining[0] : null)
          setPrimarySelectionType(remaining.length > 0 ? selectedShapes.get(remaining[0]) || null : null)
        }
      }
    } catch (error) {
      console.error('Error deleting circle:', error)
      setError('Failed to delete circle')
    }
  }, [selectedShapes, primarySelectionId])

  // Change circle color
  const changeCircleColor = useCallback(async (circleId: string, color: string) => {
    try {
      await canvasService.updateCircle(circleId, { color })
    } catch (error) {
      console.error('Error changing circle color:', error)
      setError('Failed to change circle color')
    }
  }, [])

  // ============================================================================
  // PR #7: LINE OPERATIONS
  // ============================================================================

  // Create a new line
  const createLine = useCallback(async (
    x: number,
    y: number,
    endX: number,
    endY: number,
    hasArrow: boolean = false
  ): Promise<LineShape | null> => {
    if (!user) {
      setError('Must be logged in to create lines')
      return null
    }

    try {
      const lineInput: LineInput = {
        x,
        y,
        endX,
        endY,
        hasArrow,
        createdBy: user.uid
      }

      const newLine = await canvasService.createLine(lineInput)
      
      // Select the newly created line (single selection)
      const newSelection = new Map<string, ShapeType>()
      newSelection.set(newLine.id, 'line')
      setSelectedShapes(newSelection)
      setPrimarySelectionId(newLine.id)
      setPrimarySelectionType('line')
      
      return newLine
    } catch (error) {
      console.error('Error creating line:', error)
      setError('Failed to create line')
      return null
    }
  }, [user])

  // Update an existing line
  const updateLine = useCallback(async (
    lineId: string, 
    updates: Partial<LineShape>
  ): Promise<void> => {
    try {
      await canvasService.updateLine(lineId, updates)
    } catch (error) {
      console.error('Error updating line:', error)
      setError('Failed to update line')
    }
  }, [])

  // Update line endpoints
  const updateLineEndpoints = useCallback(async (
    lineId: string, 
    endX: number, 
    endY: number
  ): Promise<void> => {
    try {
      await canvasService.updateLineEndpoints(lineId, endX, endY)
    } catch (error) {
      console.error('Error updating line endpoints:', error)
      setError('Failed to update line endpoints')
    }
  }, [])

  // Delete a line
  const deleteLine = useCallback(async (lineId: string): Promise<void> => {
    try {
      await canvasService.deleteLine(lineId)
      
      // Remove from selection if deleted
      if (selectedShapes.has(lineId)) {
        setSelectedShapes(prev => {
          const next = new Map(prev)
          next.delete(lineId)
          return next
        })
        
        // Update primary if it was deleted
        if (primarySelectionId === lineId) {
          const remaining = Array.from(selectedShapes.keys()).filter(id => id !== lineId)
          setPrimarySelectionId(remaining.length > 0 ? remaining[0] : null)
          setPrimarySelectionType(remaining.length > 0 ? selectedShapes.get(remaining[0]) || null : null)
        }
      }
    } catch (error) {
      console.error('Error deleting line:', error)
      setError('Failed to delete line')
    }
  }, [selectedShapes, primarySelectionId])

  // Change line color
  const changeLineColor = useCallback(async (lineId: string, color: string) => {
    try {
      await canvasService.updateLine(lineId, { color })
    } catch (error) {
      console.error('Error changing line color:', error)
      setError('Failed to change line color')
    }
  }, [])

  // ============================================================================
  // PR #8: TEXT OPERATIONS
  // ============================================================================

  // Create a new text
  const createText = useCallback(async (
    x: number,
    y: number,
    text?: string
  ): Promise<TextShape | null> => {
    if (!user) {
      setError('Must be logged in to create text')
      return null
    }

    try {
      const textInput: TextInput = {
        x,
        y,
        text: text || 'New Text',
        createdBy: user.uid
      }

      const newText = await canvasService.createText(textInput)
      
      // Select the newly created text (single selection)
      const newSelection = new Map<string, ShapeType>()
      newSelection.set(newText.id, 'text')
      setSelectedShapes(newSelection)
      setPrimarySelectionId(newText.id)
      setPrimarySelectionType('text')
      
      return newText
    } catch (error) {
      console.error('Error creating text:', error)
      setError('Failed to create text')
      return null
    }
  }, [user])

  // Update an existing text
  const updateText = useCallback(async (
    textId: string, 
    updates: Partial<TextShape>
  ): Promise<void> => {
    try {
      await canvasService.updateText(textId, updates)
    } catch (error) {
      console.error('Error updating text:', error)
      setError('Failed to update text')
    }
  }, [])

  // Delete a text
  const deleteText = useCallback(async (textId: string): Promise<void> => {
    try {
      await canvasService.deleteText(textId)
      
      // Remove from selection if deleted
      if (selectedShapes.has(textId)) {
        setSelectedShapes(prev => {
          const next = new Map(prev)
          next.delete(textId)
          return next
        })
        
        // Update primary if it was deleted
        if (primarySelectionId === textId) {
          const remaining = Array.from(selectedShapes.keys()).filter(id => id !== textId)
          setPrimarySelectionId(remaining.length > 0 ? remaining[0] : null)
          setPrimarySelectionType(remaining.length > 0 ? selectedShapes.get(remaining[0]) || null : null)
        }
      }
    } catch (error) {
      console.error('Error deleting text:', error)
      setError('Failed to delete text')
    }
  }, [selectedShapes, primarySelectionId])

  // Change text color
  const changeTextColor = useCallback(async (textId: string, color: string) => {
    try {
      await canvasService.updateText(textId, { color })
    } catch (error) {
      console.error('Error changing text color:', error)
      setError('Failed to change text color')
    }
  }, [])

  // PR #9: Text formatting operations
  const changeTextFontSize = useCallback(async (textId: string, fontSize: number) => {
    try {
      await canvasService.updateText(textId, { fontSize })
    } catch (error) {
      console.error('Error changing text font size:', error)
      setError('Failed to change text font size')
    }
  }, [])

  const toggleTextBold = useCallback(async (textId: string) => {
    try {
      const text = texts.find(t => t.id === textId)
      if (!text) return
      const newWeight = text.fontWeight === 'bold' ? 'normal' : 'bold'
      await canvasService.updateText(textId, { fontWeight: newWeight })
    } catch (error) {
      console.error('Error toggling text bold:', error)
      setError('Failed to toggle text bold')
    }
  }, [texts])

  const toggleTextItalic = useCallback(async (textId: string) => {
    try {
      const text = texts.find(t => t.id === textId)
      if (!text) return
      const newStyle = text.fontStyle === 'italic' ? 'normal' : 'italic'
      await canvasService.updateText(textId, { fontStyle: newStyle })
    } catch (error) {
      console.error('Error toggling text italic:', error)
      setError('Failed to toggle text italic')
    }
  }, [texts])

  // ============================================================================
  // PR #6: UNIFIED SHAPE OPERATIONS (type-discriminated)
  // ============================================================================

  // Unified selectShape (handles rectangles, circles, etc.)
  const selectShape = useCallback(async (shapeId: string, shapeType: ShapeType, additive: boolean = false) => {
    if (!user || !username) return
    
    if (selectionLocked) {
      console.log('Selection locked, ignoring selection change')
      return
    }

    // Delegate to the appropriate service method
    if (shapeType === 'rectangle') {
      await selectRectangle(shapeId, additive)
    } else if (shapeType === 'circle') {
      // Similar logic to selectRectangle
      const circle = circles.find(c => c.id === shapeId)
      if (!circle) {
        showToast('Circle not found')
        return
      }

      if (circle.selectedBy && circle.selectedBy !== user.uid) {
        showToast(`Circle is currently selected by ${circle.selectedByUsername || 'another user'}`)
        return
      }

      if (!additive) {
        // Clear all previous selections
        for (const [prevId, prevType] of selectedShapes) {
          if (prevType === 'rectangle') {
            await canvasService.deselectRectangle(prevId, user.uid)
          } else if (prevType === 'circle') {
            await canvasService.deselectCircle(prevId, user.uid)
          }
        }

        // Select this one
        const newSelection = new Map<string, ShapeType>()
        newSelection.set(shapeId, 'circle')
        setSelectedShapes(newSelection)
        setPrimarySelectionId(shapeId)
        setPrimarySelectionType('circle')
        await canvasService.selectCircle(shapeId, user.uid, username)
      } else {
        // Additive selection (toggle)
        const isCurrentlySelected = selectedShapes.has(shapeId)

        if (isCurrentlySelected) {
          // Remove from selection
          await canvasService.deselectCircle(shapeId, user.uid)

          setSelectedShapes(prev => {
            const next = new Map(prev)
            next.delete(shapeId)

            if (shapeId === primarySelectionId) {
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
          await canvasService.selectCircle(shapeId, user.uid, username)

          setSelectedShapes(prev => {
            const next = new Map(prev)
            next.set(shapeId, 'circle')
            return next
          })
          setPrimarySelectionId(shapeId)
          setPrimarySelectionType('circle')
        }
      }
    } else if (shapeType === 'line') {
      // PR #7: Line selection logic (similar to circle)
      const line = lines.find(l => l.id === shapeId)
      if (!line) {
        showToast('Line not found')
        return
      }

      if (line.selectedBy && line.selectedBy !== user.uid) {
        showToast(`Line is currently selected by ${line.selectedByUsername || 'another user'}`)
        return
      }

      if (!additive) {
        // Clear all previous selections
        for (const [prevId, prevType] of selectedShapes) {
          if (prevType === 'rectangle') {
            await canvasService.deselectRectangle(prevId, user.uid)
          } else if (prevType === 'circle') {
            await canvasService.deselectCircle(prevId, user.uid)
          } else if (prevType === 'line') {
            await canvasService.deselectLine(prevId, user.uid)
          }
        }

        // Select this one
        const newSelection = new Map<string, ShapeType>()
        newSelection.set(shapeId, 'line')
        setSelectedShapes(newSelection)
        setPrimarySelectionId(shapeId)
        setPrimarySelectionType('line')
        await canvasService.selectLine(shapeId, user.uid, username)
      } else {
        // Additive selection (toggle)
        const isCurrentlySelected = selectedShapes.has(shapeId)

        if (isCurrentlySelected) {
          // Remove from selection
          await canvasService.deselectLine(shapeId, user.uid)

          setSelectedShapes(prev => {
            const next = new Map(prev)
            next.delete(shapeId)

            if (shapeId === primarySelectionId) {
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
          await canvasService.selectLine(shapeId, user.uid, username)

          setSelectedShapes(prev => {
            const next = new Map(prev)
            next.set(shapeId, 'line')
            return next
          })
          setPrimarySelectionId(shapeId)
          setPrimarySelectionType('line')
        }
      }
    } else if (shapeType === 'text') {
      // PR #8: Text selection logic (similar to circle/line)
      const text = texts.find(t => t.id === shapeId)
      if (!text) {
        showToast('Text not found')
        return
      }

      if (text.selectedBy && text.selectedBy !== user.uid) {
        showToast(`Text is currently selected by ${text.selectedByUsername || 'another user'}`)
        return
      }

      if (!additive) {
        // Clear all previous selections
        for (const [prevId, prevType] of selectedShapes) {
          if (prevType === 'rectangle') {
            await canvasService.deselectRectangle(prevId, user.uid)
          } else if (prevType === 'circle') {
            await canvasService.deselectCircle(prevId, user.uid)
          } else if (prevType === 'line') {
            await canvasService.deselectLine(prevId, user.uid)
          } else if (prevType === 'text') {
            await canvasService.deselectText(prevId, user.uid)
          }
        }

        // Select this one
        const newSelection = new Map<string, ShapeType>()
        newSelection.set(shapeId, 'text')
        setSelectedShapes(newSelection)
        setPrimarySelectionId(shapeId)
        setPrimarySelectionType('text')
        await canvasService.selectText(shapeId, user.uid, username)
      } else {
        // Additive selection toggle
        if (selectedShapes.has(shapeId)) {
          // Deselect
          await canvasService.deselectText(shapeId, user.uid)

          setSelectedShapes(prev => {
            const next = new Map(prev)
            next.delete(shapeId)

            if (shapeId === primarySelectionId) {
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
          await canvasService.selectText(shapeId, user.uid, username)

          setSelectedShapes(prev => {
            const next = new Map(prev)
            next.set(shapeId, 'text')
            return next
          })
          setPrimarySelectionId(shapeId)
          setPrimarySelectionType('text')
        }
      }
    }
  }, [user, username, circles, lines, texts, selectedShapes, primarySelectionId, selectionLocked, showToast, selectRectangle])

  // Unified deleteShape (handles rectangles, circles, lines, text)
  const deleteShape = useCallback(async (shapeId: string, shapeType: ShapeType) => {
    if (shapeType === 'rectangle') {
      await deleteRectangle(shapeId)
    } else if (shapeType === 'circle') {
      await deleteCircle(shapeId)
    } else if (shapeType === 'line') {
      await deleteLine(shapeId)
    } else if (shapeType === 'text') {
      await deleteText(shapeId)
    }
  }, [deleteRectangle, deleteCircle, deleteLine, deleteText])

  // Unified changeShapeColor (handles rectangles, circles, lines, text)
  const changeShapeColor = useCallback(async (shapeId: string, shapeType: ShapeType, color: string) => {
    if (shapeType === 'rectangle') {
      await changeRectangleColor(shapeId, color)
    } else if (shapeType === 'circle') {
      await changeCircleColor(shapeId, color)
    } else if (shapeType === 'line') {
      await changeLineColor(shapeId, color)
    } else if (shapeType === 'text') {
      await changeTextColor(shapeId, color)
    }
  }, [changeRectangleColor, changeCircleColor, changeLineColor, changeTextColor])

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
    circles,  // PR #6
    lines,  // PR #7
    texts,  // PR #8
    shapeMode,  // PR #6, updated PR #7, updated PR #8
    selectedShapes,
    primarySelectionId,
    primarySelectionType,
    loading,
    error,
    toastMessage,
    selectionLocked,
    setShapeMode,  // PR #6, updated PR #7, updated PR #8
    createRectangle,
    updateRectangle,
    resizeRectangle,
    deleteRectangle,
    changeRectangleColor,
    createCircle,  // PR #6
    updateCircle,  // PR #6
    resizeCircle,  // PR #6
    deleteCircle,  // PR #6
    changeCircleColor,  // PR #6
    createLine,  // PR #7
    updateLine,  // PR #7
    updateLineEndpoints,  // PR #7
    deleteLine,  // PR #7
    changeLineColor,  // PR #7
    createText,  // PR #8
    updateText,  // PR #8
    deleteText,  // PR #8
    changeTextColor,  // PR #8
    changeTextFontSize,  // PR #9
    toggleTextBold,  // PR #9
    toggleTextItalic,  // PR #9
    selectShape,  // PR #6, updated PR #7, updated PR #8
    deleteShape,  // PR #6, updated PR #7, updated PR #8
    changeShapeColor,  // PR #6, updated PR #7, updated PR #8
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
