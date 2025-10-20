import type { Shape, Rectangle, CircleShape, LineShape, TextShape, ShapeType } from '../shared/shapes'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Get bounding box for any shape type
 * For text, uses measuredWidth/Height from Firebase (populated via debounced Konva measurements)
 * Falls back to estimation if measurements unavailable
 */
export const getShapeBounds = (shape: Shape): Bounds => {
  switch (shape.type) {
    case 'rectangle':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height
      }
    
    case 'circle':
      return {
        x: shape.x - shape.radius,
        y: shape.y - shape.radius,
        width: shape.radius * 2,
        height: shape.radius * 2
      }
    
    case 'line': {
      const minX = Math.min(shape.x, shape.endX)
      const maxX = Math.max(shape.x, shape.endX)
      const minY = Math.min(shape.y, shape.endY)
      const maxY = Math.max(shape.y, shape.endY)
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    }
    
    case 'text': {
      // Use measured bounds if available (persisted to Firebase for cross-user consistency)
      if (shape.measuredWidth && shape.measuredHeight) {
        return {
          x: shape.x,
          y: shape.y,
          width: shape.measuredWidth,
          height: shape.measuredHeight
        }
      }
      // Fallback to estimation if not yet measured
      const estimatedWidth = shape.text.length * shape.fontSize * 0.6
      const estimatedHeight = shape.fontSize * 1.2
      return {
        x: shape.x,
        y: shape.y,
        width: estimatedWidth,
        height: estimatedHeight
      }
    }
    
    default:
      return { x: 0, y: 0, width: 0, height: 0 }
  }
}

/**
 * Get center point for a shape (used for rotation handle positioning)
 */
export const getShapeCenter = (shape: Shape): { x: number, y: number } => {
  const bounds = getShapeBounds(shape)
  
  // Circle center is stored directly
  if (shape.type === 'circle') {
    return { x: shape.x, y: shape.y }
  }
  
  // For other shapes, calculate from bounds
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  }
}

/**
 * Retrieve selected shapes from unified selection Map
 */
export const getSelectedShapesFromMap = (
  selectedShapes: Map<string, ShapeType>,
  rectangles: Rectangle[],
  circles: CircleShape[],
  lines: LineShape[],
  texts: TextShape[]
): Shape[] => {
  const result: Shape[] = []
  
  selectedShapes.forEach((shapeType, shapeId) => {
    let shape: Shape | undefined
    switch (shapeType) {
      case 'rectangle':
        shape = rectangles.find(r => r.id === shapeId)
        break
      case 'circle':
        shape = circles.find(c => c.id === shapeId)
        break
      case 'line':
        shape = lines.find(l => l.id === shapeId)
        break
      case 'text':
        shape = texts.find(t => t.id === shapeId)
        break
    }
    if (shape) result.push(shape)
  })
  
  return result
}

/**
 * Update any shape's properties via appropriate service method
 * Using eslint-disable to bypass strict type checking for the generic service parameter
 */
export const updateShapeProperty = async (
  shape: Shape,
  updates: Partial<Shape>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvasService: any
): Promise<void> => {
  switch (shape.type) {
    case 'rectangle':
      await canvasService.updateRectangle(shape.id, updates)
      break
    case 'circle':
      await canvasService.updateCircle(shape.id, updates)
      break
    case 'line':
      await canvasService.updateLine(shape.id, updates)
      break
    case 'text':
      await canvasService.updateText(shape.id, updates)
      break
  }
}

