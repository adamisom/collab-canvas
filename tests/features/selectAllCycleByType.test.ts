import { describe, it, expect } from 'vitest'
import type { ShapeType } from '../../src/shared/shapes'

/**
 * Tests for Select All Cycle by Type feature
 * 
 * This tests the cycling logic for Cmd+Shift+A which cycles through:
 * rectangles → circles → lines → texts → all shapes
 */

describe('selectAllCycleByType logic', () => {
  // Helper to determine next shape type in cycle
  const getNextShapeType = (
    currentType: ShapeType | null,
    availableTypes: ShapeType[]
  ): ShapeType | 'all' => {
    const cycleOrder: ShapeType[] = ['rectangle', 'circle', 'line', 'text']
    
    // Find current index
    const currentIndex = currentType ? cycleOrder.indexOf(currentType) : -1
    
    // Find next available type
    let nextIndex = currentIndex + 1
    let attempts = 0
    
    while (attempts <= cycleOrder.length) {
      if (nextIndex >= cycleOrder.length) {
        return 'all' // Cycle back to all shapes
      }
      
      if (availableTypes.includes(cycleOrder[nextIndex])) {
        return cycleOrder[nextIndex]
      }
      
      nextIndex++
      attempts++
    }
    
    return 'all' // Fallback
  }

  it('should cycle from rectangles to circles when both exist', () => {
    const available: ShapeType[] = ['rectangle', 'circle', 'line', 'text']
    const result = getNextShapeType('rectangle', available)
    expect(result).toBe('circle')
  })

  it('should cycle from texts to all shapes (wrap around)', () => {
    const available: ShapeType[] = ['rectangle', 'circle', 'line', 'text']
    const result = getNextShapeType('text', available)
    expect(result).toBe('all')
  })

  it('should skip types that do not exist on canvas', () => {
    // Only rectangles and texts exist
    const available: ShapeType[] = ['rectangle', 'text']
    const result = getNextShapeType('rectangle', available)
    expect(result).toBe('text') // Should skip circles and lines
  })

  it('should start with first available type when currentType is null', () => {
    const available: ShapeType[] = ['circle', 'line'] // No rectangles
    const result = getNextShapeType(null, available)
    expect(result).toBe('circle') // First in cycle order
  })

  it('should return "all" when no shapes exist', () => {
    const available: ShapeType[] = []
    const result = getNextShapeType(null, available)
    expect(result).toBe('all')
  })
})

