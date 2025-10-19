import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Stage, Layer, Text, Group, Rect } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCanvas } from '../../contexts/CanvasContext'
import { useCursors } from '../../hooks/useCursors'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../../utils/constants'
import { stopEventPropagation } from '../../utils/eventHelpers'
import Cursor from './Cursor'
import Rectangle from './Rectangle'
import SelectionBox from './SelectionBox'  // NEW
import CanvasInfo from './CanvasInfo'  // NEW: Separate component for info bar
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
  const multiSelectGroupRef = useRef<Konva.Group | null>(null)
  
  // Canvas viewport state
  const [isDragging, setIsDragging] = useState(false)
  const [isRectangleDragging, setIsRectangleDragging] = useState(false)
  const [isRectangleResizing, setIsRectangleResizing] = useState(false)
  
  // NEW: Selection box state (for Shift+Drag multi-select)
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionBoxEnd, setSelectionBoxEnd] = useState<{ x: number; y: number } | null>(null)
  
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
    selectedRectangleIds,  // CHANGED: From single to multi
    primarySelectionId,    // NEW
    createRectangle, 
    updateRectangle, 
    resizeRectangle, 
    deleteRectangle, 
    deleteSelectedRectangles, // NEW: Delete all selected
    selectRectangle,
    selectMultiple,        // NEW
    selectAll,             // NEW
    clearSelection,        // NEW
    changeRectangleColor,
    changeSelectedRectanglesColor, // NEW: Change color of all selected
    copySelectedRectangles,  // CHANGED
    pasteRectangles,         // CHANGED
    duplicateRectangle,
    bringToFront,
    sendToBack,
    selectionLocked,
    toastMessage,
    clearToast,
    showToast,             // NEW: For first-visit toast
    updateViewportInfo
  } = useCanvas()
  
  // Get cursors context
  const { cursors, updateCursor, error: cursorsError } = useCursors()


  // Get current stage position (for keyboard navigation)
  const getCurrentStagePosition = useCallback(() => {
    // Don't return (0,0) fallback - return null to indicate unavailable
    if (!stageRef.current) return null
    return {
      x: stageRef.current.x(),
      y: stageRef.current.y()
    }
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
  }, [updateCursor, isDragging, isRectangleDragging, isRectangleResizing, selectionBoxStart, transformToCanvasCoords])

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

  // NEW: Handle stage mouse down (for selection box start only)
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
    }
    // Note: Rectangle creation moved to double-click (handleStageDoubleClick)
  }, [isShiftPressed, transformToCanvasCoords])

  // NEW: Handle stage double click (for rectangle creation)
  const handleStageDoubleClick = useCallback(async (e: KonvaEventObject<MouseEvent>) => {
    // Only handle clicks on the stage background (not on shapes)
    if (e.target !== e.target.getStage()) return

    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const canvasCoords = transformToCanvasCoords(pointer.x, pointer.y)
    if (!canvasCoords) return

    // Don't create rectangle if in selection box mode
    if (isShiftPressed) return

    // Clear selection and create new rectangle
    await clearSelection()
    await createRectangle(canvasCoords.x, canvasCoords.y)
  }, [isShiftPressed, transformToCanvasCoords, clearSelection, createRectangle])

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

  // NEW: Handle multi-select group drag end (Konva Group approach)
  const handleMultiSelectGroupDragEnd = useCallback(async (_e: KonvaEventObject<DragEvent>) => {
    if (!multiSelectGroupRef.current) return
    
    const group = multiSelectGroupRef.current
    const offsetX = group.x()
    const offsetY = group.y()
    
    // Reset group position immediately (rectangles will update via Firebase)
    group.position({ x: 0, y: 0 })
    
    const selectedIds = Array.from(selectedRectangleIds)
    const selectedRects = rectangles.filter(r => selectedIds.includes(r.id))
    
    try {
      // Update all selected rectangles with the offset
      await Promise.all(
        selectedRects.map(rect => 
          updateRectangle(rect.id, { 
            x: rect.x + offsetX, 
            y: rect.y + offsetY 
          })
        )
      )
    } catch (error) {
      console.error('Error updating multi-select group position:', error)
    }
  }, [selectedRectangleIds, rectangles, updateRectangle])

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

  // Handle color change
  const handleColorChange = useCallback(async (color: string) => {
    if (selectedRectangleIds.size > 1) {
      // Change color for all selected rectangles
      await changeSelectedRectanglesColor(color)
    } else if (primarySelectionId) {
      // Single selection - change only primary
      await changeRectangleColor(primarySelectionId, color)
    }
  }, [primarySelectionId, selectedRectangleIds, changeRectangleColor, changeSelectedRectanglesColor])

  // Get selected rectangle (primary selection)
  const selectedRectangle = rectangles.find(r => r.id === primarySelectionId)
  
  // NEW: Check if multiple selections have mixed colors
  const selectedColors = useMemo(() => {
    const colors = new Set<string>()
    for (const id of selectedRectangleIds) {
      const rect = rectangles.find(r => r.id === id)
      if (rect) colors.add(rect.color)
    }
    return colors
  }, [selectedRectangleIds, rectangles])
  
  const hasMixedColors = selectedColors.size > 1
  const displayColor = hasMixedColors ? '?' : (selectedRectangle?.color || '#000000')

  // Sort rectangles by zIndex for rendering (lower zIndex = render first = behind)
  const sortedRectangles = useMemo(() => {
    return [...rectangles].sort((a, b) => {
      const aZ = a.zIndex ?? 0
      const bZ = b.zIndex ?? 0
      return aZ - bZ
    })
  }, [rectangles])

  // Split rectangles into multi-select group vs individual
  const { multiSelectRectangles, otherRectangles } = useMemo(() => {
    const isMultiSelect = selectedRectangleIds.size > 1
    
    if (!isMultiSelect) {
      return {
        multiSelectRectangles: [],
        otherRectangles: sortedRectangles
      }
    }
    
    return {
      multiSelectRectangles: sortedRectangles.filter(r => selectedRectangleIds.has(r.id)),
      otherRectangles: sortedRectangles.filter(r => !selectedRectangleIds.has(r.id))
    }
  }, [sortedRectangles, selectedRectangleIds])


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
        // Cancel selection box if active
        if (selectionBoxStart) {
          setSelectionBoxStart(null)
          setSelectionBoxEnd(null)
        } else {
          // Otherwise clear selection
          clearSelection()
        }
        return
      }
      
      // Copy: Cmd+C (Mac) or Ctrl+C (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !isTyping) {
        // Check if user has selected text - if so, let browser handle it
        const selection = window.getSelection()
        const hasTextSelection = selection && selection.toString().length > 0
        
        if (selectedRectangleIds.size > 0 && !hasTextSelection) {
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
      
      // Duplicate: Cmd+D (Mac) or Ctrl+D (Windows/Linux) - only works with single selection
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !isTyping) {
        e.preventDefault() // Prevent browser bookmark shortcut
        if (selectedRectangleIds.size === 1 && primarySelectionId) {
          duplicateRectangleRef.current?.(primarySelectionId)
        } else if (selectedRectangleIds.size > 1) {
          showToast('Duplicate only works with single selection')
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
      
      // Handle rectangle deletion - deletes all selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRectangleIds.size > 0) {
        // Don't delete if user is typing in an input field
        if (isTyping) return
        
        // Prevent deletion during active operations
        if (!isRectangleDragging && !isRectangleResizing) {
          e.preventDefault()
          deleteSelectedRectangles()
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
            sendViewportInfo() // Update AI agent viewport info
            // Trigger info bar update
            if ((window as any).__canvasInfoUpdate) {
              (window as any).__canvasInfoUpdate()
            }
            return
          default:
            return
        }
        
        stageRef.current.x(newPosition.x)
        stageRef.current.y(newPosition.y)
        sendViewportInfo() // Update AI agent viewport info
        // Trigger info bar update
        if ((window as any).__canvasInfoUpdate) {
          (window as any).__canvasInfoUpdate()
        }
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
  }, [primarySelectionId, rectangles, handleRectangleResize, deleteRectangle, deleteSelectedRectangles, isRectangleDragging, isRectangleResizing, getCurrentStagePosition, selectionLocked, selectedRectangleIds, isShiftPressed, isPanning, selectAll, clearSelection, selectionBoxStart, sendViewportInfo, showToast])

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

  // NEW: Show first-visit welcome toast
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('collabcanvas_hasSeenWelcome')
    if (!hasSeenWelcome) {
      // Delay toast slightly so it doesn't appear before canvas loads
      const timeout = setTimeout(() => {
        showToast('💡 Tip: Double-click anywhere to create a shape!')
        localStorage.setItem('collabcanvas_hasSeenWelcome', 'true')
      }, 1000)
      
      return () => clearTimeout(timeout)
    }
  }, [showToast])

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
      {/* Info bar with viewport stats - extracted for performance */}
      <CanvasInfo
        stageRef={stageRef}
        rectangles={rectangles}
        cursorsCount={Object.keys(cursors).length}
        selectedRectangle={selectedRectangle}
        displayColor={displayColor}
        onColorChange={handleColorChange}
      />
      
      {cursorsError && (
        <div className="cursor-error">
          <span>⚠️ Cursor sync: {cursorsError}</span>
        </div>
      )}
      
      <div className="canvas-wrapper">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          draggable={!isShiftPressed && !isRectangleDragging && !isRectangleResizing}  // CHANGED: Always draggable except when Shift pressed or manipulating rectangles
          onWheel={handleWheel}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onMouseDown={handleStageMouseDown}  // CHANGED: Use mousedown for selection box
          onMouseMove={handleMouseMove}  // CHANGED: Merged cursor broadcasting + selection box
          onMouseUp={handleStageMouseUp}      // NEW: Complete selection box
          onDblClick={handleStageDoubleClick}  // NEW: Double-click to create shape
          className={isShiftPressed ? 'selection-mode' : (isDragging ? 'dragging' : '')}  // NEW: CSS classes for cursor (removed isPanning since it's always pannable now)
        >
          <Layer>
            {/* Render non-selected or single-selected rectangles */}
            {otherRectangles.map((rectangle) => (
              <Rectangle
                key={rectangle.id}
                rectangle={rectangle}
                isSelected={selectedRectangleIds.has(rectangle.id)}
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
            
            {/* NEW: Multi-select group (2+ selected) - Konva Group with all selected rectangles */}
            {multiSelectRectangles.length > 1 && (() => {
              const MARGIN = 8
              const minX = Math.min(...multiSelectRectangles.map(r => r.x)) - MARGIN
              const minY = Math.min(...multiSelectRectangles.map(r => r.y)) - MARGIN
              const maxX = Math.max(...multiSelectRectangles.map(r => r.x + r.width)) + MARGIN
              const maxY = Math.max(...multiSelectRectangles.map(r => r.y + r.height)) + MARGIN
              
              return (
                <Group
                  ref={multiSelectGroupRef}
                  draggable={true}
                  onDragEnd={handleMultiSelectGroupDragEnd}
                >
                  {/* Render bounding box */}
                  <Rect
                    x={minX}
                    y={minY}
                    width={maxX - minX}
                    height={maxY - minY}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dash={[8, 4]}
                    fill="transparent"
                    listening={false}
                  />
                  
                  {/* Render selected rectangles inside group */}
                  {multiSelectRectangles.map((rectangle) => (
                    <Rectangle
                      key={rectangle.id}
                      rectangle={rectangle}
                      isSelected={true}
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
                </Group>
              )
            })()}
            
            {/* NEW: Empty canvas message */}
            {rectangles.length === 0 && (
              <Text
                x={0}
                y={VIEWPORT_HEIGHT / 2 - 20}
                width={VIEWPORT_WIDTH}
                text="Double-click anywhere to create your first shape!"
                fontSize={18}
                fontFamily="Inter, system-ui, sans-serif"
                fill="#94a3b8"
                align="center"
                listening={false}
              />
            )}
            
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
