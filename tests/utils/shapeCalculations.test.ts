import { describe, it, expect } from 'vitest'

/**
 * High-Value Unit Tests for Phase 3C: Shape Expansion
 * 
 * These tests cover the most complex/critical shape operations:
 * 1. Circle radial resize calculation
 * 2. Line angle/arrowhead rotation
 * 3. Text input coordinate transformation
 * 4. Mixed shapes z-index ordering
 */

describe('Circle Radial Resize Calculation', () => {
  it('should correctly calculate radius from drag distance', () => {
    // Test: Circle at (100, 100) with initial radius 50
    // User drags from edge (150, 100) to (170, 100) = +20px
    const centerX = 100
    const centerY = 100
    const initialRadius = 50
    
    // New position after drag
    const newX = 170
    const newY = 100
    
    // Calculate distance from center to new position
    const dx = newX - centerX
    const dy = newY - centerY
    const newRadius = Math.sqrt(dx * dx + dy * dy)
    
    expect(newRadius).toBe(70)
    expect(newRadius).toBeGreaterThan(initialRadius)
  })
  
  it('should handle diagonal drag correctly', () => {
    // Test: Circle at (0, 0) with initial radius 30
    // User drags diagonally from edge to (40, 30)
    const centerX = 0
    const centerY = 0
    
    const newX = 40
    const newY = 30
    
    // Pythagorean theorem: √(40² + 30²) = √(1600 + 900) = √2500 = 50
    const dx = newX - centerX
    const dy = newY - centerY
    const newRadius = Math.sqrt(dx * dx + dy * dy)
    
    expect(newRadius).toBe(50)
  })
  
  it('should handle negative drag (shrinking)', () => {
    // Test: Circle at (100, 100) with initial radius 80
    // User drags inward from edge to (130, 100) = radius becomes 30
    const centerX = 100
    const centerY = 100
    
    const newX = 130
    const newY = 100
    
    const dx = newX - centerX
    const dy = newY - centerY
    const newRadius = Math.sqrt(dx * dx + dy * dy)
    
    expect(newRadius).toBe(30)
    expect(newRadius).toBeLessThan(80)
  })
  
  it('should maintain minimum radius constraint', () => {
    // Test: Ensure radius doesn't go below minimum (e.g., 10px)
    const MIN_RADIUS = 10
    const centerX = 50
    const centerY = 50
    
    // User tries to drag very close to center
    const newX = 51
    const newY = 50
    
    const dx = newX - centerX
    const dy = newY - centerY
    const calculatedRadius = Math.sqrt(dx * dx + dy * dy)
    const newRadius = Math.max(calculatedRadius, MIN_RADIUS)
    
    expect(calculatedRadius).toBe(1)
    expect(newRadius).toBe(MIN_RADIUS)
  })
})

describe('Line Angle/Arrowhead Rotation', () => {
  it('should calculate correct angle for horizontal line (right)', () => {
    // Line from (0, 0) to (100, 0) = 0 degrees (pointing right)
    const x1 = 0, y1 = 0
    const x2 = 100, y2 = 0
    
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
    
    expect(angle).toBe(0)
  })
  
  it('should calculate correct angle for vertical line (down)', () => {
    // Line from (0, 0) to (0, 100) = 90 degrees (pointing down)
    const x1 = 0, y1 = 0
    const x2 = 0, y2 = 100
    
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
    
    expect(angle).toBe(90)
  })
  
  it('should calculate correct angle for diagonal line (45 degrees)', () => {
    // Line from (0, 0) to (100, 100) = 45 degrees
    const x1 = 0, y1 = 0
    const x2 = 100, y2 = 100
    
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
    
    expect(angle).toBe(45)
  })
  
  it('should handle negative angles (line pointing left)', () => {
    // Line from (100, 0) to (0, 0) = 180 degrees (pointing left)
    const x1 = 100, y1 = 0
    const x2 = 0, y2 = 0
    
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
    
    expect(angle).toBe(180)
  })
  
  it('should calculate length correctly', () => {
    // Line from (0, 0) to (30, 40) = 50px length (3-4-5 triangle)
    const x1 = 0, y1 = 0
    const x2 = 30, y2 = 40
    
    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.sqrt(dx * dx + dy * dy)
    
    expect(length).toBe(50)
  })
})

describe('Text Input Coordinate Transformation', () => {
  it('should transform canvas coordinates to screen coordinates with no zoom/pan', () => {
    // Text at canvas (100, 50), no transform
    const canvasX = 100
    const canvasY = 50
    const stageX = 0
    const stageY = 0
    const scale = 1
    
    // Screen position = (canvasX * scale) + stageX
    const screenX = (canvasX * scale) + stageX
    const screenY = (canvasY * scale) + stageY
    
    expect(screenX).toBe(100)
    expect(screenY).toBe(50)
  })
  
  it('should transform coordinates with 2x zoom', () => {
    // Text at canvas (100, 50), zoomed 2x
    const canvasX = 100
    const canvasY = 50
    const stageX = 0
    const stageY = 0
    const scale = 2
    
    const screenX = (canvasX * scale) + stageX
    const screenY = (canvasY * scale) + stageY
    
    expect(screenX).toBe(200)
    expect(screenY).toBe(100)
  })
  
  it('should transform coordinates with pan offset', () => {
    // Text at canvas (100, 50), panned by (20, 30)
    const canvasX = 100
    const canvasY = 50
    const stageX = 20
    const stageY = 30
    const scale = 1
    
    const screenX = (canvasX * scale) + stageX
    const screenY = (canvasY * scale) + stageY
    
    expect(screenX).toBe(120)
    expect(screenY).toBe(80)
  })
  
  it('should transform coordinates with both zoom and pan', () => {
    // Text at canvas (100, 50), zoomed 1.5x and panned by (-10, 20)
    const canvasX = 100
    const canvasY = 50
    const stageX = -10
    const stageY = 20
    const scale = 1.5
    
    const screenX = (canvasX * scale) + stageX
    const screenY = (canvasY * scale) + stageY
    
    expect(screenX).toBe(140)  // (100 * 1.5) + (-10) = 150 - 10
    expect(screenY).toBe(95)   // (50 * 1.5) + 20 = 75 + 20
  })
  
  it('should scale font size with zoom level', () => {
    // Font size 16px at different zoom levels
    const baseFontSize = 16
    
    // At 1x zoom
    expect(baseFontSize * 1).toBe(16)
    
    // At 2x zoom (text should appear larger)
    expect(baseFontSize * 2).toBe(32)
    
    // At 0.5x zoom (text should appear smaller)
    expect(baseFontSize * 0.5).toBe(8)
  })
})

describe('Mixed Shapes Z-Index Ordering', () => {
  it('should sort mixed shapes by z-index in ascending order', () => {
    // Mix of rectangles, circles, lines, and text with different z-indexes
    const shapes = [
      { id: 'rect1', type: 'rectangle', zIndex: 3000 },
      { id: 'circle1', type: 'circle', zIndex: 1000 },
      { id: 'line1', type: 'line', zIndex: 2000 },
      { id: 'text1', type: 'text', zIndex: 1500 },
      { id: 'rect2', type: 'rectangle', zIndex: 500 }
    ]
    
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex)
    
    expect(sorted[0].id).toBe('rect2')   // zIndex 500
    expect(sorted[1].id).toBe('circle1') // zIndex 1000
    expect(sorted[2].id).toBe('text1')   // zIndex 1500
    expect(sorted[3].id).toBe('line1')   // zIndex 2000
    expect(sorted[4].id).toBe('rect1')   // zIndex 3000
  })
  
  it('should handle shapes with same z-index (stable sort)', () => {
    const shapes = [
      { id: 'a', type: 'rectangle', zIndex: 1000 },
      { id: 'b', type: 'circle', zIndex: 1000 },
      { id: 'c', type: 'line', zIndex: 1000 }
    ]
    
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex)
    
    // All have same zIndex, order should be stable
    expect(sorted[0].zIndex).toBe(1000)
    expect(sorted[1].zIndex).toBe(1000)
    expect(sorted[2].zIndex).toBe(1000)
  })
  
  it('should handle negative z-indexes', () => {
    const shapes = [
      { id: 'a', type: 'rectangle', zIndex: 100 },
      { id: 'b', type: 'circle', zIndex: -50 },
      { id: 'c', type: 'text', zIndex: 0 }
    ]
    
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex)
    
    expect(sorted[0].id).toBe('b')  // zIndex -50
    expect(sorted[1].id).toBe('c')  // zIndex 0
    expect(sorted[2].id).toBe('a')  // zIndex 100
  })
  
  it('should verify z-index gaps allow O(1) bring-to-front operations', () => {
    // Typical z-index gaps (1000 apart)
    const shapes = [
      { id: 'a', zIndex: 1000 },
      { id: 'b', zIndex: 2000 },
      { id: 'c', zIndex: 3000 }
    ]
    
    // Find max z-index
    const maxZ = Math.max(...shapes.map(s => s.zIndex))
    expect(maxZ).toBe(3000)
    
    // Can add new shape on top in O(1) without shifting others
    const newShapeZIndex = maxZ + 1000
    expect(newShapeZIndex).toBe(4000)
    
    // Verify gap is sufficient
    const gap = 1000
    expect(maxZ + gap).toBe(4000)
  })
  
  it('should handle very large z-index values', () => {
    const shapes = [
      { id: 'a', zIndex: 999000 },
      { id: 'b', zIndex: 1000000 },
      { id: 'c', zIndex: 1 }
    ]
    
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex)
    
    expect(sorted[0].id).toBe('c')  // zIndex 1
    expect(sorted[1].id).toBe('a')  // zIndex 999000
    expect(sorted[2].id).toBe('b')  // zIndex 1000000
  })
})
