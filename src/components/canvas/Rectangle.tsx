import React from 'react'
import { Rect } from 'react-konva'
import type { Rectangle } from '../../services/canvasService'
import { DEFAULT_RECT, SELECTION_COLORS } from '../../utils/constants'

interface RectangleProps {
  rectangle: Rectangle
  isSelected?: boolean
  onClick?: (rectangle: Rectangle) => void
  onDragStart?: (rectangle: Rectangle) => void
  onDragEnd?: (rectangle: Rectangle, newX: number, newY: number) => void
}

const RectangleComponent: React.FC<RectangleProps> = ({ 
  rectangle, 
  isSelected = false,
  onClick,
  onDragStart,
  onDragEnd
}) => {
  
  const handleClick = (e: any) => {
    e.cancelBubble = true // Prevent event from bubbling to stage
    if (onClick) {
      onClick(rectangle)
    }
  }

  const handleDragStart = () => {
    if (onDragStart) {
      onDragStart(rectangle)
    }
  }

  const handleDragEnd = (e: any) => {
    const newX = e.target.x()
    const newY = e.target.y()
    
    if (onDragEnd) {
      onDragEnd(rectangle, newX, newY)
    }
  }

  return (
    <Rect
      x={rectangle.x}
      y={rectangle.y}
      width={rectangle.width}
      height={rectangle.height}
      fill={DEFAULT_RECT.FILL}
      stroke={isSelected ? SELECTION_COLORS.STROKE : DEFAULT_RECT.STROKE}
      strokeWidth={isSelected ? SELECTION_COLORS.STROKE_WIDTH : DEFAULT_RECT.STROKE_WIDTH}
      draggable={isSelected}
      onClick={handleClick}
      onTap={handleClick} // For touch devices
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      // Visual feedback
      shadowColor={isSelected ? SELECTION_COLORS.STROKE : 'transparent'}
      shadowBlur={isSelected ? 5 : 0}
      shadowOpacity={isSelected ? 0.3 : 0}
      // Hover effects
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container()
        if (container) {
          container.style.cursor = 'pointer'
        }
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container()
        if (container) {
          container.style.cursor = 'default'
        }
      }}
    />
  )
}

export default RectangleComponent
