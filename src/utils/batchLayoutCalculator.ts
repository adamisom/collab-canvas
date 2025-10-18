/**
 * Batch Layout Calculator
 * Calculates positions for creating multiple rectangles with automatic spacing
 */

export type LayoutType = 'row' | 'column' | 'grid'

export interface Position {
  x: number
  y: number
}

export interface BatchLayoutOptions {
  count: number
  layout: LayoutType
  startX: number
  startY: number
  width: number
  height: number
  offset: number
}

/**
 * Calculate positions for batch rectangle creation
 * 
 * @param options - Layout configuration options
 * @returns Array of {x, y} positions for each rectangle
 * 
 * @example
 * // Create 3 rectangles in a row
 * calculateBatchLayout({
 *   count: 3,
 *   layout: 'row',
 *   startX: 100,
 *   startY: 100,
 *   width: 100,
 *   height: 80,
 *   offset: 25
 * })
 * // Returns: [{x: 100, y: 100}, {x: 225, y: 100}, {x: 350, y: 100}]
 */
export function calculateBatchLayout(options: BatchLayoutOptions): Position[] {
  const { count, layout, startX, startY, width, height, offset } = options
  const positions: Position[] = []

  if (layout === 'row') {
    // Horizontal row: increment X, keep Y constant
    for (let i = 0; i < count; i++) {
      positions.push({
        x: startX + i * (width + offset),
        y: startY
      })
    }
  } else if (layout === 'column') {
    // Vertical column: keep X constant, increment Y
    for (let i = 0; i < count; i++) {
      positions.push({
        x: startX,
        y: startY + i * (height + offset)
      })
    }
  } else {
    // Grid layout: arrange in approximately square grid
    const cols = Math.ceil(Math.sqrt(count))
    for (let i = 0; i < count; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      positions.push({
        x: startX + col * (width + offset),
        y: startY + row * (height + offset)
      })
    }
  }

  return positions
}

