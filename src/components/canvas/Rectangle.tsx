import React, { useState } from 'react'
import { Rect, Group } from 'react-konva'
import type { Rectangle } from '../../services/canvasService'
import { DEFAULT_RECT, SELECTION_COLORS, RESIZE_DIRECTIONS } from '../../utils/constants'
import { calculateResizeHandlePositions, calculateResizeUpdate } from '../../utils/canvasHelpers'
import { useAuth } from '../../contexts/AuthContext'
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
  
  const { user } = useAuth()
  
  // Check if rectangle is selected by another user
  const isSelectedByOther = rectangle.selectedBy && rectangle.selectedBy !== user?.uid

  const handleClick = (e: any) => {
    e.cancelBubble = true // Prevent event from bubbling to stage
    e.evt?.stopPropagation() // Additional stopPropagation for better event handling
    e.evt?.preventDefault() // Prevent default behavior
    if (onClick && !isResizing) {
      onClick(rectangle)
    }
  }

  const handleDragStart = (e: any) => {
    if (isResizing) return // Don't drag while resizing
    
    // Aggressively stop all propagation
    e.cancelBubble = true
    e.evt?.stopPropagation()
    e.evt?.preventDefault()
    
    // Stop immediate propagation to prevent other handlers
    e.evt?.stopImmediatePropagation?.()
    
    setIsDragging(true)
    if (onDragStart) {
      onDragStart(rectangle)
    }
  }

  const handleDragEnd = (e: any) => {
    if (isResizing) return // Don't drag while resizing
    
    // Aggressively stop all propagation
    e.cancelBubble = true
    e.evt?.stopPropagation()
    e.evt?.preventDefault()
    e.evt?.stopImmediatePropagation?.()
    
    setIsDragging(false)
    const newX = e.target.x()
    const newY = e.target.y()
    
    if (onDragEnd) {
      onDragEnd(rectangle, newX, newY)
    }
  }

  // Handle resize operations
  const handleResizeStart = (_direction: string) => {
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

    // Apply optimistic update for smooth resizing
    onResize(rectangle, resizeUpdate.width, resizeUpdate.height, resizeUpdate.x, resizeUpdate.y)
  }

  const handleResizeEnd = (_direction: string) => {
    setIsResizing(false)
    // Clear the captured resize start state
    setResizeStartRect(null)
    if (onResizeEnd) {
      onResizeEnd()
    }
  }

  // Calculate resize handle positions
  const handlePositions = calculateResizeHandlePositions(
    rectangle.x, 
    rectangle.y, 
    rectangle.width, 
    rectangle.height
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
              : DEFAULT_RECT.STROKE
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
        onMouseDown={(e) => {
          // Prevent stage from starting drag on rectangle mousedown
          e.cancelBubble = true
          e.evt?.stopPropagation()
          e.evt?.preventDefault()
          e.evt?.stopImmediatePropagation?.()
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        // Visual feedback
        shadowColor={isSelected ? SELECTION_COLORS.STROKE : 'transparent'}
        shadowBlur={isSelected ? 5 : 0}
        shadowOpacity={isSelected ? 0.3 : 0}
        // Hover effects
        onMouseEnter={(e) => {
          if (!isResizing && !isDragging) {
            const container = e.target.getStage()?.container()
            if (container) {
              container.style.cursor = isSelected ? 'move' : 'pointer'
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing && !isDragging) {
            const container = e.target.getStage()?.container()
            if (container) {
              container.style.cursor = 'default'
            }
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
