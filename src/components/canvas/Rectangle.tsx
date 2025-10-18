import React, { useState } from 'react'
import { Rect, Group } from 'react-konva'
import type { Rectangle } from '../../services/canvasService'
import { DEFAULT_RECT, SELECTION_COLORS, RESIZE_DIRECTIONS, getRectangleBorderColor } from '../../utils/constants'
import { calculateResizeHandlePositions, calculateResizeUpdate } from '../../utils/canvasHelpers'
import { useAuth } from '../../contexts/AuthContext'
import { stopEventPropagation, setStageCursor } from '../../utils/eventHelpers'
import ResizeHandle from './ResizeHandle'

interface RectangleProps {
  rectangle: Rectangle
  isSelected?: boolean
  onClick?: (rectangle: Rectangle) => void
  onDragStart?: (rectangle: Rectangle) => void
  onDragEnd?: (rectangle: Rectangle, newX: number, newY: number) => void
  onResize?: (rectangle: Rectangle, newWidth: number, newHeight: number, newX?: number, newY?: number) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
}

const RectangleComponent: React.FC<RectangleProps> = ({ 
  rectangle, 
  isSelected = false,
  onClick,
  onDragStart,
  onDragEnd,
  onResize,
  onResizeStart,
  onResizeEnd
}) => {
  const [isResizing, setIsResizing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  // Store the rectangle state at the start of resize to avoid stale prop issues
  const [resizeStartRect, setResizeStartRect] = useState<typeof rectangle | null>(null)
  
  // Track the current visual rectangle dimensions during resize for handle positioning
  const [currentVisualRect, setCurrentVisualRect] = useState<typeof rectangle | null>(null)
  
  const { user } = useAuth()
  
  // Check if rectangle is selected by another user
  const isSelectedByOther = rectangle.selectedBy && rectangle.selectedBy !== user?.uid

  const handleClick = (e: any) => {
    stopEventPropagation(e)
    if (onClick && !isResizing) {
      onClick(rectangle)
    }
  }

  const handleDragStart = (e: any) => {
    if (isResizing) return // Don't drag while resizing
    
    stopEventPropagation(e)
    
    setIsDragging(true)
    if (onDragStart) {
      onDragStart(rectangle)
    }
  }

  const handleDragEnd = (e: any) => {
    if (isResizing) return // Don't drag while resizing
    
    stopEventPropagation(e)
    
    setIsDragging(false)
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
  const rectForHandles = isResizing && currentVisualRect ? currentVisualRect : rectangle
  const handlePositions = calculateResizeHandlePositions(
    rectForHandles.x, 
    rectForHandles.y, 
    rectForHandles.width, 
    rectForHandles.height
  )

  return (
    <Group>
      <Rect
        x={rectangle.x}
        y={rectangle.y}
        width={rectangle.width}
        height={rectangle.height}
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
        draggable={isSelected && !isResizing}
        onClick={handleClick}
        onTap={handleClick} // For touch devices
        onMouseDown={stopEventPropagation}
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
      {isSelected && !isDragging && (
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
        </>
      )}
    </Group>
  )
}

export default RectangleComponent
