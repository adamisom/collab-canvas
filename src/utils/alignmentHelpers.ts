import type { Shape } from '../shared/shapes'
import { getShapeBounds } from './shapeHelpers'

// Calculate new position for shape after alignment
export const calculateAlignedPosition = (
  shape: Shape,
  targetValue: number,
  alignType: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom'
): { x?: number, y?: number, endX?: number, endY?: number } => {
  const bounds = getShapeBounds(shape)
  
  switch (alignType) {
    case 'left':
      if (shape.type === 'line') {
        const deltaX = targetValue - bounds.x
        return { x: shape.x + deltaX, endX: shape.endX + deltaX }
      } else if (shape.type === 'circle') {
        return { x: targetValue + bounds.width / 2 }
      } else {
        return { x: targetValue }
      }
    
    case 'center-horizontal': {
      const centerX = targetValue
      if (shape.type === 'line') {
        const currentCenter = (shape.x + shape.endX) / 2
        const deltaX = centerX - currentCenter
        return { x: shape.x + deltaX, endX: shape.endX + deltaX }
      } else if (shape.type === 'circle') {
        return { x: centerX }
      } else {
        return { x: centerX - bounds.width / 2 }
      }
    }
    
    case 'right': {
      const rightEdge = targetValue
      if (shape.type === 'line') {
        const deltaX = rightEdge - bounds.x - bounds.width
        return { x: shape.x + deltaX, endX: shape.endX + deltaX }
      } else if (shape.type === 'circle') {
        return { x: rightEdge - bounds.width / 2 }
      } else {
        return { x: rightEdge - bounds.width }
      }
    }
    
    case 'top':
      if (shape.type === 'line') {
        const deltaY = targetValue - bounds.y
        return { y: shape.y + deltaY, endY: shape.endY + deltaY }
      } else if (shape.type === 'circle') {
        return { y: targetValue + bounds.height / 2 }
      } else {
        return { y: targetValue }
      }
    
    case 'center-vertical': {
      const centerY = targetValue
      if (shape.type === 'line') {
        const currentCenter = (shape.y + shape.endY) / 2
        const deltaY = centerY - currentCenter
        return { y: shape.y + deltaY, endY: shape.endY + deltaY }
      } else if (shape.type === 'circle') {
        return { y: centerY }
      } else {
        return { y: centerY - bounds.height / 2 }
      }
    }
    
    case 'bottom': {
      const bottomEdge = targetValue
      if (shape.type === 'line') {
        const deltaY = bottomEdge - bounds.y - bounds.height
        return { y: shape.y + deltaY, endY: shape.endY + deltaY }
      } else if (shape.type === 'circle') {
        return { y: bottomEdge - bounds.height / 2 }
      } else {
        return { y: bottomEdge - bounds.height }
      }
    }
  }
}

// Calculate positions for distribution
export const calculateDistributedPositions = (
  shapes: Shape[],
  direction: 'horizontal' | 'vertical'
): Map<string, { x?: number, y?: number, endX?: number, endY?: number }> => {
  const positions = new Map()
  
  if (shapes.length < 3) return positions
  
  // Sort shapes by position
  const sorted = [...shapes].sort((a, b) => {
    const boundsA = getShapeBounds(a)
    const boundsB = getShapeBounds(b)
    return direction === 'horizontal' 
      ? boundsA.x - boundsB.x 
      : boundsA.y - boundsB.y
  })
  
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const firstBounds = getShapeBounds(first)
  const lastBounds = getShapeBounds(last)
  
  // Calculate total available space
  const totalSpace = direction === 'horizontal'
    ? (lastBounds.x + lastBounds.width) - firstBounds.x
    : (lastBounds.y + lastBounds.height) - firstBounds.y
  
  // Calculate space occupied by shapes
  const totalShapeSize = sorted.reduce((sum, shape) => {
    const bounds = getShapeBounds(shape)
    return sum + (direction === 'horizontal' ? bounds.width : bounds.height)
  }, 0)
  
  // Calculate gap between shapes
  const gap = (totalSpace - totalShapeSize) / (sorted.length - 1)
  
  // Position each shape
  let currentPosition = direction === 'horizontal' ? firstBounds.x : firstBounds.y
  
  sorted.forEach((shape) => {
    const bounds = getShapeBounds(shape)
    
    if (direction === 'horizontal') {
      const deltaX = currentPosition - bounds.x
      if (shape.type === 'line') {
        positions.set(shape.id, { x: shape.x + deltaX, endX: shape.endX + deltaX })
      } else if (shape.type === 'circle') {
        positions.set(shape.id, { x: currentPosition + bounds.width / 2 })
      } else {
        positions.set(shape.id, { x: currentPosition })
      }
      currentPosition += bounds.width + gap
    } else {
      const deltaY = currentPosition - bounds.y
      if (shape.type === 'line') {
        positions.set(shape.id, { y: shape.y + deltaY, endY: shape.endY + deltaY })
      } else if (shape.type === 'circle') {
        positions.set(shape.id, { y: currentPosition + bounds.height / 2 })
      } else {
        positions.set(shape.id, { y: currentPosition })
      }
      currentPosition += bounds.height + gap
    }
  })
  
  return positions
}

