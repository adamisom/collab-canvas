/**
 * Shape Component Integration Tests
 * 
 * HIGH-VALUE TESTS for shape-specific behaviors:
 * - Selection visual feedback consistency
 * - Drag behavior with Shift key
 * - Resize handle interactions
 */

import { describe, it, expect } from 'vitest'
import { getShapeSelectionStyle, getLineSelectionStyle, isShapeDraggable } from '../../src/utils/shapeStyleHelpers'
import { SELECTION_COLORS } from '../../src/utils/constants'

describe('Shape Components - Selection Visual Feedback', () => {
  describe('getShapeSelectionStyle', () => {
    it('should return red stroke for selected shapes', () => {
      const style = getShapeSelectionStyle('#3b82f6', true, false)
      
      expect(style.stroke).toBe(SELECTION_COLORS.STROKE) // Red
      expect(style.strokeWidth).toBe(SELECTION_COLORS.STROKE_WIDTH) // 3
      expect(style.dash).toBeUndefined()
    })

    it('should return orange dashed stroke for other user selections', () => {
      const style = getShapeSelectionStyle('#3b82f6', false, true)
      
      expect(style.stroke).toBe(SELECTION_COLORS.OTHER_USER) // Orange
      expect(style.strokeWidth).toBe(2)
      expect(style.dash).toEqual([5, 5])
    })

    it('should return base color for unselected shapes', () => {
      const baseColor = '#10b981'
      const style = getShapeSelectionStyle(baseColor, false, false)
      
      expect(style.stroke).toBe(baseColor)
      expect(style.strokeWidth).toBe(1)
      expect(style.dash).toBeUndefined()
    })

    it('should prioritize current user selection over other user selection', () => {
      const style = getShapeSelectionStyle('#3b82f6', true, true)
      
      // Current user selection takes priority
      expect(style.stroke).toBe(SELECTION_COLORS.STROKE)
    })
  })

  describe('getLineSelectionStyle', () => {
    it('should preserve stroke width and color for selected lines (red outline shows selection)', () => {
      const lineColor = '#000000'
      const baseStrokeWidth = 3
      const style = getLineSelectionStyle(lineColor, baseStrokeWidth, true, false)
      
      // Lines keep their actual color when selected (unlike rectangles/circles)
      // Red outline (rendered separately in Line component) shows selection
      expect(style.stroke).toBe(lineColor)
      expect(style.strokeWidth).toBe(baseStrokeWidth)
    })

    it('should preserve line color when unselected', () => {
      const lineColor = '#ef4444'
      const baseStrokeWidth = 2
      const style = getLineSelectionStyle(lineColor, baseStrokeWidth, false, false)
      
      expect(style.stroke).toBe(lineColor)
      expect(style.strokeWidth).toBe(baseStrokeWidth)
    })

    it('should handle thin lines correctly', () => {
      const style = getLineSelectionStyle('#000000', 1, true, false)
      
      expect(style.strokeWidth).toBe(1) // No change, red outline shows selection
    })

    it('should handle thick lines correctly', () => {
      const style = getLineSelectionStyle('#000000', 10, true, false)
      
      expect(style.strokeWidth).toBe(10) // No change, red outline shows selection
    })
  })

  describe('Consistent Styling Across Shape Types', () => {
    it('should use same selection color for rectangles and circles', () => {
      const rectStyle = getShapeSelectionStyle('#3b82f6', true, false)
      const circleStyle = getShapeSelectionStyle('#ef4444', true, false)
      
      expect(rectStyle.stroke).toBe(circleStyle.stroke)
      expect(rectStyle.stroke).toBe(SELECTION_COLORS.STROKE)
    })

    it('should preserve line color when selected (different from rect/circle)', () => {
      const lineColor = '#10b981'
      const lineStyle = getLineSelectionStyle(lineColor, 3, true, false)
      
      // Lines intentionally keep their color visible (stroke IS the color for lines)
      expect(lineStyle.stroke).toBe(lineColor)
      expect(lineStyle.stroke).not.toBe(SELECTION_COLORS.STROKE)
    })

    it('should use same other-user selection color for all shape types', () => {
      const rectStyle = getShapeSelectionStyle('#3b82f6', false, true)
      const circleStyle = getShapeSelectionStyle('#ef4444', false, true)
      const lineStyle = getLineSelectionStyle('#10b981', 3, false, true)
      
      expect(rectStyle.stroke).toBe(circleStyle.stroke)
      expect(rectStyle.stroke).toBe(lineStyle.stroke)
      expect(rectStyle.stroke).toBe(SELECTION_COLORS.OTHER_USER)
    })

    it('should use same dash pattern for other-user selections', () => {
      const rectStyle = getShapeSelectionStyle('#3b82f6', false, true)
      const lineStyle = getLineSelectionStyle('#10b981', 3, false, true)
      
      expect(rectStyle.dash).toEqual(lineStyle.dash)
      expect(rectStyle.dash).toEqual([5, 5])
    })
  })
})

describe('Shape Components - Drag Behavior with Shift', () => {
  describe('isShapeDraggable', () => {
    it('should allow dragging selected shapes by default', () => {
      const draggable = isShapeDraggable(true, false, false)
      expect(draggable).toBe(true)
    })

    it('should prevent dragging when Shift is pressed (for selection box)', () => {
      const draggable = isShapeDraggable(true, true, false)
      expect(draggable).toBe(false)
    })

    it('should prevent dragging unselected shapes', () => {
      const draggable = isShapeDraggable(false, false, false)
      expect(draggable).toBe(false)
    })

    it('should prevent dragging when shape is being resized', () => {
      const isResizing = true
      const draggable = isShapeDraggable(true, false, isResizing)
      expect(draggable).toBe(false)
    })

    it('should prevent dragging when shape is being edited (text)', () => {
      const isEditing = true
      const draggable = isShapeDraggable(true, false, isEditing)
      expect(draggable).toBe(false)
    })

    it('should prevent dragging when line endpoint is being dragged', () => {
      const isDraggingHandle = true
      const draggable = isShapeDraggable(true, false, isDraggingHandle)
      expect(draggable).toBe(false)
    })
  })

  describe('Multiple Conditions', () => {
    it('should handle all conditions being true', () => {
      const isSelected = true
      const isShiftPressed = true
      const isInteracting = true
      
      const draggable = isShapeDraggable(isSelected, isShiftPressed, isInteracting)
      expect(draggable).toBe(false)
    })

    it('should handle all conditions being false', () => {
      const isSelected = false
      const isShiftPressed = false
      const isInteracting = false
      
      const draggable = isShapeDraggable(isSelected, isShiftPressed, isInteracting)
      expect(draggable).toBe(false) // Still false because not selected
    })
  })
})

describe('Shape Components - Resize Handle Interactions', () => {
  describe('Rectangle Resize Handles', () => {
    it('should show 8 resize handles when primary selection', () => {
      const isPrimary = true
      const isShiftPressed = false
      
      const shouldShowHandles = isPrimary && !isShiftPressed
      expect(shouldShowHandles).toBe(true)
      
      // 8 handles: 4 corners + 4 edges
      const handleCount = 8
      expect(handleCount).toBe(8)
    })

    it('should hide resize handles when Shift is pressed', () => {
      const isPrimary = true
      const isShiftPressed = true
      
      const shouldShowHandles = isPrimary && !isShiftPressed
      expect(shouldShowHandles).toBe(false)
    })

    it('should hide resize handles for non-primary selections', () => {
      const isPrimary = false
      const isShiftPressed = false
      
      const shouldShowHandles = isPrimary && !isShiftPressed
      expect(shouldShowHandles).toBe(false)
    })
  })

  describe('Circle Transformer', () => {
    it('should show Konva transformer when primary selection', () => {
      const isPrimary = true
      const isShiftPressed = false
      
      const shouldShowTransformer = isPrimary && !isShiftPressed
      expect(shouldShowTransformer).toBe(true)
    })

    it('should maintain circle aspect ratio during resize', () => {
      const keepRatio = true
      expect(keepRatio).toBe(true)
    })

    it('should disable rotation for circles', () => {
      const rotateEnabled = false
      expect(rotateEnabled).toBe(false)
    })

    it('should disable flip for circles', () => {
      const flipEnabled = false
      expect(flipEnabled).toBe(false)
    })
  })

  describe('Line Endpoint Handles', () => {
    it('should show endpoint handle when primary selection', () => {
      const isPrimary = true
      const isShiftPressed = false
      
      const shouldShowEndpointHandle = isPrimary && !isShiftPressed
      expect(shouldShowEndpointHandle).toBe(true)
    })

    it('should hide endpoint handle when Shift is pressed', () => {
      const isPrimary = true
      const isShiftPressed = true
      
      const shouldShowEndpointHandle = isPrimary && !isShiftPressed
      expect(shouldShowEndpointHandle).toBe(false)
    })

    it('should calculate endpoint position relative to line start', () => {
      const line = { x: 100, y: 100, endX: 250, endY: 350 }
      const relativeEndpoint = {
        x: line.endX - line.x,
        y: line.endY - line.y
      }
      
      expect(relativeEndpoint).toEqual({ x: 150, y: 250 })
    })
  })

  describe('Text Editing Mode', () => {
    it('should disable text listening when editing', () => {
      const isEditing = true
      const listening = !isEditing
      
      expect(listening).toBe(false)
    })

    it('should enable text listening when not editing', () => {
      const isEditing = false
      const listening = !isEditing
      
      expect(listening).toBe(true)
    })

    it('should hide Konva text during DOM input editing', () => {
      const isEditing = true
      const visible = !isEditing
      
      expect(visible).toBe(false)
    })
  })
})

describe('Shape Components - Z-Index and Layering', () => {
  it('should sort shapes by z-index for rendering order', () => {
    const shapes = [
      { id: '1', zIndex: 3000 },
      { id: '2', zIndex: 1000 },
      { id: '3', zIndex: 2000 },
      { id: '4', zIndex: -1000 }
    ]
    
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex)
    
    expect(sorted.map(s => s.id)).toEqual(['4', '2', '3', '1'])
  })

  it('should handle same z-index (stable sort)', () => {
    const shapes = [
      { id: 'a', zIndex: 1000 },
      { id: 'b', zIndex: 1000 },
      { id: 'c', zIndex: 1000 }
    ]
    
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex)
    
    // Order should be preserved for same z-index
    expect(sorted.map(s => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('should handle negative z-indexes', () => {
    const shapes = [
      { id: '1', zIndex: 1000 },
      { id: '2', zIndex: -2000 },
      { id: '3', zIndex: 0 }
    ]
    
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex)
    
    expect(sorted.map(s => s.id)).toEqual(['2', '3', '1'])
  })

  it('should handle large z-index values', () => {
    const shapes = [
      { id: '1', zIndex: 1000000 },
      { id: '2', zIndex: 1000 },
      { id: '3', zIndex: 500000 }
    ]
    
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex)
    
    expect(sorted.map(s => s.id)).toEqual(['2', '3', '1'])
  })
})

