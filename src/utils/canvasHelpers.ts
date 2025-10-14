import { CANVAS_BOUNDS, DEFAULT_RECT, RECTANGLE_CONSTRAINTS, RESIZE_DIRECTIONS } from './constants'

// Generate unique IDs for rectangles (Firebase push generates these automatically)
export const generateRectangleId = (): string => {
  return `rect_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// Validate rectangle bounds
export const isWithinCanvasBounds = (x: number, y: number, width?: number, height?: number): boolean => {
  const w = width || 0
  const h = height || 0
  
  return (
    x >= CANVAS_BOUNDS.MIN_X &&
    y >= CANVAS_BOUNDS.MIN_Y &&
    x + w <= CANVAS_BOUNDS.MAX_X &&
    y + h <= CANVAS_BOUNDS.MAX_Y
  )
}

// Constrain rectangle to canvas bounds
export const constrainToCanvas = (x: number, y: number, width: number, height: number) => {
  return {
    x: Math.max(CANVAS_BOUNDS.MIN_X, Math.min(x, CANVAS_BOUNDS.MAX_X - width)),
    y: Math.max(CANVAS_BOUNDS.MIN_Y, Math.min(y, CANVAS_BOUNDS.MAX_Y - height)),
    width,
    height
  }
}

// Validate and constrain rectangle dimensions
export const validateAndConstrainDimensions = (width: number, height: number) => {
  return {
    width: Math.max(RECTANGLE_CONSTRAINTS.MIN_WIDTH, Math.min(width, RECTANGLE_CONSTRAINTS.MAX_WIDTH)),
    height: Math.max(RECTANGLE_CONSTRAINTS.MIN_HEIGHT, Math.min(height, RECTANGLE_CONSTRAINTS.MAX_HEIGHT))
  }
}

// Calculate resize handle positions for a rectangle
export const calculateResizeHandlePositions = (x: number, y: number, width: number, height: number) => {
  return {
    [RESIZE_DIRECTIONS.TOP_LEFT]: { x, y },
    [RESIZE_DIRECTIONS.TOP_CENTER]: { x: x + width / 2, y },
    [RESIZE_DIRECTIONS.TOP_RIGHT]: { x: x + width, y },
    [RESIZE_DIRECTIONS.MIDDLE_LEFT]: { x, y: y + height / 2 },
    [RESIZE_DIRECTIONS.MIDDLE_RIGHT]: { x: x + width, y: y + height / 2 },
    [RESIZE_DIRECTIONS.BOTTOM_LEFT]: { x, y: y + height },
    [RESIZE_DIRECTIONS.BOTTOM_CENTER]: { x: x + width / 2, y: y + height },
    [RESIZE_DIRECTIONS.BOTTOM_RIGHT]: { x: x + width, y: y + height }
  }
}

// Calculate new rectangle dimensions based on resize direction and delta
export const calculateResizeUpdate = (
  direction: string,
  currentX: number,
  currentY: number,
  currentWidth: number,
  currentHeight: number,
  deltaX: number,
  deltaY: number
) => {
  let newX = currentX
  let newY = currentY
  let newWidth = currentWidth
  let newHeight = currentHeight

  switch (direction) {
    case RESIZE_DIRECTIONS.TOP_LEFT:
      newX = currentX + deltaX
      newY = currentY + deltaY
      newWidth = currentWidth - deltaX
      newHeight = currentHeight - deltaY
      break
    case RESIZE_DIRECTIONS.TOP_CENTER:
      newY = currentY + deltaY
      newHeight = currentHeight - deltaY
      break
    case RESIZE_DIRECTIONS.TOP_RIGHT:
      newY = currentY + deltaY
      newWidth = currentWidth + deltaX
      newHeight = currentHeight - deltaY
      break
    case RESIZE_DIRECTIONS.MIDDLE_LEFT:
      newX = currentX + deltaX
      newWidth = currentWidth - deltaX
      break
    case RESIZE_DIRECTIONS.MIDDLE_RIGHT:
      newWidth = currentWidth + deltaX
      break
    case RESIZE_DIRECTIONS.BOTTOM_LEFT:
      newX = currentX + deltaX
      newWidth = currentWidth - deltaX
      newHeight = currentHeight + deltaY
      break
    case RESIZE_DIRECTIONS.BOTTOM_CENTER:
      newHeight = currentHeight + deltaY
      break
    case RESIZE_DIRECTIONS.BOTTOM_RIGHT:
      newWidth = currentWidth + deltaX
      newHeight = currentHeight + deltaY
      break
  }

  // Validate and constrain dimensions
  const constrainedDimensions = validateAndConstrainDimensions(newWidth, newHeight)
  
  // Adjust position if dimensions were constrained (for left/top handles)
  if (direction.includes('l')) { // left handles
    newX = currentX + currentWidth - constrainedDimensions.width
  }
  if (direction.includes('t')) { // top handles
    newY = currentY + currentHeight - constrainedDimensions.height
  }

  // Ensure rectangle stays within canvas bounds
  const constrainedBounds = constrainToCanvas(newX, newY, constrainedDimensions.width, constrainedDimensions.height)

  return constrainedBounds
}

// Calculate distance between two points
export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

// Check if a point is within a rectangle
export const isPointInRectangle = (
  pointX: number, 
  pointY: number, 
  rectX: number, 
  rectY: number, 
  rectWidth: number, 
  rectHeight: number
): boolean => {
  return (
    pointX >= rectX &&
    pointX <= rectX + rectWidth &&
    pointY >= rectY &&
    pointY <= rectY + rectHeight
  )
}

// Create default rectangle at given position
export const createDefaultRectangle = (x: number, y: number, createdBy: string) => {
  const constrained = constrainToCanvas(x, y, DEFAULT_RECT.WIDTH, DEFAULT_RECT.HEIGHT)
  
  return {
    x: constrained.x,
    y: constrained.y,
    width: DEFAULT_RECT.WIDTH,
    height: DEFAULT_RECT.HEIGHT,
    createdBy
  }
}

// Throttle function for performance optimization
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: number | null = null
  let lastExecTime = 0
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTime > delay) {
      func.apply(null, args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        func.apply(null, args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}

// Debounce function for performance optimization
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: number | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      func.apply(null, args)
    }, delay)
  }
}

// Format timestamp for display
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

// Validate rectangle dimensions
export const validateRectangleDimensions = (width: number, height: number): boolean => {
  return width > 0 && height > 0 && width <= CANVAS_BOUNDS.MAX_X && height <= CANVAS_BOUNDS.MAX_Y
}
