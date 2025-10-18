import React, { useState } from 'react'
import { Rect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { RESIZE_HANDLE, RESIZE_DIRECTIONS } from '../../utils/constants'
import { stopEventPropagation, setStageCursor, resetStageCursor } from '../../utils/eventHelpers'

interface ResizeHandleProps {
  x: number
  y: number
  direction: string
  onDragStart?: (direction: string) => void
  onDragMove?: (direction: string, deltaX: number, deltaY: number) => void
  onDragEnd?: (direction: string) => void
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
  x,
  y,
  direction,
  onDragStart,
  onDragMove,
  onDragEnd
}) => {
  const [isHover, setIsHover] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [initialDragStart, setInitialDragStart] = useState({ x: 0, y: 0 })

  const getCursor = (direction: string) => {
    switch (direction) {
      case RESIZE_DIRECTIONS.TOP_LEFT:
      case RESIZE_DIRECTIONS.BOTTOM_RIGHT:
        return 'nw-resize'
      case RESIZE_DIRECTIONS.TOP_RIGHT:
      case RESIZE_DIRECTIONS.BOTTOM_LEFT:
        return 'ne-resize'
      case RESIZE_DIRECTIONS.TOP_CENTER:
      case RESIZE_DIRECTIONS.BOTTOM_CENTER:
        return 'n-resize'
      case RESIZE_DIRECTIONS.MIDDLE_LEFT:
      case RESIZE_DIRECTIONS.MIDDLE_RIGHT:
        return 'e-resize'
      default:
        return 'default'
    }
  }

  const handleMouseEnter = (e: KonvaEventObject<MouseEvent>) => {
    setIsHover(true)
    setStageCursor(e, getCursor(direction))
  }

  const handleMouseLeave = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDragging) {
      setIsHover(false)
      resetStageCursor(e)
    }
  }

  const handleDragStart = (e: KonvaEventObject<MouseEvent>) => {
    stopEventPropagation(e)
    
    setIsDragging(true)
    const pos = e.target.getStage().getPointerPosition()
    // Store the initial drag position
    setInitialDragStart({ x: pos.x, y: pos.y })
    
    if (onDragStart) {
      onDragStart(direction)
    }
  }

  const handleDragMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDragging) return
    
    stopEventPropagation(e)
    
    const pos = e.target.getStage().getPointerPosition()
    // Calculate delta from the INITIAL drag start position, not the previous position
    const deltaX = pos.x - initialDragStart.x
    const deltaY = pos.y - initialDragStart.y
    
    if (onDragMove) {
      onDragMove(direction, deltaX, deltaY)
    }
  }

  const handleDragEnd = (e: KonvaEventObject<MouseEvent>) => {
    stopEventPropagation(e)
    
    setIsDragging(false)
    setIsHover(false)
    resetStageCursor(e)
    
    if (onDragEnd) {
      onDragEnd(direction)
    }
  }

  return (
    <Rect
      x={x - RESIZE_HANDLE.SIZE / 2}
      y={y - RESIZE_HANDLE.SIZE / 2}
      width={RESIZE_HANDLE.SIZE}
      height={RESIZE_HANDLE.SIZE}
      fill={isHover || isDragging ? RESIZE_HANDLE.HOVER_FILL : RESIZE_HANDLE.FILL}
      stroke={isHover || isDragging ? RESIZE_HANDLE.HOVER_STROKE : RESIZE_HANDLE.STROKE}
      strokeWidth={RESIZE_HANDLE.STROKE_WIDTH}
      draggable={true}
      onClick={stopEventPropagation}
      onTap={stopEventPropagation}
      onMouseDown={stopEventPropagation}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      // Make handles appear above rectangles
      zIndex={10}
    />
  )
}

export default ResizeHandle
