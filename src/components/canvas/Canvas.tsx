import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Stage, Layer } from 'react-konva'
import { useCanvas } from '../../contexts/CanvasContext'
import { useCursors } from '../../hooks/useCursors'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../../utils/constants'
import Cursor from './Cursor'
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
  
  // Get canvas context
  const { rectangles } = useCanvas()
  
  // Get cursors context
  const { cursors, updateCursor, error: cursorsError } = useCursors()

  // Handle mouse move for cursor broadcasting
  const handleMouseMove = useCallback((e: any) => {
    if (isDragging) return // Don't broadcast while panning

    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    
    if (pointer) {
      // Convert screen coordinates to canvas coordinates
      const canvasX = (pointer.x - stagePosition.x) / stageScale
      const canvasY = (pointer.y - stagePosition.y) / stageScale
      
      updateCursor(canvasX, canvasY)
    }
  }, [updateCursor, stagePosition, stageScale, isDragging])

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
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  // Handle drag end  
  const handleDragEnd = useCallback((e: any) => {
    setIsDragging(false)
    setStagePosition({ x: e.target.x(), y: e.target.y() })
  }, [])

  // Handle stage click (for future rectangle creation)
  const handleStageClick = useCallback((e: any) => {
    // Only handle clicks on the stage background (not on shapes)
    if (e.target === e.target.getStage()) {
      console.log('Clicked on canvas background at:', e.evt.layerX, e.evt.layerY)
      // Future: This is where we'll add rectangle creation in PR #6
    }
  }, [])

  // Keyboard controls for canvas navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stageRef.current) return
      
      const moveAmount = 50
      let newPosition = { ...stagePosition }
      
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
  }, [stagePosition])

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
          draggable
          onWheel={handleWheel}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleStageClick}
          onMouseMove={handleMouseMove}
          className={isDragging ? 'dragging' : ''}
        >
          <Layer>
            {/* Grid background for visual reference */}
            {/* We'll add rectangles here in PR #6 */}
            
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
