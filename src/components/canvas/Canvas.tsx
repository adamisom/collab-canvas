import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Stage, Layer } from 'react-konva'
import { useCanvas } from '../../contexts/CanvasContext'
import { useCursors } from '../../hooks/useCursors'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../../utils/constants'
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

const Canvas: React.FC<CanvasProps> = ({ 
  width = VIEWPORT_WIDTH, 
  height = VIEWPORT_HEIGHT 
}) => {
  const stageRef = useRef<any>(null)
  
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
    clearToast
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

  // Handle mouse move for cursor broadcasting
  const handleMouseMove = useCallback((e: any) => {
    if (isDragging || isRectangleDragging || isRectangleResizing) return // Don't broadcast while panning, dragging, or resizing

    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    
    if (pointer) {
      // Convert screen coordinates to canvas coordinates
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
  const handleWheel = useCallback((e: any) => {
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
  }, [])

  // Handle drag start
  const handleDragStart = useCallback((e: any) => {
    // Don't allow stage dragging if we're interacting with rectangles
    if (isRectangleDragging || isRectangleResizing) {
      e.evt?.preventDefault()
      e.evt?.stopPropagation()
      return false
    }
    setIsDragging(true)
  }, [isRectangleDragging, isRectangleResizing])

  // Handle drag end  
  const handleDragEnd = useCallback((_e: any) => {
    // Reset dragging state
    setIsDragging(false)
  }, [])

  // Handle stage click (for rectangle creation and deselection)
  const handleStageClick = useCallback(async (e: any) => {
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
          
          console.log('Creating rectangle at:', canvasX, canvasY)
          const newRectangle = await createRectangle(canvasX, canvasY)
          
          if (newRectangle) {
            console.log('Rectangle created:', newRectangle)
          }
        }
      }
    }
  }, [createRectangle, selectRectangle, getCurrentStagePosition, getCurrentStageScale])

  // Handle rectangle click (selection)
  const handleRectangleClick = useCallback(async (rectangle: RectangleType) => {
    await selectRectangle(rectangle.id)
  }, [selectRectangle])

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
      
      // Handle rectangle deletion
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRectangleId) {
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
        const currentPos = getCurrentStagePosition()
        let newPosition = { ...currentPos }
        
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
  }, [selectedRectangleId, rectangles, handleRectangleResize, deleteRectangle, isRectangleDragging, isRectangleResizing])

  return (
    <div className="canvas-container">
      <div className="canvas-info">
        <div className="canvas-stats">
          <span>Zoom: {(() => {
            const scale = getCurrentStageScale()
            return scale ? Math.round(scale * 100) : 100
          })()}%</span>
          <span>Position: ({(() => {
            const pos = getCurrentStagePosition()
            return pos ? `${Math.round(pos.x)}, ${Math.round(pos.y)}` : '0, 0'
          })()})</span>
          <span>Rectangles: {rectangles.length}</span>
          <span>Cursors: {Object.keys(cursors).length}</span>
        </div>
        <div className="canvas-controls">
          <span>🖱️ Click+Drag to pan</span>
          <span>🔍 Scroll to zoom</span>
          <span>⌨️ Arrow keys to navigate</span>
          <span>⇧+Arrows: Resize selected</span>
          <span>🗑️ Delete/Backspace: Delete selected</span>
          <span>👥 Real-time cursors</span>
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
        
        {/* Color Picker Toast - positioned above selected rectangle */}
        {selectedRectangle && (() => {
          const stagePos = getCurrentStagePosition()
          const stageScale = getCurrentStageScale()
          
          if (!stagePos || !stageScale) return null
          
          // Convert canvas coordinates to screen coordinates
          const screenX = (selectedRectangle.x * stageScale) + stagePos.x + (selectedRectangle.width * stageScale) / 2
          const screenY = (selectedRectangle.y * stageScale) + stagePos.y - 60
          
          return (
            <div 
              className="color-picker-toast"
              style={{
                position: 'absolute',
                left: screenX,
                top: screenY,
                transform: 'translateX(-50%)', // Center horizontally
                zIndex: 1000,
                pointerEvents: 'auto'
              }}
            >
              <ColorPicker
                selectedColor={selectedRectangle.color}
                onColorChange={handleColorChange}
              />
            </div>
          )
        })()}
        
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
