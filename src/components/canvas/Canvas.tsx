import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Stage, Layer } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCanvas } from '../../contexts/CanvasContext'
import { useCursors } from '../../hooks/useCursors'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../../utils/constants'
import { stopEventPropagation } from '../../utils/eventHelpers'
import Cursor from './Cursor'
import Rectangle from './Rectangle'
import Circle from './Circle'  // PR #6
import Line from './Line'  // PR #7
import Text from './Text'  // PR #8
import SelectionBox from './SelectionBox'
import ShapeModeSelector from './ShapeModeSelector'  // PR #6
import ColorPicker from './ColorPicker'
import Toast from '../ui/Toast'
import type { Rectangle as RectangleType } from '../../services/canvasService'
import './Canvas.css'

interface CanvasProps {
  width?: number
  height?: number
}

// REFACTORING NOTE: This component is 428 lines and handles multiple concerns:
// pan/zoom, rectangle operations, keyboard controls, coordinate transforms, and UI.
// Consider splitting into: CanvasControls, CanvasStats, ZoomPanHandler components
// and extracting: useCoordinateTransform, useKeyboardControls, useCanvasZoom hooks
const Canvas: React.FC<CanvasProps> = ({ 
  width = VIEWPORT_WIDTH, 
  height = VIEWPORT_HEIGHT 
}) => {
  const stageRef = useRef<Konva.Stage | null>(null)
  
  // Canvas viewport state
  const [isDragging, setIsDragging] = useState(false)
  const [isRectangleDragging, setIsRectangleDragging] = useState(false)
  const [isRectangleResizing, setIsRectangleResizing] = useState(false)
  
  // NEW: Selection box state (for Shift+Drag multi-select)
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionBoxEnd, setSelectionBoxEnd] = useState<{ x: number; y: number } | null>(null)
  
  // NEW PR #7: Line creation state (two-click creation)
  const [lineCreationStart, setLineCreationStart] = useState<{ x: number; y: number } | null>(null)
  const [linePreviewEnd, setLinePreviewEnd] = useState<{ x: number; y: number } | null>(null)
  
  // NEW PR #8: Text editing state (to disable panning during editing)
  const [isTextEditing, setIsTextEditing] = useState(false)
  
  // NEW: Keyboard modifier states
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isPanning, setIsPanning] = useState(false)  // Spacebar held
  
  // Track if user just used AI command (to prevent accidental deselect on first click)
  const justUsedAICommandRef = useRef(false)
  
  // Refs for clipboard operations (to avoid dependency array issues)
  const copySelectedRectanglesRef = useRef<() => void>()  // CHANGED
  const pasteRectanglesRef = useRef<() => Promise<void>>()  // CHANGED
  const duplicateRectangleRef = useRef<(rectangleId: string) => Promise<RectangleType | null>>()
  
  // Refs for layering operations
  const bringToFrontRef = useRef<(rectangleId: string) => Promise<void>>()
  const sendToBackRef = useRef<(rectangleId: string) => Promise<void>>()
  
  // Get canvas context
  const { 
    rectangles, 
    circles,               // PR #6
    lines,                 // PR #7
    texts,                 // PR #8
    shapeMode,             // PR #6, updated PR #7, updated PR #8
    selectedShapes,        // REFACTORED PR #5: Map<string, ShapeType>
    primarySelectionId,    // Last clicked shape
    primarySelectionType,  // PR #6, updated PR #7, updated PR #8
    setShapeMode,          // PR #6, updated PR #7, updated PR #8
    createRectangle, 
    createCircle,          // PR #6
    createLine,            // PR #7
    createText,            // PR #8
    updateRectangle, 
    updateCircle,          // PR #6
    updateLine,            // PR #7
    updateLineEndpoints,   // PR #7
    updateText,            // PR #8
    resizeRectangle, 
    resizeCircle,          // PR #6
    deleteRectangle, 
    selectRectangle,
    selectShape,           // PR #6, updated PR #7, updated PR #8: Unified selection
    selectMultiple,        // Multi-select operation
    selectAll,             // Select all
    clearSelection,        // Clear selection
    changeShapeColor,      // PR #6, updated PR #7, updated PR #8: Unified color change
    copySelectedRectangles,  // Copy selected
    pasteRectangles,         // Paste clipboard
    duplicateRectangle,
    bringToFront,
    sendToBack,
    selectionLocked,
    toastMessage,
    clearToast,
    updateViewportInfo
  } = useCanvas()
  
  // Get cursors context
  const { cursors, updateCursor, error: cursorsError } = useCursors()


  // Get current stage position and scale (with safer fallbacks)
  const getCurrentStagePosition = useCallback(() => {
    // Don't return (0,0) fallback - return null to indicate unavailable
    if (!stageRef.current) return null
    return {
      x: stageRef.current.x(),
      y: stageRef.current.y()
    }
  }, [])

  const getCurrentStageScale = useCallback(() => {
    if (!stageRef.current) return null
    return stageRef.current.scaleX()
  }, [])

  // NEW: Transform screen coordinates to canvas coordinates (accounting for pan/zoom)
  const transformToCanvasCoords = useCallback((screenX: number, screenY: number) => {
    if (!stageRef.current) return null
    
    const stage = stageRef.current
    const scale = stage.scaleX()
    const stagePos = { x: stage.x(), y: stage.y() }
    
    return {
      x: (screenX - stagePos.x) / scale,
      y: (screenY - stagePos.y) / scale
    }
  }, [])

  // Calculate and update viewport info (for AI agent)
  const sendViewportInfo = useCallback(() => {
    if (!stageRef.current) return

    const stage = stageRef.current
    const scale = stage.scaleX()
    const stagePos = { x: stage.x(), y: stage.y() }

    // Calculate viewport center in canvas coordinates
    const centerX = (width / 2 - stagePos.x) / scale
    const centerY = (height / 2 - stagePos.y) / scale

    // Calculate visible bounds in canvas coordinates
    const left = (-stagePos.x) / scale
    const top = (-stagePos.y) / scale
    const right = (width - stagePos.x) / scale
    const bottom = (height - stagePos.y) / scale

    updateViewportInfo({
      centerX,
      centerY,
      zoom: scale,
      visibleBounds: { left, top, right, bottom }
    })
  }, [width, height, updateViewportInfo])

  // Handle mouse move for cursor broadcasting
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return
    
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    
    // PR #7: Update line preview end point if creating a line
    if (lineCreationStart) {
      const canvasCoords = transformToCanvasCoords(pointer.x, pointer.y)
      if (canvasCoords) {
        setLinePreviewEnd(canvasCoords)
      }
      return  // Don't broadcast cursor while drawing line preview
    }
    
    // Update selection box end point if we're dragging
    if (selectionBoxStart) {
      const canvasCoords = transformToCanvasCoords(pointer.x, pointer.y)
      if (canvasCoords) {
        setSelectionBoxEnd(canvasCoords)
      }
      return  // Don't broadcast cursor while drawing selection box
    }
    
    // Broadcast cursor position (skip if panning, dragging, or resizing)
    if (isDragging || isRectangleDragging || isRectangleResizing) return // Don't broadcast while panning, dragging, or resizing
    
    const canvasCoords = transformToCanvasCoords(pointer.x, pointer.y)
    if (canvasCoords) {
      updateCursor(canvasCoords.x, canvasCoords.y)
    }
  }, [updateCursor, isDragging, isRectangleDragging, isRectangleResizing, selectionBoxStart, lineCreationStart, transformToCanvasCoords])

  // Handle wheel zoom
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    
    if (!stageRef.current) return
    
    const scaleBy = 1.05
    const stage = stageRef.current
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    
    if (!pointer) return
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    
    let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    
    // Constrain zoom levels
    newScale = Math.max(0.1, Math.min(newScale, 5))
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }
    
    // Update both scale and position directly via ref
    stage.scaleX(newScale)
    stage.scaleY(newScale)
    stage.x(newPos.x)
    stage.y(newPos.y)
    
    // Update viewport info for AI agent
    sendViewportInfo()
  }, [sendViewportInfo])

  // Handle drag start
  const handleDragStart = useCallback((e: KonvaEventObject<MouseEvent>) => {
    // Don't allow stage dragging if we're interacting with rectangles
    if (isRectangleDragging || isRectangleResizing) {
      stopEventPropagation(e)
      return false
    }
    setIsDragging(true)
  }, [isRectangleDragging, isRectangleResizing])

  // Handle drag end  
  const handleDragEnd = useCallback(() => {
    // Reset dragging state
    setIsDragging(false)
    
    // Update viewport info for AI agent
    sendViewportInfo()
  }, [sendViewportInfo])

  // NEW: Handle stage mouse down (for selection box start or shape creation)
  const handleStageMouseDown = useCallback(async (e: KonvaEventObject<MouseEvent>) => {
    // Only handle clicks on the stage background (not on shapes)
    if (e.target !== e.target.getStage()) return

    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const canvasCoords = transformToCanvasCoords(pointer.x, pointer.y)
    if (!canvasCoords) return

    // If Shift is pressed, start selection box
    if (isShiftPressed) {
      setSelectionBoxStart(canvasCoords)
      setSelectionBoxEnd(canvasCoords)
    } else if (shapeMode === 'line') {
      // PR #7: Two-click line creation
      if (!lineCreationStart) {
        // First click: start line
        setLineCreationStart(canvasCoords)
        setLinePreviewEnd(canvasCoords)
        await clearSelection()
      } else {
        // Second click: complete line
        await createLine(lineCreationStart.x, lineCreationStart.y, canvasCoords.x, canvasCoords.y)
        setLineCreationStart(null)
        setLinePreviewEnd(null)
      }
    } else {
      // Otherwise, clear selection and create new shape based on mode
      await clearSelection()
      if (shapeMode === 'rectangle') {
        await createRectangle(canvasCoords.x, canvasCoords.y)
      } else if (shapeMode === 'circle') {
        await createCircle(canvasCoords.x, canvasCoords.y)
      }
    }
  }, [isShiftPressed, shapeMode, lineCreationStart, transformToCanvasCoords, clearSelection, createRectangle, createCircle, createLine])

  // NEW: Handle stage mouse up (for selection box completion)
  const handleStageMouseUp = useCallback(async () => {
    if (!selectionBoxStart || !selectionBoxEnd) {
      // No selection box, just clear state
      setSelectionBoxStart(null)
      setSelectionBoxEnd(null)
      return
    }

    // Calculate selection box bounds
    const minX = Math.min(selectionBoxStart.x, selectionBoxEnd.x)
    const maxX = Math.max(selectionBoxStart.x, selectionBoxEnd.x)
    const minY = Math.min(selectionBoxStart.y, selectionBoxEnd.y)
    const maxY = Math.max(selectionBoxStart.y, selectionBoxEnd.y)

    // Find all rectangles fully contained in selection box
    const selectedIds = rectangles
      .filter(rect => {
        const rectLeft = rect.x
        const rectRight = rect.x + rect.width
        const rectTop = rect.y
        const rectBottom = rect.y + rect.height

        return rectLeft >= minX && rectRight <= maxX && 
               rectTop >= minY && rectBottom <= maxY
      })
      .map(rect => rect.id)

    // Select the rectangles
    if (selectedIds.length > 0) {
      await selectMultiple(selectedIds)
    }

    // Clear selection box
    setSelectionBoxStart(null)
    setSelectionBoxEnd(null)
  }, [selectionBoxStart, selectionBoxEnd, rectangles, selectMultiple])

  // Handle rectangle click (selection/deselection)
  const handleRectangleClick = useCallback(async (rectangle: RectangleType) => {
    // Remove focus from any input field (e.g., AI chat input) so keyboard shortcuts work
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    
    // If the rectangle is already the primary selection
    if (primarySelectionId === rectangle.id) {
      // Don't deselect if user just used AI command (first click after AI action)
      if (justUsedAICommandRef.current) {
        justUsedAICommandRef.current = false
        return
      }
      // Otherwise, deselect it (toggle behavior)
      await clearSelection()
    } else {
      // Otherwise, select it
      await selectRectangle(rectangle.id)
    }
  }, [clearSelection, selectRectangle, primarySelectionId])

  // Handle rectangle drag start
  const handleRectangleDragStart = useCallback(async (rectangle: RectangleType) => {
    setIsRectangleDragging(true)
    await selectRectangle(rectangle.id)
  }, [selectRectangle])

  // Handle rectangle drag end (update position)
  const handleRectangleDragEnd = useCallback(async (rectangle: RectangleType, newX: number, newY: number) => {
    setIsRectangleDragging(false)
    try {
      await updateRectangle(rectangle.id, { x: newX, y: newY })
    } catch (error) {
      console.error('Error updating rectangle position:', error)
    }
  }, [updateRectangle])

  // Handle rectangle resize
  const handleRectangleResize = useCallback(async (
    rectangle: RectangleType, 
    newWidth: number, 
    newHeight: number, 
    newX?: number, 
    newY?: number
  ) => {
    try {
      await resizeRectangle(rectangle.id, newWidth, newHeight, newX, newY)
    } catch (error) {
      console.error('Error resizing rectangle:', error)
    }
  }, [resizeRectangle])

  // Handle resize start
  const handleResizeStart = useCallback(() => {
    setIsRectangleResizing(true)
  }, [])

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsRectangleResizing(false)
  }, [])

  // PR #6: Circle handlers (similar to rectangle handlers)
  const handleCircleClick = useCallback(async (circleId: string) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    
    if (primarySelectionId === circleId) {
      if (justUsedAICommandRef.current) {
        justUsedAICommandRef.current = false
        return
      }
      await clearSelection()
    } else {
      await selectShape(circleId, 'circle')
    }
  }, [clearSelection, selectShape, primarySelectionId])

  const handleCircleDragStart = useCallback(async () => {
    setIsRectangleDragging(true)  // Reuse rectangle dragging state
  }, [])

  const handleCircleDragEnd = useCallback(async (circleId: string, newX: number, newY: number) => {
    setIsRectangleDragging(false)
    try {
      await updateCircle(circleId, { x: newX, y: newY })
    } catch (error) {
      console.error('Error updating circle position:', error)
    }
  }, [updateCircle])

  const handleCircleResize = useCallback(async (
    circleId: string, 
    newRadius: number, 
    newX: number, 
    newY: number
  ) => {
    try {
      await resizeCircle(circleId, newRadius, newX, newY)
    } catch (error) {
      console.error('Error resizing circle:', error)
    }
  }, [resizeCircle])

  // PR #7: LINE HANDLERS
  const handleLineClick = useCallback((lineId: string) => {
    selectShape(lineId, 'line')
  }, [selectShape])

  const handleLineDragStart = useCallback(() => {
    setIsRectangleDragging(true)
  }, [])

  const handleLineDragEnd = useCallback(async (lineId: string, newX: number, newY: number) => {
    try {
      await updateLine(lineId, { x: newX, y: newY })
    } catch (error) {
      console.error('Error moving line:', error)
    } finally {
      setIsRectangleDragging(false)
    }
  }, [updateLine])

  const handleLineEndpointsChange = useCallback(async (lineId: string, newEndX: number, newEndY: number) => {
    try {
      await updateLineEndpoints(lineId, newEndX, newEndY)
    } catch (error) {
      console.error('Error updating line endpoints:', error)
    }
  }, [updateLineEndpoints])

  // PR #8: Text handlers
  const handleTextClick = useCallback((textId: string) => {
    selectShape(textId, 'text')
  }, [selectShape])

  const handleTextDragStart = useCallback(() => {
    setIsRectangleDragging(true)
  }, [])

  const handleTextDragEnd = useCallback(async (textId: string, newX: number, newY: number) => {
    try {
      await updateText(textId, { x: newX, y: newY })
    } catch (error) {
      console.error('Error moving text:', error)
    } finally {
      setIsRectangleDragging(false)
    }
  }, [updateText])

  const handleTextChange = useCallback(async (textId: string, newText: string) => {
    try {
      await updateText(textId, { text: newText })
    } catch (error) {
      console.error('Error updating text content:', error)
    }
  }, [updateText])

  // Handle color change (unified for all shapes)
  const handleColorChange = useCallback(async (color: string) => {
    if (primarySelectionId && primarySelectionType) {
      await changeShapeColor(primarySelectionId, primarySelectionType, color)
    }
  }, [primarySelectionId, primarySelectionType, changeShapeColor])

  // Get selected shape (primary selection) - check rectangles, circles, lines, and texts
  const selectedRectangle = rectangles.find(r => r.id === primarySelectionId)
  const selectedCircle = circles.find(c => c.id === primarySelectionId)
  const selectedLine = lines.find(l => l.id === primarySelectionId)
  const selectedText = texts.find(t => t.id === primarySelectionId)  // PR #8
  const selectedShape = selectedRectangle || selectedCircle || selectedLine || selectedText  // PR #8: Added text
  
  // Check if multiple selections have mixed colors
  const selectedColors = useMemo(() => {
    const colors = new Set<string>()
    for (const id of selectedShapes.keys()) {
      const rect = rectangles.find(r => r.id === id)
      const circle = circles.find(c => c.id === id)
      const line = lines.find(l => l.id === id)
      const text = texts.find(t => t.id === id)  // PR #8
      const shape = rect || circle || line || text  // PR #8: Added text
      if (shape) colors.add(shape.color)
    }
    return colors
  }, [selectedShapes, rectangles, circles, lines, texts])  // PR #8: Added texts dependency
  
  const hasMixedColors = selectedColors.size > 1
  const displayColor = hasMixedColors ? '?' : (selectedShape?.color || '#000000')

  // Sort rectangles by zIndex for rendering (lower zIndex = render first = behind)
  const sortedRectangles = useMemo(() => {
    return [...rectangles].sort((a, b) => {
      const aZ = a.zIndex ?? 0
      const bZ = b.zIndex ?? 0
      return aZ - bZ
    })
  }, [rectangles])

  // PR #6: Sort circles by zIndex for rendering
  const sortedCircles = useMemo(() => {
    return [...circles].sort((a, b) => {
      const aZ = a.zIndex ?? 0
      const bZ = b.zIndex ?? 0
      return aZ - bZ
    })
  }, [circles])

  // PR #7: Sort lines by zIndex for rendering
  const sortedLines = useMemo(() => {
    return [...lines].sort((a, b) => {
      const aZ = a.zIndex ?? 0
      const bZ = b.zIndex ?? 0
      return aZ - bZ
    })
  }, [lines])

  // PR #8: Sort texts by zIndex for rendering
  const sortedTexts = useMemo(() => {
    return [...texts].sort((a, b) => {
      const aZ = a.zIndex ?? 0
      const bZ = b.zIndex ?? 0
      return aZ - bZ
    })
  }, [texts])

  // Keep clipboard operation refs updated
  useEffect(() => {
    copySelectedRectanglesRef.current = copySelectedRectangles  // CHANGED
    pasteRectanglesRef.current = pasteRectangles        // CHANGED
    duplicateRectangleRef.current = duplicateRectangle
  }, [copySelectedRectangles, pasteRectangles, duplicateRectangle])

  // Keep layering operation refs updated
  useEffect(() => {
    bringToFrontRef.current = bringToFront
    sendToBackRef.current = sendToBack
  }, [bringToFront, sendToBack])

  // Keyboard controls for canvas navigation and rectangle resizing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stageRef.current) return
      
      // Don't handle keyboard shortcuts if user is typing in an input/textarea
      const activeElement = document.activeElement
      const isTyping = activeElement instanceof HTMLInputElement || 
                       activeElement instanceof HTMLTextAreaElement
      
      // Don't handle shortcuts during AI operations
      if (selectionLocked) return
      
      // NEW: Track Shift key for selection box mode
      if (e.key === 'Shift' && !isShiftPressed) {
        setIsShiftPressed(true)
      }
      
      // NEW: Track Spacebar for pan mode
      if (e.key === ' ' && !isTyping && !isPanning) {
        e.preventDefault()  // Prevent page scroll
        setIsPanning(true)
      }
      
      // NEW: Select All (Cmd/Ctrl+A)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !isTyping) {
        e.preventDefault()
        selectAll()
        return
      }
      
      // NEW: Clear selection (Escape)
      if (e.key === 'Escape' && !isTyping) {
        // PR #7: Cancel line creation if active
        if (lineCreationStart) {
          setLineCreationStart(null)
          setLinePreviewEnd(null)
        } else if (selectionBoxStart) {
          // Cancel selection box if active
          setSelectionBoxStart(null)
          setSelectionBoxEnd(null)
        } else {
          // Otherwise clear selection
          clearSelection()
        }
        return
      }
      
      // PR #6: Rectangle mode (R key)
      if (e.key === 'r' && !isTyping) {
        setShapeMode('rectangle')
        return
      }
      
      // PR #6: Circle mode (C key)
      if (e.key === 'c' && !isTyping && !(e.metaKey || e.ctrlKey)) {
        // Only if not Cmd+C/Ctrl+C (which is copy)
        setShapeMode('circle')
        return
      }
      
      // PR #7: Line mode (L key)
      if (e.key === 'l' && !isTyping) {
        setShapeMode('line')
        return
      }
      
      // PR #8: Text mode (T key)
      if (e.key === 't' && !isTyping) {
        setShapeMode('text')
        return
      }
      
      // Copy: Cmd+C (Mac) or Ctrl+C (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !isTyping) {
        // Check if user has selected text - if so, let browser handle it
        const selection = window.getSelection()
        const hasTextSelection = selection && selection.toString().length > 0
        
        if (selectedShapes.size > 0 && !hasTextSelection) {
          e.preventDefault()
          copySelectedRectanglesRef.current?.()
        }
        return
      }
      
      // Paste: Cmd+V (Mac) or Ctrl+V (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !isTyping) {
        e.preventDefault()
        pasteRectanglesRef.current?.()
        return
      }
      
      // Duplicate: Cmd+D (Mac) or Ctrl+D (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !isTyping) {
        if (primarySelectionId) {
          e.preventDefault() // Prevent browser bookmark shortcut
          duplicateRectangleRef.current?.(primarySelectionId)
        }
        return
      }
      
      // Bring to front: Cmd+] (Mac) or Ctrl+] (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === ']' && !isTyping) {
        if (primarySelectionId) {
          e.preventDefault()
          bringToFrontRef.current?.(primarySelectionId)
        }
        return
      }
      
      // Send to back: Cmd+[ (Mac) or Ctrl+[ (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === '[' && !isTyping) {
        if (primarySelectionId) {
          e.preventDefault()
          sendToBackRef.current?.(primarySelectionId)
        }
        return
      }
      
      // Handle rectangle deletion
      if ((e.key === 'Delete' || e.key === 'Backspace') && primarySelectionId) {
        // Don't delete if user is typing in an input field
        if (isTyping) return
        
        // Prevent deletion during active operations
        if (!isRectangleDragging && !isRectangleResizing) {
          e.preventDefault()
          deleteRectangle(primarySelectionId)
          return
        }
      }
      
      // Canvas navigation
      const moveAmount = 50
      
      // Check if we're resizing a selected rectangle
      if (primarySelectionId && (e.shiftKey || e.ctrlKey)) {
        // Don't resize if user is typing in an input field
        if (isTyping) return
        
        const selectedRect = rectangles.find(r => r.id === primarySelectionId)
        if (selectedRect) {
          e.preventDefault() // Prevent default browser behavior
          
          const resizeAmount = e.ctrlKey && e.shiftKey ? 1 : 10 // Fine vs coarse resize
          let newWidth = selectedRect.width
          let newHeight = selectedRect.height
          
          switch (e.key) {
            case 'ArrowLeft':
              newWidth = Math.max(20, selectedRect.width - resizeAmount)
              break
            case 'ArrowRight':
              newWidth = selectedRect.width + resizeAmount
              break
            case 'ArrowUp':
              newHeight = Math.max(20, selectedRect.height - resizeAmount)
              break
            case 'ArrowDown':
              newHeight = selectedRect.height + resizeAmount
              break
            default:
              return
          }
          
          handleRectangleResize(selectedRect, newWidth, newHeight)
          return
        }
      }
      
      // Canvas navigation (when not resizing)
      if (stageRef.current) {
        // Don't navigate if user is typing in an input field
        if (isTyping) return
        
        const currentPos = getCurrentStagePosition()
        if (!currentPos || currentPos.x === undefined || currentPos.y === undefined) return
        
        const newPosition = { x: currentPos.x, y: currentPos.y }
        
        switch (e.key) {
          case 'ArrowUp':
            newPosition.y += moveAmount
            break
          case 'ArrowDown':
            newPosition.y -= moveAmount
            break
          case 'ArrowLeft':
            newPosition.x += moveAmount
            break
          case 'ArrowRight':
            newPosition.x -= moveAmount
            break
          case '0':
            // Reset zoom and position
            stageRef.current.scaleX(1)
            stageRef.current.scaleY(1)
            stageRef.current.x(0)
            stageRef.current.y(0)
            return
          default:
            return
        }
        
        stageRef.current.x(newPosition.x)
        stageRef.current.y(newPosition.y)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // NEW: Release Shift key
      if (e.key === 'Shift') {
        setIsShiftPressed(false)
      }
      
      // NEW: Release Spacebar (pan mode)
      if (e.key === ' ') {
        setIsPanning(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [primarySelectionId, rectangles, handleRectangleResize, deleteRectangle, isRectangleDragging, isRectangleResizing, getCurrentStagePosition, selectionLocked, selectedShapes, isShiftPressed, isPanning, selectAll, clearSelection, selectionBoxStart, lineCreationStart, setShapeMode])

  // Detect when rectangle is selected after AI command (input was focused)
  useEffect(() => {
    if (primarySelectionId) {
      // If an input/textarea is currently focused, user likely just used AI command
      const activeElement = document.activeElement
      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
        justUsedAICommandRef.current = true
        
        // Clear the flag after 3 seconds as a safety measure
        const timeout = setTimeout(() => {
          justUsedAICommandRef.current = false
        }, 3000)
        
        return () => clearTimeout(timeout)
      }
    }
  }, [primarySelectionId])

  // Update viewport info on mount and window resize
  useEffect(() => {
    // Initial viewport info
    sendViewportInfo()

    // Update on window resize
    const handleResize = () => {
      sendViewportInfo()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [sendViewportInfo])

  return (
    <div className="canvas-container">
      <div className="canvas-info">
        <div className="canvas-stats">
          {/* PERFORMANCE NOTE: These calculations run on every render. Consider memoizing
              with useMemo() and state tracking for stage transforms to reduce DOM queries */}
          <span>Zoom: {(() => {
            const scale = getCurrentStageScale()
            return scale ? Math.round(scale * 100) : 100
          })()}%</span>
          <span>Position: ({(() => {
            const pos = getCurrentStagePosition()
            return pos ? `${Math.round(pos.x)}, ${Math.round(pos.y)}` : '0, 0'
          })()})</span>
          <span>Shapes: {rectangles.length + circles.length + lines.length + texts.length}</span>  {/* PR #8: Added texts */}
          <span>Friends: {Object.keys(cursors).length}</span>
          
          {/* PR #6: Shape Mode Selector */}
          <ShapeModeSelector
            mode={shapeMode}
            onModeChange={setShapeMode}
          />
          
          {/* Color Picker */}
          {selectedShape && (
            <div className="header-color-picker">
              <span className="color-label">Color:</span>
              <ColorPicker
                selectedColor={displayColor}  // CHANGED: Use displayColor (shows ? for mixed)
                onColorChange={handleColorChange}
              />
            </div>
          )}
        </div>
        
        {cursorsError && (
          <div className="cursor-error">
            <span>⚠️ Cursor sync: {cursorsError}</span>
          </div>
        )}
      </div>
      
      <div className="canvas-wrapper">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          draggable={isPanning && !isRectangleDragging && !isRectangleResizing && !isTextEditing}  // PR #8: Disable during text editing
          onWheel={handleWheel}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onMouseDown={handleStageMouseDown}  // CHANGED: Use mousedown for selection box
          onDblClick={(e) => {
            // PR #8: Create text on double-click in text mode
            if (shapeMode === 'text') {
              e.cancelBubble = true
              const stage = stageRef.current
              if (!stage) return
              const pointer = stage.getPointerPosition()
              if (!pointer) return
              const coords = transformToCanvasCoords(pointer.x, pointer.y)
              if (coords) {
                createText(coords.x, coords.y, 'New Text')
              }
            }
          }}
          onMouseMove={handleMouseMove}  // CHANGED: Merged cursor broadcasting + selection box
          onMouseUp={handleStageMouseUp}      // NEW: Complete selection box
          className={isPanning ? 'panning' : (isShiftPressed ? 'selection-mode' : (isDragging ? 'dragging' : ''))}  // NEW: CSS classes for cursor
        >
          <Layer>
            {/* Render rectangles (sorted by zIndex) */}
            {sortedRectangles.map((rectangle) => (
              <Rectangle
                key={rectangle.id}
                rectangle={rectangle}
                isSelected={selectedShapes.has(rectangle.id)}
                isPrimary={rectangle.id === primarySelectionId}
                isShiftPressed={isShiftPressed}
                onClick={handleRectangleClick}
                onDragStart={handleRectangleDragStart}
                onDragEnd={handleRectangleDragEnd}
                onResize={handleRectangleResize}
                onResizeStart={handleResizeStart}
                onResizeEnd={handleResizeEnd}
              />
            ))}
            
            {/* PR #6: Render circles (sorted by zIndex) */}
            {sortedCircles.map((circle) => (
              <Circle
                key={circle.id}
                circle={circle}
                isSelected={selectedShapes.has(circle.id)}
                isPrimary={circle.id === primarySelectionId}
                isShiftPressed={isShiftPressed}
                onClick={handleCircleClick}
                onDragStart={handleCircleDragStart}
                onDragEnd={handleCircleDragEnd}
                onResize={handleCircleResize}
                onResizeStart={handleResizeStart}
                onResizeEnd={handleResizeEnd}
              />
            ))}
            
            {/* PR #7: Render lines (sorted by zIndex) */}
            {sortedLines.map((line) => (
              <Line
                key={line.id}
                line={line}
                isSelected={selectedShapes.has(line.id)}
                isPrimary={line.id === primarySelectionId}
                isShiftPressed={isShiftPressed}
                onClick={handleLineClick}
                onDragStart={handleLineDragStart}
                onDragEnd={handleLineDragEnd}
                onEndpointsChange={handleLineEndpointsChange}
                onResizeStart={handleResizeStart}
                onResizeEnd={handleResizeEnd}
              />
            ))}
            
            {/* PR #7: Render line preview during creation */}
            {lineCreationStart && linePreviewEnd && (
              <Line
                line={{
                  id: 'preview',
                  type: 'line',
                  x: lineCreationStart.x,
                  y: lineCreationStart.y,
                  endX: linePreviewEnd.x,
                  endY: linePreviewEnd.y,
                  strokeWidth: 4,
                  color: '#3b82f6',
                  hasArrow: false,
                  zIndex: 999999,
                  createdBy: '',
                  createdAt: 0,
                  selectedBy: null,
                  selectedAt: null
                }}
                isSelected={false}
                isPrimary={false}
                isShiftPressed={false}
                onClick={() => {}}
                onDragStart={() => {}}
                onDragEnd={() => {}}
                onEndpointsChange={() => {}}
                onResizeStart={() => {}}
                onResizeEnd={() => {}}
              />
            )}
            
            {/* PR #8: Render texts (sorted by zIndex) */}
            {sortedTexts.map((text) => (
              <Text
                key={text.id}
                textShape={text}
                isSelected={selectedShapes.has(text.id)}
                isPrimary={text.id === primarySelectionId}
                isShiftPressed={isShiftPressed}
                onClick={handleTextClick}
                onDragStart={handleTextDragStart}
                onDragEnd={handleTextDragEnd}
                onTextChange={handleTextChange}
                onEditingChange={setIsTextEditing}
              />
            ))}
            
            {/* NEW: Render selection box */}
            {selectionBoxStart && selectionBoxEnd && (
              <SelectionBox
                x={Math.min(selectionBoxStart.x, selectionBoxEnd.x)}
                y={Math.min(selectionBoxStart.y, selectionBoxEnd.y)}
                width={Math.abs(selectionBoxEnd.x - selectionBoxStart.x)}
                height={Math.abs(selectionBoxEnd.y - selectionBoxStart.y)}
              />
            )}
            
            {/* Render other users' cursors */}
            {Object.values(cursors).map((cursor) => (
              <Cursor
                key={cursor.userId}
                cursor={cursor}
                isOwnCursor={false}
              />
            ))}
          </Layer>
        </Stage>
        
        
      </div>
      
      {/* Toast Messages */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onDismiss={clearToast}
        />
      )}
    </div>
  )
}

export default Canvas
