import type { Shape } from '../shared/shapes'
import { getShapeBounds, type Bounds } from './shapeHelpers'
import { INTERACTION_CONSTANTS } from './constants'

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param point - Point to test {x, y}
 * @param polygonPoints - Flat array of polygon coordinates [x1, y1, x2, y2, ...]
 * @returns true if point is inside polygon
 */
export const isPointInPolygon = (
  point: { x: number; y: number },
  polygonPoints: number[]
): boolean => {
  if (polygonPoints.length < 6) return false // Need at least 3 points (6 coordinates)

  let inside = false
  const { x, y } = point

  // Convert flat array to point pairs
  for (let i = 0, j = polygonPoints.length - 2; i < polygonPoints.length; i += 2) {
    const xi = polygonPoints[i]
    const yi = polygonPoints[i + 1]
    const xj = polygonPoints[j]
    const yj = polygonPoints[j + 1]

    // Ray casting: count intersections with edges
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside

    j = i
  }

  return inside
}

/**
 * Get bounding box for lasso path (for performance pre-filtering)
 */
export const getLassoBoundingBox = (lassoPoints: number[]): Bounds | null => {
  if (lassoPoints.length < INTERACTION_CONSTANTS.MIN_LASSO_POINTS) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (let i = 0; i < lassoPoints.length; i += 2) {
    const x = lassoPoints[i]
    const y = lassoPoints[i + 1]
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * Check if two bounding boxes intersect
 */
export const boundsIntersect = (a: Bounds, b: Bounds): boolean => {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  )
}

/**
 * Check if a shape is inside the lasso selection
 * Uses bounding box pre-filter for performance
 */
export const isShapeInLasso = (shape: Shape, lassoPoints: number[]): boolean => {
  if (lassoPoints.length < INTERACTION_CONSTANTS.MIN_LASSO_POINTS) return false

  // Performance optimization: bounding box pre-filter
  const lassoBounds = getLassoBoundingBox(lassoPoints)
  if (!lassoBounds) return false

  const shapeBounds = getShapeBounds(shape)
  if (!boundsIntersect(shapeBounds, lassoBounds)) return false

  // Check if shape center is inside lasso
  const centerX = shapeBounds.x + shapeBounds.width / 2
  const centerY = shapeBounds.y + shapeBounds.height / 2

  return isPointInPolygon({ x: centerX, y: centerY }, lassoPoints)
}

