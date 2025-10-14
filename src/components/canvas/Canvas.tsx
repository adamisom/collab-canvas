import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Stage, Layer } from 'react-konva'
import { useCanvas } from '../../contexts/CanvasContext'
import { useCursors } from '../../hooks/useCursors'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../../utils/constants'
import Cursor from './Cursor'
import Rectangle from './Rectangle'
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
  const [stageScale, setStageScale] = useState(1)
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isRectangleDragging, setIsRectangleDragging] = useState(false)
  const [isRectangleResizing, setIsRectangleResizing] = useState(false)
  
  // Get canvas context
  const { rectangles, selectedRectangleId, createRectangle, updateRectangle, resizeRectangle, deleteRectangle, selectRectangle } = useCanvas()
  
  // Get cursors context
  const { cursors, updateCursor, error: cursorsError } = useCursors()

  // Handle mouse move for cursor broadcasting
  const handleMouseMove = useCallback((e: any) => {
    if (isDragging || isRectangleDragging || isRectangleResizing) return // Don't broadcast while panning, dragging, or resizing

    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    
    if (pointer) {
      // Convert screen coordinates to canvas coordinates
      const canvasX = (pointer.x - stagePosition.x) / stageScale
      const canvasY = (pointer.y - stagePosition.y) / stageScale
      
      updateCursor(canvasX, canvasY)
    }
  }, [updateCursor, stagePosition, stageScale, isDragging, isRectangleDragging, isRectangleResizing])

  // Handle wheel zoom
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault()
    
    const scaleBy = 1.05
    const stage = e.target.getStage()
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    
    let newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy
    
    // Constrain zoom levels
    newScale = Math.max(0.1, Math.min(newScale, 5))
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }
    
    setStageScale(newScale)
    setStagePosition(newPos)
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
  const handleDragEnd = useCallback((e: any) => {
    // Only update stage position if this was actually a stage drag
    if (!isRectangleDragging && !isRectangleResizing && isDragging) {
      setIsDragging(false)
      setStagePosition({ x: e.target.x(), y: e.target.y() })
    }
  }, [isRectangleDragging, isRectangleResizing, isDragging])

  // Handle stage click (for rectangle creation and deselection)
  const handleStageClick = useCallback(async (e: any) => {
    // Only handle clicks on the stage background (not on shapes)
    if (e.target === e.target.getStage()) {
      // Deselect any selected rectangle
      selectRectangle(null)
      
      // Create new rectangle at click position
      const stage = e.target.getStage()
      const pointer = stage.getPointerPosition()
      
      if (pointer) {
        // Convert screen coordinates to canvas coordinates
        const canvasX = (pointer.x - stagePosition.x) / stageScale
        const canvasY = (pointer.y - stagePosition.y) / stageScale
        
        console.log('Creating rectangle at:', canvasX, canvasY)
        const newRectangle = await createRectangle(canvasX, canvasY)
        
        if (newRectangle) {
          console.log('Rectangle created:', newRectangle)
        }
      }
    }
  }, [createRectangle, selectRectangle, stagePosition, stageScale])

  // Handle rectangle click (selection)
  const handleRectangleClick = useCallback((rectangle: RectangleType) => {
    selectRectangle(rectangle.id)
  }, [selectRectangle])

  // Handle rectangle drag start
  const handleRectangleDragStart = useCallback((rectangle: RectangleType) => {
    setIsRectangleDragging(true)
    selectRectangle(rectangle.id)
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
      let newPosition = { ...stagePosition }
      
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
          setStageScale(1)
          setStagePosition({ x: 0, y: 0 })
          return
        default:
          return
      }
      
      setStagePosition(newPosition)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [stagePosition, selectedRectangleId, rectangles, handleRectangleResize, deleteRectangle, isRectangleDragging, isRectangleResizing])

  return (
    <div className="canvas-container">
      <div className="canvas-info">
        <div className="canvas-stats">
          <span>Zoom: {Math.round(stageScale * 100)}%</span>
          <span>Position: ({Math.round(stagePosition.x)}, {Math.round(stagePosition.y)})</span>
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
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
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
    </div>
  )
}

export default Canvas
