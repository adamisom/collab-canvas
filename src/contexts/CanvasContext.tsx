import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { canvasService } from '../services/canvasService'
import type { Rectangle, RectangleInput, CircleInput, LineInput, TextInput } from '../services/canvasService'
import { useAuth } from './AuthContext'
import type { ViewportInfo } from '../shared/types'
import type { Shape, ShapeType, CircleShape, LineShape, TextShape } from '../shared/shapes'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants'
import { getShapeBounds, getSelectedShapesFromMap, updateShapeProperty } from '../utils/shapeHelpers'
import { calculateAlignedPosition, calculateDistributedPositions } from '../utils/alignmentHelpers'
import type { AlignmentType } from '../components/ui/AlignmentToolbar'
import { isShapeInLasso } from '../utils/selectionHelpers'
import { SHAPE_CONSTANTS } from '../utils/constants'

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
  selectAll: () => Promise<void>  // NEW
  clearSelection: () => Promise<void>  // NEW
  setSelectionLocked: (locked: boolean) => void
  
  // Bulk operations (NEW)
  deleteSelectedShapes: () => Promise<void>
  changeSelectedShapesColor: (color: string) => Promise<void>
  
  // Clipboard operations (REFACTORED: PR #5)
  copySelectedShapes: () => void  // Works with all selected shapes
  pasteShapes: () => Promise<void>  // Handles Shape[] discriminated union
  duplicateShape: (shapeId: string, shapeType: ShapeType) => Promise<boolean>  // Works with all shape types
  duplicateRectangle: (rectangleId: string) => Promise<Rectangle | null>  // Deprecated (single only)
  hasClipboardData: () => boolean
  
  // Layering operations
  bringToFront: (rectangleId: string) => Promise<void>
  sendToBack: (rectangleId: string) => Promise<void>
  
  // Alignment operations (Phase 3D PR #10)
  alignShapes: (alignType: AlignmentType) => Promise<void>
  
  // Selection tools (Phase 3D PR #11)
  selectShapesInLasso: (lassoPoints: number[]) => Promise<void>
  selectAllOfType: (shapeType: ShapeType) => Promise<void>
  selectAllCycleByType: () => Promise<void>  // NEW: Cycle through shape types
  
  // Rotation operations (Phase 3D PR #12)
  rotateShape: (shapeId: string, shapeType: ShapeType, rotation: number) => Promise<void>
  
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

  /**
   * Helper: Get shape service methods by type
   * Centralizes the mapping between shape types and their service operations
   * MOVED UP: Must be defined before selectAll and other functions that use it
   */
  const getShapeServiceMethods = useCallback((shapeType: ShapeType) => {
    switch (shapeType) {
      case 'rectangle':
        return {
          select: canvasService.selectRectangle.bind(canvasService),
          deselect: canvasService.deselectRectangle.bind(canvasService)
        }
      case 'circle':
        return {
          select: canvasService.selectCircle.bind(canvasService),
          deselect: canvasService.deselectCircle.bind(canvasService)
        }
      case 'line':
        return {
          select: canvasService.selectLine.bind(canvasService),
          deselect: canvasService.deselectLine.bind(canvasService)
        }
      case 'text':
        return {
          select: canvasService.selectText.bind(canvasService),
          deselect: canvasService.deselectText.bind(canvasService)
        }
    }
  }, [])

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
      console.log('🔄 Circles updated from database:', newCircles.map(c => ({ id: c.id, zIndex: c.zIndex })))
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

  // NEW: Select all available shapes (skip those selected by others)
  const selectAll = useCallback(async () => {
    if (selectionLocked) return
    if (!user || !username) return

    // Collect all available shapes from all types
    const availableShapes: Array<{ id: string; type: ShapeType }> = [
      ...rectangles
        .filter(r => !r.selectedBy || r.selectedBy === user.uid)
        .map(r => ({ id: r.id, type: 'rectangle' as ShapeType })),
      ...circles
        .filter(c => !c.selectedBy || c.selectedBy === user.uid)
        .map(c => ({ id: c.id, type: 'circle' as ShapeType })),
      ...lines
        .filter(l => !l.selectedBy || l.selectedBy === user.uid)
        .map(l => ({ id: l.id, type: 'line' as ShapeType })),
      ...texts
        .filter(t => !t.selectedBy || t.selectedBy === user.uid)
        .map(t => ({ id: t.id, type: 'text' as ShapeType }))
    ]

    // Enforce selection limit
    if (availableShapes.length > 25) {
      showToast(`Too many shapes (${availableShapes.length}). Max selection is 25.`)
      return
    }

    // Clear previous selections
    for (const [prevId, prevType] of selectedShapes.entries()) {
      const methods = getShapeServiceMethods(prevType)
      await methods.deselect(prevId, user.uid)
    }

    // Select all available shapes
    const newSelection = new Map<string, ShapeType>()
    for (const shape of availableShapes) {
      const methods = getShapeServiceMethods(shape.type)
      await methods.select(shape.id, user.uid, username)
      newSelection.set(shape.id, shape.type)
    }

    setSelectedShapes(newSelection)
    const lastShape = availableShapes[availableShapes.length - 1]
    setPrimarySelectionId(lastShape?.id || null)
    setPrimarySelectionType(lastShape?.type || null)

    showToast(`Selected all ${availableShapes.length} shape${availableShapes.length !== 1 ? 's' : ''}`)
  }, [selectionLocked, user, username, rectangles, circles, lines, texts, selectedShapes, showToast, getShapeServiceMethods])

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

  // NEW: Delete all selected shapes (rectangles, circles, lines, texts)
  const deleteSelectedShapes = useCallback(async () => {
    if (selectedShapes.size === 0) return

    // Count shapes by type
    const typeCounts = { rectangle: 0, circle: 0, line: 0, text: 0 }
    
    // Delete all sequentially based on shape type
    for (const [id, shapeType] of selectedShapes.entries()) {
      typeCounts[shapeType]++
      switch (shapeType) {
        case 'rectangle':
          await canvasService.deleteRectangle(id)
          break
        case 'circle':
          await canvasService.deleteCircle(id)
          break
        case 'line':
          await canvasService.deleteLine(id)
          break
        case 'text':
          await canvasService.deleteText(id)
          break
      }
    }

    setSelectedShapes(new Map())
    setPrimarySelectionId(null)
    setPrimarySelectionType(null)

    // Generate custom message based on what was deleted
    const count = selectedShapes.size
    if (count === 1) {
      // Single shape - be specific
      const shapeType = Array.from(selectedShapes.values())[0]
      showToast(`Deleted 1 ${shapeType}`)
    } else {
      // Multiple shapes - check if all same type
      const types = Object.entries(typeCounts).filter(([, count]) => count > 0)
      if (types.length === 1) {
        // All same type
        const [type, typeCount] = types[0]
        showToast(`Deleted ${typeCount} ${type}s`)
      } else {
        // Mixed types
        const parts = types.map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        showToast(`Deleted ${count} shapes (${parts.join(', ')})`)
      }
    }
  }, [selectedShapes, showToast])

  // NEW: Change color of all selected shapes
  const changeSelectedShapesColor = useCallback(async (color: string) => {
    if (selectedShapes.size === 0) return

    // Update all sequentially based on shape type
    for (const [id, shapeType] of selectedShapes.entries()) {
      switch (shapeType) {
        case 'rectangle':
          await canvasService.updateRectangle(id, { color })
          break
        case 'circle':
          await canvasService.updateCircle(id, { color })
          break
        case 'line':
          await canvasService.updateLine(id, { color })
          break
        case 'text':
          await canvasService.updateText(id, { color })
          break
      }
    }

    const count = selectedShapes.size
    showToast(`Changed color of ${count} shape${count > 1 ? 's' : ''}`)
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

  // ============================================================================
  // UNIFIED SELECTION (REFACTORED PR #5, Optimized Post-3C)
  // ============================================================================

  /**
   * Helper: Find shape by ID and type
   * Returns the shape object and handles "not found" case
   */
  const findShapeByIdAndType = useCallback((shapeId: string, shapeType: ShapeType): Shape | null => {
    switch (shapeType) {
      case 'rectangle':
        // Note: Rectangle type from canvasService doesn't fully implement Shape interface
        // TODO: Migrate Rectangle to use shared BaseShape (Future Refactor #2)
        return rectangles.find(r => r.id === shapeId) as Shape | undefined || null
      case 'circle':
        return circles.find(c => c.id === shapeId) || null
      case 'line':
        return lines.find(l => l.id === shapeId) || null
      case 'text':
        return texts.find(t => t.id === shapeId) || null
    }
  }, [rectangles, circles, lines, texts])

  /**
   * Helper: Clear all previous selections (for non-additive mode)
   * Deselects all shapes across all types
   */
  const clearAllSelections = useCallback(async () => {
    if (!user) return
    for (const [prevId, prevType] of selectedShapes) {
      const methods = getShapeServiceMethods(prevType)
      await methods.deselect(prevId, user.uid)
    }
  }, [selectedShapes, user, getShapeServiceMethods])

  /**
   * Helper: Update primary selection after removing a shape
   * If the removed shape was primary, promote another or clear
   */
  const updatePrimaryAfterRemoval = useCallback((
    removedId: string,
    updatedSelection: Map<string, ShapeType>
  ): { newPrimary: string | null; newPrimaryType: ShapeType | null } => {
    if (removedId === primarySelectionId) {
      if (updatedSelection.size > 0) {
        const newPrimary = Array.from(updatedSelection.keys())[0]
        return {
          newPrimary,
          newPrimaryType: updatedSelection.get(newPrimary) || null
        }
      } else {
        return { newPrimary: null, newPrimaryType: null }
      }
    }
    return { newPrimary: primarySelectionId, newPrimaryType: primarySelectionType }
  }, [primarySelectionId, primarySelectionType])

  /**
   * Unified selectShape (handles all shape types with common logic)
   * REFACTORED: Extracted duplicate logic into helper functions
   */
  const selectShape = useCallback(async (shapeId: string, shapeType: ShapeType, additive: boolean = false) => {
    if (!user || !username) return
    
    if (selectionLocked) {
      console.log('Selection locked, ignoring selection change')
      return
    }

    // Special case: rectangles use legacy selectRectangle
    if (shapeType === 'rectangle') {
      await selectRectangle(shapeId, additive)
      return
    }

    // Find the shape
    const shape = findShapeByIdAndType(shapeId, shapeType)
    if (!shape) {
      showToast(`${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)} not found`)
      return
    }

    // Check ownership
    if (shape.selectedBy && shape.selectedBy !== user.uid) {
      const shapeName = shapeType.charAt(0).toUpperCase() + shapeType.slice(1)
      showToast(`${shapeName} is currently selected by ${shape.selectedByUsername || 'another user'}`)
      return
    }

    const methods = getShapeServiceMethods(shapeType)

    if (!additive) {
      // Non-additive: clear all, then select this one
      await clearAllSelections()

      const newSelection = new Map<string, ShapeType>()
      newSelection.set(shapeId, shapeType)
      setSelectedShapes(newSelection)
      setPrimarySelectionId(shapeId)
      setPrimarySelectionType(shapeType)
      await methods.select(shapeId, user.uid, username)
    } else {
      // Additive: toggle selection
      const isCurrentlySelected = selectedShapes.has(shapeId)

      if (isCurrentlySelected) {
        // Remove from selection
        await methods.deselect(shapeId, user.uid)

        setSelectedShapes(prev => {
          const next = new Map(prev)
          next.delete(shapeId)

          const { newPrimary, newPrimaryType } = updatePrimaryAfterRemoval(shapeId, next)
          setPrimarySelectionId(newPrimary)
          setPrimarySelectionType(newPrimaryType)

          return next
        })
      } else {
        // Add to selection
        await methods.select(shapeId, user.uid, username)

        setSelectedShapes(prev => {
          const next = new Map(prev)
          next.set(shapeId, shapeType)
          return next
        })
        setPrimarySelectionId(shapeId)
        setPrimarySelectionType(shapeType)
      }
    }
  }, [user, username, selectionLocked, selectRectangle, selectedShapes, showToast, findShapeByIdAndType, clearAllSelections, updatePrimaryAfterRemoval, getShapeServiceMethods])


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

  // Copy all selected shapes to clipboard (all shape types)
  const copySelectedShapes = useCallback(() => {
    if (selectedShapes.size === 0) {
      showToast('No shapes selected to copy')
      return
    }

    // Collect all selected shapes by type
    const selected: Shape[] = []
    const typeCounts = { rectangle: 0, circle: 0, line: 0, text: 0 }

    for (const [id, shapeType] of selectedShapes.entries()) {
      typeCounts[shapeType]++
      switch (shapeType) {
        case 'rectangle': {
          const rect = rectangles.find(r => r.id === id)
          if (rect) selected.push(rect)
          break
        }
        case 'circle': {
          const circle = circles.find(c => c.id === id)
          if (circle) selected.push(circle)
          break
        }
        case 'line': {
          const line = lines.find(l => l.id === id)
          if (line) selected.push(line)
          break
        }
        case 'text': {
          const text = texts.find(t => t.id === id)
          if (text) selected.push(text)
          break
        }
      }
    }

    setClipboardShapes(selected)
    
    // Generate toast message
    const count = selected.length
    if (count === 1) {
      const shapeType = selected[0].type
      showToast(`Copied 1 ${shapeType}`)
    } else {
      const types = Object.entries(typeCounts).filter(([, count]) => count > 0)
      if (types.length === 1) {
        const [type, typeCount] = types[0]
        showToast(`Copied ${typeCount} ${type}s`)
      } else {
        showToast(`Copied ${count} shapes`)
      }
    }
  }, [rectangles, circles, lines, texts, selectedShapes, showToast])

  // Paste all clipboard shapes (all shape types)
  const pasteShapes = useCallback(async (): Promise<void> => {
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
      const typeCounts = { rectangle: 0, circle: 0, line: 0, text: 0 }

      // Calculate bounding box of all clipboard shapes
      const allX: number[] = []
      const allY: number[] = []
      
      for (const shape of clipboardShapes) {
        if (shape.type === 'rectangle') {
          allX.push(shape.x)
          allY.push(shape.y)
        } else if (shape.type === 'circle') {
          allX.push(shape.x)
          allY.push(shape.y)
        } else if (shape.type === 'line') {
          allX.push(shape.x, shape.endX)
          allY.push(shape.y, shape.endY)
        } else if (shape.type === 'text') {
          allX.push(shape.x)
          allY.push(shape.y)
        }
      }

      const minX = Math.min(...allX)
      const minY = Math.min(...allY)

      // Paste all shapes with same relative positions
      for (const original of clipboardShapes) {
        typeCounts[original.type]++
        
        switch (original.type) {
          case 'rectangle': {
            const rect = original as Rectangle
            const relativeX = rect.x - minX
            const relativeY = rect.y - minY
            const newX = Math.min(minX + PASTE_OFFSET + relativeX, CANVAS_WIDTH - rect.width)
            const newY = Math.min(minY + PASTE_OFFSET + relativeY, CANVAS_HEIGHT - rect.height)

            const newRect = await canvasService.createRectangle({
              x: newX,
              y: newY,
              width: rect.width,
              height: rect.height,
              color: rect.color,
              createdBy: user.uid
            })

            if (newRect) {
              newSelection.set(newRect.id, 'rectangle')
              await canvasService.selectRectangle(newRect.id, user.uid, username)
            }
            break
          }

          case 'circle': {
            const circle = original as CircleShape
            const relativeX = circle.x - minX
            const relativeY = circle.y - minY
            const newX = Math.min(minX + PASTE_OFFSET + relativeX, CANVAS_WIDTH - circle.radius * 2)
            const newY = Math.min(minY + PASTE_OFFSET + relativeY, CANVAS_HEIGHT - circle.radius * 2)

            const newCircle = await canvasService.createCircle({
              x: newX,
              y: newY,
              radius: circle.radius,
              color: circle.color,
              createdBy: user.uid
            })

            if (newCircle) {
              newSelection.set(newCircle.id, 'circle')
              await canvasService.selectCircle(newCircle.id, user.uid, username)
            }
            break
          }

          case 'line': {
            const line = original as LineShape
            const relativeStartX = line.x - minX
            const relativeStartY = line.y - minY
            const relativeEndX = line.endX - minX
            const relativeEndY = line.endY - minY
            
            const newStartX = minX + PASTE_OFFSET + relativeStartX
            const newStartY = minY + PASTE_OFFSET + relativeStartY
            const newEndX = minX + PASTE_OFFSET + relativeEndX
            const newEndY = minY + PASTE_OFFSET + relativeEndY

            const newLine = await canvasService.createLine({
              x: newStartX,
              y: newStartY,
              endX: newEndX,
              endY: newEndY,
              strokeWidth: line.strokeWidth,
              color: line.color,
              hasArrow: line.hasArrow,
              createdBy: user.uid
            })

            if (newLine) {
              newSelection.set(newLine.id, 'line')
              await canvasService.selectLine(newLine.id, user.uid, username)
            }
            break
          }

          case 'text': {
            const text = original as TextShape
            const relativeX = text.x - minX
            const relativeY = text.y - minY
            const newX = minX + PASTE_OFFSET + relativeX
            const newY = minY + PASTE_OFFSET + relativeY

            const newText = await canvasService.createText({
              x: newX,
              y: newY,
              text: text.text,
              color: text.color,
              createdBy: user.uid
            })

            if (newText) {
              // Update font properties after creation
              await canvasService.updateText(newText.id, {
                fontSize: text.fontSize,
                fontWeight: text.fontWeight,
                fontStyle: text.fontStyle
              })
              
              newSelection.set(newText.id, 'text')
              await canvasService.selectText(newText.id, user.uid, username)
            }
            break
          }
        }
      }

      // Select all newly pasted shapes
      setSelectedShapes(newSelection)
      const newIds = Array.from(newSelection.keys())
      const lastEntry = Array.from(newSelection.entries()).pop()
      setPrimarySelectionId(lastEntry?.[0] || null)
      setPrimarySelectionType(lastEntry?.[1] || null)

      // Generate toast message
      const count = newIds.length
      if (count === 1) {
        const shapeType = lastEntry?.[1]
        showToast(`Pasted 1 ${shapeType}`)
      } else {
        const types = Object.entries(typeCounts).filter(([, count]) => count > 0)
        if (types.length === 1) {
          const [type, typeCount] = types[0]
          showToast(`Pasted ${typeCount} ${type}s`)
        } else {
          showToast(`Pasted ${count} shapes`)
        }
      }
    } catch (err) {
      console.error('Error pasting shapes:', err)
      setError(err instanceof Error ? err.message : 'Failed to paste shapes')
    }
  }, [user, username, clipboardShapes, showToast])

  // Generic duplicate function for any shape type
  const duplicateShape = useCallback(async (shapeId: string, shapeType: ShapeType): Promise<boolean> => {
    if (!user || !username) {
      setError('You must be signed in to duplicate')
      return false
    }

    const DUPLICATE_OFFSET = 20

    try {
      switch (shapeType) {
        case 'rectangle': {
          const rectangle = rectangles.find(r => r.id === shapeId)
          if (!rectangle) {
            showToast('Rectangle not found')
            return false
          }

          const newX = Math.min(rectangle.x + DUPLICATE_OFFSET, CANVAS_WIDTH - rectangle.width)
          const newY = Math.min(rectangle.y + DUPLICATE_OFFSET, CANVAS_HEIGHT - rectangle.height)

          const duplicated = await canvasService.createRectangle({
            x: newX,
            y: newY,
            width: rectangle.width,
            height: rectangle.height,
            color: rectangle.color,
            createdBy: user.uid
          })

          if (duplicated) {
            await canvasService.selectRectangle(duplicated.id, user.uid, username)
            const newSelection = new Map<string, ShapeType>()
            newSelection.set(duplicated.id, 'rectangle')
            setSelectedShapes(newSelection)
            setPrimarySelectionId(duplicated.id)
            setPrimarySelectionType('rectangle')
            showToast('Rectangle duplicated')
            return true
          }
          break
        }

        case 'circle': {
          const circle = circles.find(c => c.id === shapeId)
          if (!circle) {
            showToast('Circle not found')
            return false
          }

          const newX = Math.min(circle.x + DUPLICATE_OFFSET, CANVAS_WIDTH - circle.radius * 2)
          const newY = Math.min(circle.y + DUPLICATE_OFFSET, CANVAS_HEIGHT - circle.radius * 2)

          const duplicated = await canvasService.createCircle({
            x: newX,
            y: newY,
            radius: circle.radius,
            color: circle.color,
            createdBy: user.uid
          })

          if (duplicated) {
            await canvasService.selectCircle(duplicated.id, user.uid, username)
            const newSelection = new Map<string, ShapeType>()
            newSelection.set(duplicated.id, 'circle')
            setSelectedShapes(newSelection)
            setPrimarySelectionId(duplicated.id)
            setPrimarySelectionType('circle')
            showToast('Circle duplicated')
            return true
          }
          break
        }

        case 'line': {
          const line = lines.find(l => l.id === shapeId)
          if (!line) {
            showToast('Line not found')
            return false
          }

          const newX = line.x + DUPLICATE_OFFSET
          const newY = line.y + DUPLICATE_OFFSET
          const newEndX = line.endX + DUPLICATE_OFFSET
          const newEndY = line.endY + DUPLICATE_OFFSET

          const duplicated = await canvasService.createLine({
            x: newX,
            y: newY,
            endX: newEndX,
            endY: newEndY,
            strokeWidth: line.strokeWidth,
            color: line.color,
            hasArrow: line.hasArrow,
            createdBy: user.uid
          })

          if (duplicated) {
            await canvasService.selectLine(duplicated.id, user.uid, username)
            const newSelection = new Map<string, ShapeType>()
            newSelection.set(duplicated.id, 'line')
            setSelectedShapes(newSelection)
            setPrimarySelectionId(duplicated.id)
            setPrimarySelectionType('line')
            showToast('Line duplicated')
            return true
          }
          break
        }

        case 'text': {
          const text = texts.find(t => t.id === shapeId)
          if (!text) {
            showToast('Text not found')
            return false
          }

          const newX = text.x + DUPLICATE_OFFSET
          const newY = text.y + DUPLICATE_OFFSET

          const duplicated = await canvasService.createText({
            x: newX,
            y: newY,
            text: text.text,
            color: text.color,
            createdBy: user.uid
          })

          if (duplicated) {
            // Update font properties after creation
            await canvasService.updateText(duplicated.id, {
              fontSize: text.fontSize,
              fontWeight: text.fontWeight,
              fontStyle: text.fontStyle
            })
            
            await canvasService.selectText(duplicated.id, user.uid, username)
            const newSelection = new Map<string, ShapeType>()
            newSelection.set(duplicated.id, 'text')
            setSelectedShapes(newSelection)
            setPrimarySelectionId(duplicated.id)
            setPrimarySelectionType('text')
            showToast('Text duplicated')
            return true
          }
          break
        }
      }

      return false
    } catch (err) {
      console.error(`Error duplicating ${shapeType}:`, err)
      setError(err instanceof Error ? err.message : `Failed to duplicate ${shapeType}`)
      return false
    }
  }, [user, username, rectangles, circles, lines, texts, showToast])

  // DEPRECATED: Keep for backward compatibility
  const duplicateRectangle = useCallback(async (rectangleId: string): Promise<Rectangle | null> => {
    const success = await duplicateShape(rectangleId, 'rectangle')
    if (success) {
      const rect = rectangles.find(r => r.id === primarySelectionId)
      return rect || null
    }
    return null
  }, [duplicateShape, rectangles, primarySelectionId])

  // Check if clipboard has data
  const hasClipboardData = useCallback(() => {
    return clipboardShapes.length > 0
  }, [clipboardShapes])

  // Bring shape to front (works for all shape types)
  const bringToFront = useCallback(async (shapeId: string): Promise<void> => {
    try {
      await canvasService.bringToFront(shapeId)
      setToastMessage('Brought to front')
    } catch (error) {
      console.error('Error bringing shape to front:', error)
      setError('Failed to bring shape to front')
    }
  }, [])

  // Send shape to back (works for all shape types)
  const sendToBack = useCallback(async (shapeId: string): Promise<void> => {
    try {
      await canvasService.sendToBack(shapeId)
      setToastMessage('Sent to back')
    } catch (error) {
      console.error('Error sending shape to back:', error)
      setError('Failed to send shape to back')
    }
  }, [])

  // Align selected shapes (Phase 3D PR #10)
  const alignShapes = useCallback(async (alignType: AlignmentType): Promise<void> => {
    if (selectedShapes.size < 2) return

    try {
      const shapesToAlign = getSelectedShapesFromMap(selectedShapes, rectangles, circles, lines, texts)
      if (shapesToAlign.length < 2) return

      // Check if any shapes are rotated
      const hasRotation = shapesToAlign.some(shape => shape.rotation && shape.rotation !== 0)
      if (hasRotation) {
        showToast('Note: You\'re aligning a rotated group')
      }

      // Calculate target value based on alignment type
      const bounds = shapesToAlign.map(getShapeBounds)
      let targetValue: number

      switch (alignType) {
        case 'left':
          targetValue = Math.min(...bounds.map(b => b.x))
          break
        case 'center-horizontal': {
          const minX = Math.min(...bounds.map(b => b.x))
          const maxX = Math.max(...bounds.map(b => b.x + b.width))
          targetValue = (minX + maxX) / 2
          break
        }
        case 'right':
          targetValue = Math.max(...bounds.map(b => b.x + b.width))
          break
        case 'top':
          targetValue = Math.min(...bounds.map(b => b.y))
          break
        case 'center-vertical': {
          const minY = Math.min(...bounds.map(b => b.y))
          const maxY = Math.max(...bounds.map(b => b.y + b.height))
          targetValue = (minY + maxY) / 2
          break
        }
        case 'bottom':
          targetValue = Math.max(...bounds.map(b => b.y + b.height))
          break
        case 'distribute-horizontal':
        case 'distribute-vertical': {
          // Handle distribution separately
          const positions = calculateDistributedPositions(
            shapesToAlign,
            alignType === 'distribute-horizontal' ? 'horizontal' : 'vertical'
          )

          // Update all shapes in parallel
          await Promise.all(
            Array.from(positions.entries()).map(([shapeId, updates]) => {
              const shape = shapesToAlign.find(s => s.id === shapeId)
              if (!shape) return Promise.resolve()
              return updateShapeProperty(shape, updates, canvasService)
            })
          )

          // Delay success toast if warning was shown
          if (hasRotation) {
            setTimeout(() => {
              setToastMessage(`Distributed ${shapesToAlign.length} shapes`)
            }, 1500)
          } else {
            setToastMessage(`Distributed ${shapesToAlign.length} shapes`)
          }
          return
        }
        default:
          return
      }

      // Calculate and apply alignment updates in parallel
      await Promise.all(
        shapesToAlign.map(shape => {
          const updates = calculateAlignedPosition(shape, targetValue, alignType)
          return updateShapeProperty(shape, updates, canvasService)
        })
      )

      // Delay success toast if warning was shown
      if (hasRotation) {
        setTimeout(() => {
          setToastMessage(`Aligned ${shapesToAlign.length} shapes`)
        }, 1500)
      } else {
        setToastMessage(`Aligned ${shapesToAlign.length} shapes`)
      }
    } catch (error) {
      console.error('Error aligning shapes:', error)
      setToastMessage('Failed to align shapes')
    }
  }, [selectedShapes, rectangles, circles, lines, texts, showToast])

  // Select shapes inside lasso (Phase 3D PR #11)
  const selectShapesInLasso = useCallback(async (lassoPoints: number[]): Promise<void> => {
    if (selectionLocked) return
    if (!user || !username) return

    const allShapes: Shape[] = [
      ...rectangles,
      ...circles,
      ...lines,
      ...texts
    ]

    const shapesToSelect: Array<{ id: string; type: ShapeType }> = []

    // Check each shape (with selection limit)
    for (const shape of allShapes) {
      if (shapesToSelect.length >= SHAPE_CONSTANTS.SELECTION_LIMIT) break

      if (isShapeInLasso(shape, lassoPoints)) {
        shapesToSelect.push({ id: shape.id, type: shape.type })
      }
    }

    if (shapesToSelect.length === 0) return

    // Clear previous selections
    for (const [prevId, prevType] of selectedShapes.entries()) {
      switch (prevType) {
        case 'rectangle':
          await canvasService.deselectRectangle(prevId, user.uid)
          break
        case 'circle':
          await canvasService.deselectCircle(prevId, user.uid)
          break
        case 'line':
          await canvasService.deselectLine(prevId, user.uid)
          break
        case 'text':
          await canvasService.deselectText(prevId, user.uid)
          break
      }
    }

    // Select new shapes
    const newSelection = new Map<string, ShapeType>()
    for (const { id, type } of shapesToSelect) {
      switch (type) {
        case 'rectangle':
          await canvasService.selectRectangle(id, user.uid, username)
          break
        case 'circle':
          await canvasService.selectCircle(id, user.uid, username)
          break
        case 'line':
          await canvasService.selectLine(id, user.uid, username)
          break
        case 'text':
          await canvasService.selectText(id, user.uid, username)
          break
      }
      newSelection.set(id, type)
    }

    setSelectedShapes(newSelection)
    setPrimarySelectionId(shapesToSelect[shapesToSelect.length - 1].id)
    setPrimarySelectionType(shapesToSelect[shapesToSelect.length - 1].type)
    setToastMessage(`Selected ${shapesToSelect.length} shape${shapesToSelect.length > 1 ? 's' : ''}`)
  }, [rectangles, circles, lines, texts, selectedShapes, selectionLocked, user, username])

  // Select all shapes of a specific type (Phase 3D PR #11)
  const selectAllOfType = useCallback(async (shapeType: ShapeType): Promise<void> => {
    if (selectionLocked) return
    if (!user || !username) return

    let shapesToSelect: Array<{ id: string; type: ShapeType }> = []

    switch (shapeType) {
      case 'rectangle':
        shapesToSelect = rectangles.map(r => ({ id: r.id, type: 'rectangle' as ShapeType }))
        break
      case 'circle':
        shapesToSelect = circles.map(c => ({ id: c.id, type: 'circle' as ShapeType }))
        break
      case 'line':
        shapesToSelect = lines.map(l => ({ id: l.id, type: 'line' as ShapeType }))
        break
      case 'text':
        shapesToSelect = texts.map(t => ({ id: t.id, type: 'text' as ShapeType }))
        break
    }

    if (shapesToSelect.length === 0) {
      setToastMessage(`No ${shapeType}s found`)
      return
    }

    // Apply selection limit
    const originalLength = shapesToSelect.length
    if (shapesToSelect.length > SHAPE_CONSTANTS.SELECTION_LIMIT) {
      shapesToSelect = shapesToSelect.slice(0, SHAPE_CONSTANTS.SELECTION_LIMIT)
      setToastMessage(`Selected ${SHAPE_CONSTANTS.SELECTION_LIMIT} of ${originalLength} (limit reached)`)
    } else {
      setToastMessage(`Selected ${shapesToSelect.length} ${shapeType}${shapesToSelect.length > 1 ? 's' : ''}`)
    }

    // Clear previous selections
    for (const [prevId, prevType] of selectedShapes.entries()) {
      switch (prevType) {
        case 'rectangle':
          await canvasService.deselectRectangle(prevId, user.uid)
          break
        case 'circle':
          await canvasService.deselectCircle(prevId, user.uid)
          break
        case 'line':
          await canvasService.deselectLine(prevId, user.uid)
          break
        case 'text':
          await canvasService.deselectText(prevId, user.uid)
          break
      }
    }

    // Select new shapes
    const newSelection = new Map<string, ShapeType>()
    for (const { id, type } of shapesToSelect) {
      switch (type) {
        case 'rectangle':
          await canvasService.selectRectangle(id, user.uid, username)
          break
        case 'circle':
          await canvasService.selectCircle(id, user.uid, username)
          break
        case 'line':
          await canvasService.selectLine(id, user.uid, username)
          break
        case 'text':
          await canvasService.selectText(id, user.uid, username)
          break
      }
      newSelection.set(id, type)
    }

    setSelectedShapes(newSelection)
    setPrimarySelectionId(shapesToSelect[shapesToSelect.length - 1].id)
    setPrimarySelectionType(shapesToSelect[shapesToSelect.length - 1].type)
  }, [rectangles, circles, lines, texts, selectedShapes, selectionLocked, user, username])

  // Cycle through selecting all shapes of each type (NEW)
  const selectAllCycleByType = useCallback(async (): Promise<void> => {
    if (selectionLocked) return
    if (!user || !username) return

    // Define the cycle order: rectangles -> circles -> lines -> texts -> all shapes
    const types: Array<{ type: ShapeType; shapes: Shape[]; label: string }> = [
      { type: 'rectangle', shapes: rectangles, label: 'rectangles' },
      { type: 'circle', shapes: circles, label: 'circles' },
      { type: 'line', shapes: lines, label: 'lines' },
      { type: 'text', shapes: texts, label: 'texts' }
    ]

    // Determine current selection type
    let currentTypeIndex = -1
    if (selectedShapes.size > 0) {
      // Check if all selected shapes are of the same type
      const selectedTypes = new Set(Array.from(selectedShapes.values()))
      if (selectedTypes.size === 1) {
        const selectedType = Array.from(selectedTypes)[0]
        currentTypeIndex = types.findIndex(t => t.type === selectedType)
      }
    }

    // Find next type with shapes
    let nextIndex = currentTypeIndex + 1
    let attempts = 0

    while (attempts <= types.length) {
      if (nextIndex >= types.length) {
        // Cycle back to "all shapes"
        await selectAll()
        return
      }

      if (types[nextIndex].shapes.length > 0) {
        // Found a type with shapes - select all of this type
        await selectAllOfType(types[nextIndex].type)
        return
      }

      nextIndex++
      attempts++
    }

    // Fallback: select all shapes
    await selectAll()
  }, [rectangles, circles, lines, texts, selectedShapes, selectionLocked, user, username, selectAll, selectAllOfType])

  // Rotate shape (Phase 3D PR #12)
  const rotateShape = useCallback(async (shapeId: string, shapeType: ShapeType, rotation: number): Promise<void> => {
    try {
      switch (shapeType) {
        case 'rectangle':
          await canvasService.updateRectangle(shapeId, { rotation })
          break
        case 'circle':
          await canvasService.updateCircle(shapeId, { rotation })
          break
        case 'line': {
          // Lines need special handling: rotate both endpoints around center
          const line = lines.find(l => l.id === shapeId)
          if (!line) return
          
          // Calculate center of line
          const centerX = (line.x + line.endX) / 2
          const centerY = (line.y + line.endY) / 2
          
          // Calculate rotation delta
          const currentRotation = line.rotation || 0
          const rotationDelta = rotation - currentRotation
          const angleRad = rotationDelta * (Math.PI / 180)
          
          // Rotate start point around center
          const dx1 = line.x - centerX
          const dy1 = line.y - centerY
          const newDx1 = dx1 * Math.cos(angleRad) - dy1 * Math.sin(angleRad)
          const newDy1 = dx1 * Math.sin(angleRad) + dy1 * Math.cos(angleRad)
          const newX = centerX + newDx1
          const newY = centerY + newDy1
          
          // Rotate end point around center
          const dx2 = line.endX - centerX
          const dy2 = line.endY - centerY
          const newDx2 = dx2 * Math.cos(angleRad) - dy2 * Math.sin(angleRad)
          const newDy2 = dx2 * Math.sin(angleRad) + dy2 * Math.cos(angleRad)
          const newEndX = centerX + newDx2
          const newEndY = centerY + newDy2
          
          // Update line with rotated endpoints
          await canvasService.updateLine(shapeId, {
            x: newX,
            y: newY,
            endX: newEndX,
            endY: newEndY,
            rotation
          })
          break
        }
        case 'text':
          await canvasService.updateText(shapeId, { rotation })
          break
      }
    } catch (error) {
      console.error('Error rotating shape:', error)
      setToastMessage('Failed to rotate shape')
    }
  }, [lines])

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
    selectAll,
    clearSelection,
    setSelectionLocked,
    deleteSelectedShapes,
    changeSelectedShapesColor,
    copySelectedShapes,
    pasteShapes,
    duplicateShape,
    duplicateRectangle,
    hasClipboardData,
    bringToFront,
    sendToBack,
    alignShapes,
    selectShapesInLasso,
    selectAllOfType,
    selectAllCycleByType,
    rotateShape,
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
