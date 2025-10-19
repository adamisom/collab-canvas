import type { Shape } from '../shared/shapes'
import { getShapeBounds, type Bounds } from './shapeHelpers'

/**
 * Helper to calculate position for a shape based on alignment type
 * Handles the different coordinate systems for line/circle/rectangle shapes
 */
const calculatePositionForShapeType = (
  shape: Shape,
  bounds: Bounds,
  targetValue: number,
  axis: 'x' | 'y',
  offset: 'start' | 'center' | 'end'
): { x?: number, y?: number, endX?: number, endY?: number } => {
  const isHorizontal = axis === 'x'
  const dimension = isHorizontal ? bounds.width : bounds.height
  const boundsStart = isHorizontal ? bounds.x : bounds.y
  
  // Calculate target position based on offset type
  let targetPosition: number
  switch (offset) {
    case 'start':
      targetPosition = targetValue
      break
    case 'center':
      targetPosition = targetValue
      break
    case 'end':
      targetPosition = targetValue
      break
  }
  
  // Handle different shape types
  if (shape.type === 'line') {
    // Lines: translate both start and end points
    const delta = targetPosition - boundsStart - (offset === 'center' ? dimension / 2 : offset === 'end' ? dimension : 0)
    if (isHorizontal) {
      return { x: shape.x + delta, endX: shape.endX + delta }
    } else {
      return { y: shape.y + delta, endY: shape.endY + delta }
    }
  } else if (shape.type === 'circle') {
    // Circles: position is center, adjust for offset
    const adjustment = offset === 'start' ? dimension / 2 : offset === 'end' ? -dimension / 2 : 0
    return isHorizontal 
      ? { x: targetPosition + adjustment }
      : { y: targetPosition + adjustment }
  } else {
    // Rectangles/Text: position is top-left, adjust for offset
    const adjustment = offset === 'center' ? -dimension / 2 : offset === 'end' ? -dimension : 0
    return isHorizontal
      ? { x: targetPosition + adjustment }
      : { y: targetPosition + adjustment }
  }
}

// Calculate new position for shape after alignment
export const calculateAlignedPosition = (
  shape: Shape,
  targetValue: number,
  alignType: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom'
): { x?: number, y?: number, endX?: number, endY?: number } => {
  const bounds = getShapeBounds(shape)
  
  switch (alignType) {
    case 'left':
      return calculatePositionForShapeType(shape, bounds, targetValue, 'x', 'start')
    case 'center-horizontal':
      return calculatePositionForShapeType(shape, bounds, targetValue, 'x', 'center')
    case 'right':
      return calculatePositionForShapeType(shape, bounds, targetValue, 'x', 'end')
    case 'top':
      return calculatePositionForShapeType(shape, bounds, targetValue, 'y', 'start')
    case 'center-vertical':
      return calculatePositionForShapeType(shape, bounds, targetValue, 'y', 'center')
    case 'bottom':
      return calculatePositionForShapeType(shape, bounds, targetValue, 'y', 'end')
  }
}

/**
 * Helper to calculate distributed position for a single shape
 */
const calculateDistributedPositionForShape = (
  shape: Shape,
  bounds: Bounds,
  targetPosition: number,
  isHorizontal: boolean
): { x?: number, y?: number, endX?: number, endY?: number } => {
  const delta = targetPosition - (isHorizontal ? bounds.x : bounds.y)
  
  if (shape.type === 'line') {
    // Lines: translate both start and end points
    return isHorizontal
      ? { x: shape.x + delta, endX: shape.endX + delta }
      : { y: shape.y + delta, endY: shape.endY + delta }
  } else if (shape.type === 'circle') {
    // Circles: position is center, adjust by half dimension
    const adjustment = (isHorizontal ? bounds.width : bounds.height) / 2
    return isHorizontal
      ? { x: targetPosition + adjustment }
      : { y: targetPosition + adjustment }
  } else {
    // Rectangles/Text: position is top-left
    return isHorizontal
      ? { x: targetPosition }
      : { y: targetPosition }
  }
}

// Calculate positions for distribution
export const calculateDistributedPositions = (
  shapes: Shape[],
  direction: 'horizontal' | 'vertical'
): Map<string, { x?: number, y?: number, endX?: number, endY?: number }> => {
  const positions = new Map()
  
  if (shapes.length < 3) return positions
  
  const isHorizontal = direction === 'horizontal'
  
  // Sort shapes by position
  const sorted = [...shapes].sort((a, b) => {
    const boundsA = getShapeBounds(a)
    const boundsB = getShapeBounds(b)
    return isHorizontal 
      ? boundsA.x - boundsB.x 
      : boundsA.y - boundsB.y
  })
  
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const firstBounds = getShapeBounds(first)
  const lastBounds = getShapeBounds(last)
  
  // Calculate total available space
  const totalSpace = isHorizontal
    ? (lastBounds.x + lastBounds.width) - firstBounds.x
    : (lastBounds.y + lastBounds.height) - firstBounds.y
  
  // Calculate space occupied by shapes
  const totalShapeSize = sorted.reduce((sum, shape) => {
    const bounds = getShapeBounds(shape)
    return sum + (isHorizontal ? bounds.width : bounds.height)
  }, 0)
  
  // Calculate gap between shapes
  const gap = (totalSpace - totalShapeSize) / (sorted.length - 1)
  
  // Position each shape
  let currentPosition = isHorizontal ? firstBounds.x : firstBounds.y
  
  sorted.forEach((shape) => {
    const bounds = getShapeBounds(shape)
    const position = calculateDistributedPositionForShape(shape, bounds, currentPosition, isHorizontal)
    positions.set(shape.id, position)
    currentPosition += (isHorizontal ? bounds.width : bounds.height) + gap
  })
  
  return positions
}

