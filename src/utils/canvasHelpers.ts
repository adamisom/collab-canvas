import { CANVAS_BOUNDS, DEFAULT_RECT } from './constants'

// Generate unique IDs for rectangles
export const generateRectangleId = (): string => {
  return `rect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
