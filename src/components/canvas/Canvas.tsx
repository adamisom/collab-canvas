import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Stage, Layer } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCanvas } from '../../contexts/CanvasContext'
import { useCursors } from '../../hooks/useCursors'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../../utils/constants'
import { stopEventPropagation } from '../../utils/eventHelpers'
import Cursor from './Cursor'
import Rectangle from './Rectangle'
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
  
  // Get canvas context
  const { 
    rectangles, 
    selectedRectangleId, 
    createRectangle, 
    updateRectangle, 
    resizeRectangle, 
    deleteRectangle, 
    selectRectangle,
    changeRectangleColor,
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
    if (isDragging || isRectangleDragging || isRectangleResizing) return // Don't broadcast while panning, dragging, or resizing

    const stage = e.target.getStage()
    if (!stage) return
    
    const pointer = stage.getPointerPosition()
    
    if (pointer) {
      // REFACTORING NOTE: This coordinate transformation logic is duplicated
      // in handleStageClick. Consider extracting to useCoordinateTransform hook
      const stagePos = getCurrentStagePosition()
      const currentScale = getCurrentStageScale()
      
      if (stagePos && currentScale) {
        const canvasX = (pointer.x - stagePos.x) / currentScale
        const canvasY = (pointer.y - stagePos.y) / currentScale
        
        updateCursor(canvasX, canvasY)
      }
    }
  }, [updateCursor, getCurrentStagePosition, getCurrentStageScale, isDragging, isRectangleDragging, isRectangleResizing])

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

  // Handle stage click (for rectangle creation and deselection)
  const handleStageClick = useCallback(async (e: KonvaEventObject<MouseEvent>) => {
    // Only handle clicks on the stage background (not on shapes)
    if (e.target === e.target.getStage()) {
      // Deselect any selected rectangle
      await selectRectangle(null)
      
      // Create new rectangle at click position
      const stage = e.target.getStage()
      const pointer = stage.getPointerPosition()
      
      if (pointer) {
        // Convert screen coordinates to canvas coordinates
        const stagePos = getCurrentStagePosition()
        const currentScale = getCurrentStageScale()
        
        if (stagePos && currentScale) {
          const canvasX = (pointer.x - stagePos.x) / currentScale
          const canvasY = (pointer.y - stagePos.y) / currentScale
          
          await createRectangle(canvasX, canvasY)
        }
      }
    }
  }, [createRectangle, selectRectangle, getCurrentStagePosition, getCurrentStageScale])

  // Handle rectangle click (selection/deselection)
  const handleRectangleClick = useCallback(async (rectangle: RectangleType) => {
    // If the rectangle is already selected, deselect it
    if (selectedRectangleId === rectangle.id) {
      await selectRectangle(null)
    } else {
      // Otherwise, select it
      await selectRectangle(rectangle.id)
    }
  }, [selectRectangle, selectedRectangleId])

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

  // Handle color change
  const handleColorChange = useCallback(async (color: string) => {
    if (selectedRectangleId) {
      await changeRectangleColor(selectedRectangleId, color)
    }
  }, [selectedRectangleId, changeRectangleColor])

  // Get selected rectangle
  const selectedRectangle = rectangles.find(r => r.id === selectedRectangleId)


  // Keyboard controls for canvas navigation and rectangle resizing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stageRef.current) return
      
      // Don't handle keyboard shortcuts if user is typing in an input/textarea
      const activeElement = document.activeElement
      const isTyping = activeElement instanceof HTMLInputElement || 
                       activeElement instanceof HTMLTextAreaElement
      
      // Handle rectangle deletion
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRectangleId) {
        // Don't delete if user is typing in an input field
        if (isTyping) return
        
        // Prevent deletion during active operations
        if (!isRectangleDragging && !isRectangleResizing) {
          e.preventDefault()
          deleteRectangle(selectedRectangleId)
          return
        }
      }
      
      // Canvas navigation
      const moveAmount = 50
      
      // Check if we're resizing a selected rectangle
      if (selectedRectangleId && (e.shiftKey || e.ctrlKey)) {
        // Don't resize if user is typing in an input field
        if (isTyping) return
        
        const selectedRect = rectangles.find(r => r.id === selectedRectangleId)
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

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedRectangleId, rectangles, handleRectangleResize, deleteRectangle, isRectangleDragging, isRectangleResizing, getCurrentStagePosition])

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
          <span>Rectangles: {rectangles.length}</span>
          <span>Friends: {Object.keys(cursors).length}</span>
          
          {/* Color Picker - always reserve space to prevent layout shift */}
          <div className="header-color-picker">
            {selectedRectangle ? (
              <>
                <span className="color-label">Color:</span>
                <ColorPicker
                  selectedColor={selectedRectangle.color}
                  onColorChange={handleColorChange}
                />
              </>
            ) : (
              <div className="color-picker-placeholder">
                <span className="color-label" style={{ opacity: 0 }}>Color:</span>
                <div className="color-picker" style={{ opacity: 0 }}>
                  <div className="color-picker-options">
                    <div className="color-option" />
                    <div className="color-option" />
                    <div className="color-option" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="canvas-controls">
          <span>🖱️ Click+Drag to pan</span>
          <span>🔍 Scroll to zoom</span>
          <span>⌨️ Arrow keys to navigate</span>
          <span>⇧+Arrows: Resize selected</span>
          <span>🗑️ Delete/Backspace: Delete selected</span>
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
          draggable={!isRectangleDragging && !isRectangleResizing}
          onWheel={handleWheel}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleStageClick}
          onMouseMove={handleMouseMove}
          className={isDragging ? 'dragging' : ''}
        >
          <Layer>
            {/* Render rectangles */}
            {rectangles.map((rectangle) => (
              <Rectangle
                key={rectangle.id}
                rectangle={rectangle}
                isSelected={rectangle.id === selectedRectangleId}
                onClick={handleRectangleClick}
                onDragStart={handleRectangleDragStart}
                onDragEnd={handleRectangleDragEnd}
                onResize={handleRectangleResize}
                onResizeStart={handleResizeStart}
                onResizeEnd={handleResizeEnd}
              />
            ))}
            
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
