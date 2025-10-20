import React, { useState, useRef } from 'react'
import { Rect, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import type { Rectangle } from '../../services/canvasService'
import { DEFAULT_RECT, SELECTION_COLORS, RESIZE_DIRECTIONS, getRectangleBorderColor } from '../../utils/constants'
import { calculateResizeHandlePositions, calculateResizeUpdate } from '../../utils/canvasHelpers'
import { useAuth } from '../../contexts/AuthContext'
import { stopEventPropagation, setStageCursor } from '../../utils/eventHelpers'
import ResizeHandle from './ResizeHandle'
import RotateHandle from './RotateHandle'  // Phase 3D PR #12

interface RectangleProps {
  rectangle: Rectangle
  isSelected?: boolean
  isPrimary?: boolean  // NEW: Is this the primary selection (shows resize handles)
  isShiftPressed?: boolean  // NEW: Is Shift key pressed (disables dragging for selection box)
  isInMultiSelectGroup?: boolean  // NEW: Is this part of a multi-select group (disables individual dragging)
  onClick?: (rectangle: Rectangle, cmdOrCtrlPressed: boolean) => void
  onDragStart?: (rectangle: Rectangle) => void
  onDragEnd?: (rectangle: Rectangle, newX: number, newY: number) => void
  onResize?: (rectangle: Rectangle, newWidth: number, newHeight: number, newX?: number, newY?: number) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
  onRotate?: (shapeId: string, rotation: number) => void  // Phase 3D PR #12
}

const RectangleComponent: React.FC<RectangleProps> = ({ 
  rectangle, 
  isSelected = false,
  isPrimary = false,  // NEW
  isShiftPressed = false,  // NEW
  isInMultiSelectGroup = false,  // NEW
  onClick,
  onDragStart,
  onDragEnd,
  onResize,
  onResizeStart,
  onResizeEnd,
  onRotate  // Phase 3D PR #12
}) => {
  const [isResizing, setIsResizing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  // Store the rectangle state at the start of resize to avoid stale prop issues
  const [resizeStartRect, setResizeStartRect] = useState<typeof rectangle | null>(null)
  
  // Track the current visual rectangle dimensions during resize for handle positioning
  const [currentVisualRect, setCurrentVisualRect] = useState<typeof rectangle | null>(null)
  
  // Drag threshold state
  const [mouseDownPos, setMouseDownPos] = useState<{x: number, y: number} | null>(null)
  const [dragEnabled, setDragEnabled] = useState(false)
  const DRAG_THRESHOLD = 5 // pixels
  const rectRef = useRef<Konva.Rect>(null)
  
  const { user } = useAuth()
  
  // Check if rectangle is selected by another user
  const isSelectedByOther = rectangle.selectedBy && rectangle.selectedBy !== user?.uid

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    stopEventPropagation(e)
    if (onClick && !isResizing && !isDragging) {
      const cmdOrCtrlPressed = e.evt.metaKey || e.evt.ctrlKey
      onClick(rectangle, cmdOrCtrlPressed)
    }
  }

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (isResizing) return
    stopEventPropagation(e)
    
    // Record the starting position for drag threshold
    setMouseDownPos({ x: e.evt.clientX, y: e.evt.clientY })
    setDragEnabled(false)
  }

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (isResizing || !mouseDownPos || dragEnabled) return
    
    // Calculate distance moved
    const distance = Math.sqrt(
      Math.pow(e.evt.clientX - mouseDownPos.x, 2) + 
      Math.pow(e.evt.clientY - mouseDownPos.y, 2)
    )
    
    // If moved more than threshold, enable dragging
    if (distance > DRAG_THRESHOLD) {
      setDragEnabled(true)
      
      // Select the rectangle if not already selected
      if (!isSelected && onClick) {
        const cmdOrCtrlPressed = e.evt.metaKey || e.evt.ctrlKey
        onClick(rectangle, cmdOrCtrlPressed)
      }
      
      // Manually start the drag since the draggable prop update won't happen in time
      if (rectRef.current && !isShiftPressed && !isInMultiSelectGroup) {
        rectRef.current.startDrag()
      }
    }
  }

  const handleMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    if (isResizing) return
    
    // If we didn't drag (stayed within threshold), treat as click
    if (mouseDownPos && !dragEnabled) {
      handleClick(e)
    }
    
    // Reset drag threshold state
    setMouseDownPos(null)
    setDragEnabled(false)
  }

  const handleDragStart = (e: KonvaEventObject<MouseEvent>) => {
    if (isResizing) return
    stopEventPropagation(e)
    
    setIsDragging(true)
    if (onDragStart) {
      onDragStart(rectangle)
    }
  }

  const handleDragEnd = (e: KonvaEventObject<MouseEvent>) => {
    if (isResizing) return // Don't drag while resizing
    
    stopEventPropagation(e)
    
    setIsDragging(false)
    setDragEnabled(false)
    setMouseDownPos(null)
    
    const newX = e.target.x()
    const newY = e.target.y()
    
    if (onDragEnd) {
      onDragEnd(rectangle, newX, newY)
    }
  }

  // Handle resize operations
  const handleResizeStart = () => {
    setIsResizing(true)
    // Capture the rectangle state at the start of resize
    setResizeStartRect({ ...rectangle })
    if (onResizeStart) {
      onResizeStart()
    }
  }

  const handleResizeMove = (direction: string, deltaX: number, deltaY: number) => {
    if (!onResize || !isResizing || !resizeStartRect) return

    // Use the captured rectangle state from resize start, not current props
    const resizeUpdate = calculateResizeUpdate(
      direction,
      resizeStartRect.x,
      resizeStartRect.y,
      resizeStartRect.width,
      resizeStartRect.height,
      deltaX,
      deltaY
    )

    // Update the current visual rectangle for handle positioning
    setCurrentVisualRect({
      ...rectangle,
      x: resizeUpdate.x,
      y: resizeUpdate.y,
      width: resizeUpdate.width,
      height: resizeUpdate.height
    })

    // Apply optimistic update for smooth resizing
    onResize(rectangle, resizeUpdate.width, resizeUpdate.height, resizeUpdate.x, resizeUpdate.y)
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
    // Clear the captured resize start state and current visual rect
    setResizeStartRect(null)
    setCurrentVisualRect(null)
    if (onResizeEnd) {
      onResizeEnd()
    }
  }

  // Calculate resize handle positions using current visual rectangle during resize
  // Account for offset (rotation origin at center) - visual top-left is at (x - width/2, y - height/2)
  const rectForHandles = isResizing && currentVisualRect ? currentVisualRect : rectangle
  const visualX = rectForHandles.x - rectForHandles.width / 2
  const visualY = rectForHandles.y - rectForHandles.height / 2
  const handlePositions = calculateResizeHandlePositions(
    visualX, 
    visualY, 
    rectForHandles.width, 
    rectForHandles.height
  )

  return (
    <Group>
      <Rect
        ref={rectRef}
        x={rectangle.x}
        y={rectangle.y}
        width={rectangle.width}
        height={rectangle.height}
        offsetX={rectangle.width / 2}  // Phase 3D PR #12: Set rotation origin to center
        offsetY={rectangle.height / 2}
        rotation={rectangle.rotation || 0}  // Phase 3D PR #12
        fill={rectangle.color}
        stroke={
          isSelected 
            ? SELECTION_COLORS.STROKE 
            : isSelectedByOther 
              ? '#f59e0b' // Orange for other user's selection
              : getRectangleBorderColor(rectangle.color)
        }
        strokeWidth={
          isSelected 
            ? SELECTION_COLORS.STROKE_WIDTH 
            : isSelectedByOther 
              ? 2 
              : DEFAULT_RECT.STROKE_WIDTH
        }
        dash={isSelectedByOther ? [5, 5] : undefined}
        draggable={isSelected && !isResizing && !isShiftPressed && !isInMultiSelectGroup && dragEnabled}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTap={handleClick} // For touch devices
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        // Visual feedback
        shadowColor={isSelected ? SELECTION_COLORS.STROKE : 'transparent'}
        shadowBlur={isSelected ? 5 : 0}
        shadowOpacity={isSelected ? 0.3 : 0}
        // Hover effects
        onMouseEnter={(e) => {
          if (!isResizing && !isDragging) {
            setStageCursor(e, isSelected ? 'move' : 'pointer')
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing && !isDragging) {
            setStageCursor(e, 'default')
          }
        }}
      />
      
      {/* Render resize handles when selected and not dragging */}
      {isPrimary && !isDragging && !isShiftPressed && (  // CHANGED: Only show for primary selection, hide during Shift
        <>
          {Object.entries(RESIZE_DIRECTIONS).map(([, direction]) => {
            const position = handlePositions[direction]
            return (
              <ResizeHandle
                key={direction}
                x={position.x}
                y={position.y}
                direction={direction}
                onDragStart={handleResizeStart}
                onDragMove={handleResizeMove}
                onDragEnd={handleResizeEnd}
              />
            )
          })}
          
          {/* Phase 3D PR #12: Rotate handle */}
          {onRotate && (
            <RotateHandle
              shapeId={rectangle.id}
              centerX={visualX + rectForHandles.width / 2}
              centerY={visualY + rectForHandles.height / 2}
              currentRotation={rectangle.rotation || 0}
              isShiftPressed={isShiftPressed}
              onRotate={onRotate}
            />
          )}
        </>
      )}
    </Group>
  )
}

export default RectangleComponent
