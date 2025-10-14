import React, { useState } from 'react'
import { Rect } from 'react-konva'
import { RESIZE_HANDLE, RESIZE_DIRECTIONS } from '../../utils/constants'

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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

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

  const handleMouseEnter = (e: any) => {
    setIsHover(true)
    const container = e.target.getStage()?.container()
    if (container) {
      container.style.cursor = getCursor(direction)
    }
  }

  const handleMouseLeave = (e: any) => {
    if (!isDragging) {
      setIsHover(false)
      const container = e.target.getStage()?.container()
      if (container) {
        container.style.cursor = 'default'
      }
    }
  }

  const handleDragStart = (e: any) => {
    // Aggressively stop all propagation 
    e.cancelBubble = true
    e.evt?.stopPropagation()
    e.evt?.preventDefault()
    e.evt?.stopImmediatePropagation?.()
    
    setIsDragging(true)
    const pos = e.target.getStage().getPointerPosition()
    setDragStart({ x: pos.x, y: pos.y })
    
    if (onDragStart) {
      onDragStart(direction)
    }
  }

  const handleDragMove = (e: any) => {
    if (!isDragging) return
    
    // Aggressively stop all propagation
    e.cancelBubble = true
    e.evt?.stopPropagation()
    e.evt?.preventDefault()
    e.evt?.stopImmediatePropagation?.()
    
    const pos = e.target.getStage().getPointerPosition()
    const deltaX = pos.x - dragStart.x
    const deltaY = pos.y - dragStart.y
    
    if (onDragMove) {
      onDragMove(direction, deltaX, deltaY)
    }
    
    setDragStart({ x: pos.x, y: pos.y })
  }

  const handleDragEnd = (e: any) => {
    // Aggressively stop all propagation
    e.cancelBubble = true
    e.evt?.stopPropagation()
    e.evt?.preventDefault()
    e.evt?.stopImmediatePropagation?.()
    
    setIsDragging(false)
    setIsHover(false)
    
    const container = e.target.getStage()?.container()
    if (container) {
      container.style.cursor = 'default'
    }
    
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
      onClick={(e) => {
        e.cancelBubble = true
        e.evt?.stopPropagation()
        e.evt?.preventDefault()
        e.evt?.stopImmediatePropagation?.()
      }}
      onTap={(e) => {
        e.cancelBubble = true
        e.evt?.stopPropagation()
        e.evt?.preventDefault()
        e.evt?.stopImmediatePropagation?.()
      }}
      onMouseDown={(e) => {
        e.cancelBubble = true
        e.evt?.stopPropagation()
        e.evt?.preventDefault()
        e.evt?.stopImmediatePropagation?.()
      }}
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
