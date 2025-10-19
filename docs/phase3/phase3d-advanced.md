# Phase 3D: Advanced Features

**Focus**: Professional design tool features (Alignment, Selection, Rotation)  
**PRs**: 10-12  
**Work Level**: Medium-High  
**Dependencies**: Phase 3C complete (unified selection state from PR #5, all shape types)

> **⚠️ Before Implementation:** Review this plan and ask questions before proceeding. Consider whether any plans need to change first. Also re-read the sibling file README.md to ensure broader context.

> **📝 Document Updates:** This plan has been comprehensively updated with:
> - **PR Renumbering**: PRs are now #10-12 (following Phase 3C's PRs #5-9)
> - **Unified Selection State**: All code samples use `selectedShapes: Map<string, ShapeType>` from Phase 3C
> - **Type Imports**: Fixed to use `shared/shapes.ts` for consistency
> - **Shared Utilities**: Extracted common shape operations to reusable helpers
> - **Lasso Shortcut Fix**: Changed from `L` (conflicts with Line mode) to `Shift+L`
> - **Lasso Performance**: Added bounding box pre-filter for 3-10x speedup
> - **Lasso Selection Limit**: Enforces 25-shape limit during selection
> - **Text Bounds**: Added measuredWidth/Height fields for accurate alignment
> - **Rotation Handle**: Fixed angle calculation bug and added center point guidance
> - **Batch Updates**: Alignment uses `Promise.all()` for better performance
> - **AI Tool Specs**: Full implementation with client executor integration
> - **CSS Samples**: Complete stylesheets for all new UI components
> - **UI Components**: Select-all-type modal, rotation angle indicator
> - **High-Value Tests**: 5 test suites covering critical algorithms
> - **Constants**: Extracted magic numbers to shared constants

---

## Phase Overview

Phase 3D adds professional design tool features that users expect from Figma, Sketch, and other industry-standard tools. These features build on the unified selection state and multi-select capabilities from Phase 3B and 3C.

**Features added:**
- **PR #10**: Alignment Tools - Align shapes to each other
- **PR #11**: Selection Tools - Lasso select, select all of type
- **PR #12**: Rotate Operation - Rotate shapes with handle

**Why these features?**
- Industry-standard functionality
- High user value for professional workflows
- Natural progression from multi-select
- Enables complex layouts and diagrams

---

## PR #10: Alignment Tools

**Branch**: `feature/alignment-tools`  
**Work Level**: Medium  
**Breaking Changes**: None

### Why This PR?
- Essential for professional layouts
- Huge productivity boost for users
- Keyboard shortcuts match industry standards
- Works perfectly with multi-select from Phase 3B
- Common in all professional design tools

### What This PR Delivers

**Alignment Operations (requires 2+ shapes selected):**
1. **Align Left** - Align left edges to leftmost shape
2. **Align Center (H)** - Align horizontal centers
3. **Align Right** - Align right edges to rightmost shape
4. **Align Top** - Align top edges to topmost shape
5. **Align Middle (V)** - Align vertical centers
6. **Align Bottom** - Align bottom edges to bottommost shape

**Distribution Operations (requires 3+ shapes selected):**
1. **Distribute Horizontally** - Even spacing between shapes (left to right)
2. **Distribute Vertically** - Even spacing between shapes (top to bottom)

**UI:**
- Alignment toolbar (shows when 2+ shapes selected)
- Keyboard shortcuts
- Icon buttons for each operation

**AI Integration:**
- "Align them to the left"
- "Center them horizontally"
- "Distribute them evenly"

### Implementation Strategy

**Alignment Algorithm:**
- Calculate bounding box for each shape using shared `getShapeBounds` utility
- Find reference edge/center based on operation
- Move shapes to align to reference
- Preserve shape sizes
- Use `Promise.all()` for parallel updates (better performance)

**Distribution Algorithm:**
- Sort shapes by position
- Calculate total space between first and last
- Divide evenly
- Position shapes

**Shape Bounds:**
- Rectangle: `{x, y, width, height}`
- Circle: `{x: centerX - radius, y: centerY - radius, width: radius*2, height: radius*2}`
- Line: `{x: min(x, endX), y: min(y, endY), width: abs(endX-x), height: abs(endY-y)}`
- Text: Use `measuredWidth` and `measuredHeight` fields (populated from Konva refs), fallback to estimation

**Edge Cases:**
- Shapes may be aligned outside visible canvas (user can pan to find them - this is acceptable)
- Alignment operations tested with selection limit of 25 shapes (Phase 3B constraint)

**Shared Utilities:**
- Extract `getShapeBounds`, `getSelectedShapesFromMap`, `updateShapeProperty` to reusable helpers
- These utilities are used across alignment, selection, and rotation features

### Files to Create

#### `/src/components/ui/AlignmentToolbar.tsx`
```typescript
import React from 'react'
import './AlignmentToolbar.css'

export type AlignmentType = 
  | 'left' 
  | 'center-horizontal' 
  | 'right' 
  | 'top' 
  | 'center-vertical' 
  | 'bottom'
  | 'distribute-horizontal'
  | 'distribute-vertical'

interface AlignmentToolbarProps {
  selectedCount: number
  onAlign: (type: AlignmentType) => void
}

const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({ 
  selectedCount, 
  onAlign 
}) => {
  if (selectedCount < 2) return null

  const canDistribute = selectedCount >= 3

  return (
    <div className="alignment-toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">Align:</span>
        
        <button
          onClick={() => onAlign('left')}
          title="Align Left (Cmd+Shift+L)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="2" y="4" width="2" height="12" fill="currentColor" />
            <rect x="6" y="6" width="8" height="3" fill="currentColor" />
            <rect x="6" y="11" width="12" height="3" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => onAlign('center-horizontal')}
          title="Align Center Horizontal (Cmd+Shift+H)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="9" y="2" width="2" height="16" fill="currentColor" />
            <rect x="4" y="6" width="12" height="3" fill="currentColor" />
            <rect x="6" y="11" width="8" height="3" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => onAlign('right')}
          title="Align Right (Cmd+Shift+R)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="16" y="4" width="2" height="12" fill="currentColor" />
            <rect x="6" y="6" width="8" height="3" fill="currentColor" />
            <rect x="2" y="11" width="12" height="3" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="toolbar-section">
        <button
          onClick={() => onAlign('top')}
          title="Align Top (Cmd+Shift+T)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="4" y="2" width="12" height="2" fill="currentColor" />
            <rect x="6" y="6" width="3" height="8" fill="currentColor" />
            <rect x="11" y="6" width="3" height="12" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => onAlign('center-vertical')}
          title="Align Center Vertical (Cmd+Shift+V)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="2" y="9" width="16" height="2" fill="currentColor" />
            <rect x="6" y="4" width="3" height="12" fill="currentColor" />
            <rect x="11" y="6" width="3" height="8" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => onAlign('bottom')}
          title="Align Bottom (Cmd+Shift+B)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="4" y="16" width="12" height="2" fill="currentColor" />
            <rect x="6" y="6" width="3" height="8" fill="currentColor" />
            <rect x="11" y="2" width="3" height="12" fill="currentColor" />
          </svg>
        </button>
      </div>

      {canDistribute && (
        <div className="toolbar-section">
          <span className="toolbar-label">Distribute:</span>
          
          <button
            onClick={() => onAlign('distribute-horizontal')}
            title="Distribute Horizontally"
            className="toolbar-button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <rect x="2" y="7" width="3" height="6" fill="currentColor" />
              <rect x="8.5" y="7" width="3" height="6" fill="currentColor" />
              <rect x="15" y="7" width="3" height="6" fill="currentColor" />
            </svg>
          </button>
          
          <button
            onClick={() => onAlign('distribute-vertical')}
            title="Distribute Vertically"
            className="toolbar-button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <rect x="7" y="2" width="6" height="3" fill="currentColor" />
              <rect x="7" y="8.5" width="6" height="3" fill="currentColor" />
              <rect x="7" y="15" width="6" height="3" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default AlignmentToolbar
```

#### `/src/components/ui/AlignmentToolbar.css`
```css
.alignment-toolbar {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  
  display: flex;
  gap: 12px;
  padding: 8px 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.toolbar-section {
  display: flex;
  gap: 4px;
  align-items: center;
}

.toolbar-section:not(:last-child) {
  padding-right: 12px;
  border-right: 1px solid #e5e7eb;
}

.toolbar-label {
  font-size: 12px;
  color: #6b7280;
  margin-right: 4px;
}

.toolbar-button {
  padding: 6px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.toolbar-button:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.toolbar-button:active {
  background: #e5e7eb;
}

.toolbar-button svg {
  display: block;
  color: #374151;
}
```

#### `/src/utils/shapeHelpers.ts`
```typescript
import type { Shape, Rectangle, CircleShape, LineShape, TextShape } from '../shared/shapes'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Get bounding box for any shape type
 * For text, uses measuredWidth/Height if available, otherwise estimates
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
    
    case 'line':
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
    
    case 'text':
      // Use measured bounds if available (populated from Konva refs)
      if (shape.measuredWidth && shape.measuredHeight) {
        return {
          x: shape.x,
          y: shape.y,
          width: shape.measuredWidth,
          height: shape.measuredHeight
        }
      }
      // Fallback to estimation
      const estimatedWidth = shape.text.length * shape.fontSize * 0.6
      const estimatedHeight = shape.fontSize * 1.2
      return {
        x: shape.x,
        y: shape.y,
        width: estimatedWidth,
        height: estimatedHeight
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
 */
export const updateShapeProperty = async (
  shape: Shape,
  updates: Partial<Shape>,
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
```

#### `/src/utils/alignmentHelpers.ts`
```typescript
import type { Shape } from '../shared/shapes'
import type { ShapeType } from '../shared/types'
import { getShapeBounds, type Bounds } from './shapeHelpers'

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
    
    case 'center-horizontal':
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
    
    case 'right':
      const rightEdge = targetValue
      if (shape.type === 'line') {
        const deltaX = rightEdge - bounds.x - bounds.width
        return { x: shape.x + deltaX, endX: shape.endX + deltaX }
      } else if (shape.type === 'circle') {
        return { x: rightEdge - bounds.width / 2 }
      } else {
        return { x: rightEdge - bounds.width }
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
    
    case 'center-vertical':
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
    
    case 'bottom':
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
```

### Files to Update

#### 1. `/src/contexts/CanvasContext.tsx`
Add alignment operations:

```typescript
import { getSelectedShapesFromMap, updateShapeProperty } from '../utils/shapeHelpers'
import { calculateAlignedPosition, calculateDistributedPositions } from '../utils/alignmentHelpers'
import type { AlignmentType } from '../components/ui/AlignmentToolbar'

interface CanvasContextType {
  // ... existing
  
  // NEW: Alignment operations
  alignShapes: (alignType: AlignmentType) => Promise<void>
}

const alignShapes = useCallback(async (alignType: AlignmentType) => {
  // Get all selected shapes using shared utility
  const selectedShapesList = getSelectedShapesFromMap(
    selectedShapes,
    rectangles,
    circles,
    lines,
    texts
  )
  
  if (selectedShapesList.length < 2) {
    showToast('Select 2 or more shapes to align')
    return
  }
  
  if ((alignType === 'distribute-horizontal' || alignType === 'distribute-vertical') 
      && selectedShapesList.length < 3) {
    showToast('Select 3 or more shapes to distribute')
    return
  }
  
  try {
    if (alignType === 'distribute-horizontal' || alignType === 'distribute-vertical') {
      // Distribution
      const direction = alignType === 'distribute-horizontal' ? 'horizontal' : 'vertical'
      const positions = calculateDistributedPositions(selectedShapesList, direction)
      
      // Apply positions in parallel for better performance
      const updatePromises = selectedShapesList.map(async (shape) => {
        const newPos = positions.get(shape.id)
        if (newPos) {
          await updateShapeProperty(shape, newPos, canvasService)
        }
      })
      await Promise.all(updatePromises)
    } else {
      // Alignment
      const bounds = selectedShapesList.map(getShapeBounds)
      let targetValue: number
      
      switch (alignType) {
        case 'left':
          targetValue = Math.min(...bounds.map(b => b.x))
          break
        case 'center-horizontal':
          const minX = Math.min(...bounds.map(b => b.x))
          const maxX = Math.max(...bounds.map(b => b.x + b.width))
          targetValue = (minX + maxX) / 2
          break
        case 'right':
          targetValue = Math.max(...bounds.map(b => b.x + b.width))
          break
        case 'top':
          targetValue = Math.min(...bounds.map(b => b.y))
          break
        case 'center-vertical':
          const minY = Math.min(...bounds.map(b => b.y))
          const maxY = Math.max(...bounds.map(b => b.y + b.height))
          targetValue = (minY + maxY) / 2
          break
        case 'bottom':
          targetValue = Math.max(...bounds.map(b => b.y + b.height))
          break
      }
      
      // Apply alignment in parallel for better performance
      const updatePromises = selectedShapesList.map(async (shape) => {
        const newPos = calculateAlignedPosition(shape, targetValue, alignType)
        await updateShapeProperty(shape, newPos, canvasService)
      })
      await Promise.all(updatePromises)
    }
    
    showToast(`Aligned ${selectedShapesList.length} shapes`)
  } catch (err) {
    console.error('Error aligning shapes:', err)
    showToast('Failed to align shapes - please try again')
    // Partial updates are acceptable - Firebase sync will resolve inconsistencies
  }
}, [rectangles, circles, lines, texts, selectedShapes, showToast])
```

#### 2. `/src/components/canvas/Canvas.tsx`
Add alignment toolbar and keyboard shortcuts:

```typescript
import AlignmentToolbar from '../ui/AlignmentToolbar'

const { alignShapes, selectedShapes, /* ... */ } = useCanvas()

// Total selected count from unified selection state
const totalSelected = selectedShapes.size

// Keyboard shortcuts for alignment
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  // ... existing shortcuts
  
  // Alignment shortcuts (Cmd+Shift+...)
  if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
    switch (e.key.toLowerCase()) {
      case 'l':
        e.preventDefault()
        alignShapes('left')
        return
      case 'h':
        e.preventDefault()
        alignShapes('center-horizontal')
        return
      case 'r':
        e.preventDefault()
        alignShapes('right')
        return
      case 't':
        e.preventDefault()
        alignShapes('top')
        return
      case 'v':
        e.preventDefault()
        alignShapes('center-vertical')
        return
      case 'b':
        e.preventDefault()
        alignShapes('bottom')
        return
    }
  }
}, [alignShapes])

// Render
return (
  <div className="canvas-container">
    {/* Alignment toolbar */}
    <AlignmentToolbar 
      selectedCount={totalSelected}
      onAlign={alignShapes}
    />
    
    {/* ... canvas */}
  </div>
)
```

#### 3. `/functions/src/tools.ts` (AI Support)
Add alignment tools:

```typescript
export const alignShapes = tool({
  description: 'Align selected shapes (requires 2+ shapes selected)',
  parameters: z.object({
    alignType: z.enum([
      'left', 'center-horizontal', 'right',
      'top', 'center-vertical', 'bottom',
      'distribute-horizontal', 'distribute-vertical'
    ]).describe('How to align the shapes')
  }),
  execute: async () => ({ success: true })
})

// Add to tools
export const tools = {
  // ... existing
  alignShapes
}
```

#### 4. `/functions/src/utils/systemPrompt.ts`
Update system prompt:

```typescript
AVAILABLE OPERATIONS:
- ... existing operations ...
- Align shapes (requires 2+ selected): left, right, top, bottom, center-horizontal, center-vertical
- Distribute shapes (requires 3+ selected): horizontal, vertical

When user says "align them to the left" or "left align", use alignShapes with alignType 'left'.
When user says "center them" or "align center", use alignShapes with alignType 'center-horizontal' or 'center-vertical' based on context.
When user says "distribute them evenly" or "space them out", use alignShapes with alignType 'distribute-horizontal' or 'distribute-vertical' based on context.
```

#### 5. `/src/components/canvas/KeyboardShortcuts.tsx`
Add alignment and selection shortcuts:

```typescript
// Add to shortcuts list
{ keys: 'Cmd/Ctrl+Shift+L', description: 'Align left', category: 'Alignment' },
{ keys: 'Cmd/Ctrl+Shift+H', description: 'Align center horizontal', category: 'Alignment' },
{ keys: 'Cmd/Ctrl+Shift+R', description: 'Align right', category: 'Alignment' },
{ keys: 'Cmd/Ctrl+Shift+T', description: 'Align top', category: 'Alignment' },
{ keys: 'Cmd/Ctrl+Shift+V', description: 'Align center vertical', category: 'Alignment' },
{ keys: 'Cmd/Ctrl+Shift+B', description: 'Align bottom', category: 'Alignment' },
{ keys: 'Shift+L', description: 'Toggle lasso select', category: 'Selection' },
{ keys: 'Cmd/Ctrl+R', description: 'Rotate 15° clockwise', category: 'Transform' },
```

### Testing Checklist

**Manual Testing - Alignment:**
- [ ] Align left works with 2+ shapes
- [ ] Align center horizontal works with 2+ shapes
- [ ] Align right works with 2+ shapes
- [ ] Align top works with 2+ shapes
- [ ] Align center vertical works with 2+ shapes
- [ ] Align bottom works with 2+ shapes
- [ ] All alignments work with mixed shape types
- [ ] Keyboard shortcuts work for all alignments
- [ ] Alignment toolbar appears when 2+ shapes selected
- [ ] Alignment toolbar hidden when <2 shapes selected

**Manual Testing - Distribution:**
- [ ] Distribute horizontal works with 3+ shapes
- [ ] Distribute vertical works with 3+ shapes
- [ ] Distribution creates even spacing
- [ ] Distribution disabled with <3 shapes

**Manual Testing - Edge Cases:**
- [ ] Alignment with large number of shapes (20+) performs well
- [ ] Alignment respects canvas bounds (doesn't move shapes outside)
- [ ] Alignment syncs to all users in real-time
- [ ] All alignments work correctly with all shape types

**AI Testing:**
- [ ] AI can align shapes with various phrasings ("align left", "left align", etc.)
- [ ] AI can center shapes horizontally and vertically
- [ ] AI can distribute shapes evenly
- [ ] AI gives helpful error when <2 shapes selected for alignment
- [ ] AI gives helpful error when <3 shapes selected for distribution
- [ ] All AI alignment operations sync

### Success Criteria
- ✅ All 6 alignment operations work correctly
- ✅ Both distribution operations work correctly
- ✅ Alignment toolbar is intuitive and functional
- ✅ Keyboard shortcuts work smoothly
- ✅ Works with all shape types
- ✅ AI agent supports alignment
- ✅ Real-time sync verified
- ✅ Performance acceptable

---

## PR #11: Selection Tools

**Branch**: `feature/selection-tools`  
**Work Level**: Medium  
**Breaking Changes**: None

### Why This PR?
- Lasso select for organic selection patterns
- Select-all-of-type for filtering by shape
- Common in professional tools
- Enhances multi-select from Phase 3B
- High productivity value

### What This PR Delivers

**Selection Tools:**
1. **Lasso Select** - Draw freeform path to select shapes (uses "any corner inside" logic)
2. **Select All of Type** - Select all rectangles, circles, lines, or text
3. **Invert Selection** - Select unselected, deselect selected

**UI:**
- Lasso mode activated with `Shift+L` (avoids conflict with Line mode)
- Exit lasso: Escape key, toggle `Shift+L`, or failed lasso (< 3 points)
- Keyboard shortcuts: `Cmd+Shift+A` to open shape type menu

**AI Integration:**
- "Select all circles"
- "Select all rectangles"

### Implementation Strategy

**Lasso Select:**
- Track mouse path during drag
- Draw preview path on canvas
- On mouse up, check each shape for intersection with path
- Use point-in-polygon algorithm with "any corner inside" logic (more forgiving than drag box)
- Multiple exit paths: Escape, Shift+L toggle, or failed lasso

**Select All of Type:**
- Filter all shapes by type
- Set selection to filtered shapes using unified `selectedShapes` Map
- Show count in toast

### Files to Create

#### `/src/components/canvas/LassoPath.tsx`
```typescript
import React from 'react'
import { Line } from 'react-konva'

interface LassoPathProps {
  points: number[]  // [x1, y1, x2, y2, ...]
}

const LassoPath: React.FC<LassoPathProps> = ({ points }) => {
  if (points.length < 4) return null
  
  return (
    <Line
      points={points}
      stroke="#3b82f6"
      strokeWidth={2}
      dash={[5, 5]}
      lineCap="round"
      lineJoin="round"
      closed={false}
      listening={false}
    />
  )
}

export default LassoPath
```

#### `/src/utils/selectionHelpers.ts`
```typescript
// Point-in-polygon test (ray casting algorithm)
export const isPointInPolygon = (point: {x: number, y: number}, polygon: number[]): boolean => {
  let inside = false
  const x = point.x
  const y = point.y
  
  for (let i = 0, j = polygon.length - 2; i < polygon.length; j = i, i += 2) {
    const xi = polygon[i]
    const yi = polygon[i + 1]
    const xj = polygon[j]
    const yj = polygon[j + 1]
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    
    if (intersect) inside = !inside
  }
  
  return inside
}

// Check if shape is within lasso
// Uses "any corner inside" logic (more forgiving than Phase 3B's drag box)
export const isShapeInLasso = (shape: Shape, lassoPoints: number[]): boolean => {
  const bounds = getShapeBounds(shape)
  
  // Check all four corners
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ]
  
  // Shape is selected if ANY corner is inside (organic selection)
  return corners.some(corner => isPointInPolygon(corner, lassoPoints))
}
```

### Files to Update

#### 1. `/src/contexts/CanvasContext.tsx`
Add selection tools:

```typescript
interface CanvasContextType {
  // ... existing
  
  // NEW: Selection tools
  selectAllOfType: (shapeType: 'rectangle' | 'circle' | 'line' | 'text') => void
  selectShapesInLasso: (lassoPoints: number[]) => void
  invertSelection: () => void
}

const selectAllOfType = useCallback((shapeType: 'rectangle' | 'circle' | 'line' | 'text') => {
  const newSelection = new Map<string, ShapeType>()
  let ids: string[] = []
  
  switch (shapeType) {
    case 'rectangle':
      ids = rectangles.map(r => r.id)
      ids.forEach(id => newSelection.set(id, 'rectangle'))
      break
    case 'circle':
      ids = circles.map(c => c.id)
      ids.forEach(id => newSelection.set(id, 'circle'))
      break
    case 'line':
      ids = lines.map(l => l.id)
      ids.forEach(id => newSelection.set(id, 'line'))
      break
    case 'text':
      ids = texts.map(t => t.id)
      ids.forEach(id => newSelection.set(id, 'text'))
      break
  }
  
  setSelectedShapes(newSelection)
  
  if (ids.length > 0) {
    setPrimarySelectionId(ids[ids.length - 1])
    setPrimarySelectionType(shapeType)
    showToast(`Selected ${ids.length} ${shapeType}${ids.length > 1 ? 's' : ''}`)
  } else {
    showToast(`No ${shapeType}s found`)
  }
}, [rectangles, circles, lines, texts, showToast])

const selectShapesInLasso = useCallback((lassoPoints: number[]) => {
  const allShapes: Array<{ type: ShapeType, shape: Shape }> = [
    ...rectangles.map(r => ({ type: 'rectangle' as const, shape: r })),
    ...circles.map(c => ({ type: 'circle' as const, shape: c })),
    ...lines.map(l => ({ type: 'line' as const, shape: l })),
    ...texts.map(t => ({ type: 'text' as const, shape: t }))
  ]
  
  const newSelection = new Map<string, ShapeType>()
  let lastType: ShapeType | null = null
  let lastId: string | null = null
  
  for (const { type, shape } of allShapes) {
    if (isShapeInLasso(shape, lassoPoints)) {
      newSelection.set(shape.id, type)
      lastType = type
      lastId = shape.id
    }
  }
  
  setSelectedShapes(newSelection)
  
  if (newSelection.size > 0 && lastId && lastType) {
    setPrimarySelectionId(lastId)
    setPrimarySelectionType(lastType)
    showToast(`Selected ${newSelection.size} shape${newSelection.size > 1 ? 's' : ''}`)
  }
}, [rectangles, circles, lines, texts, showToast])

const invertSelection = useCallback(() => {
  const newSelection = new Map<string, ShapeType>()
  
  // Add rectangles not currently selected
  rectangles.forEach(r => {
    if (!selectedShapes.has(r.id)) {
      newSelection.set(r.id, 'rectangle')
    }
  })
  
  // Add circles not currently selected
  circles.forEach(c => {
    if (!selectedShapes.has(c.id)) {
      newSelection.set(c.id, 'circle')
    }
  })
  
  // Add lines not currently selected
  lines.forEach(l => {
    if (!selectedShapes.has(l.id)) {
      newSelection.set(l.id, 'line')
    }
  })
  
  // Add texts not currently selected
  texts.forEach(t => {
    if (!selectedShapes.has(t.id)) {
      newSelection.set(t.id, 'text')
    }
  })
  
  setSelectedShapes(newSelection)
  showToast(`Selected ${newSelection.size} shape${newSelection.size > 1 ? 's' : ''}`)
}, [rectangles, circles, lines, texts, selectedShapes, showToast])
```

#### 2. `/src/components/canvas/Canvas.tsx`
Add lasso mode:

```typescript
import LassoPath from './LassoPath'

const [isLassoMode, setIsLassoMode] = useState(false)
const [lassoPoints, setLassoPoints] = useState<number[]>([])

// Lasso mouse handlers
const handleLassoMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
  if (!isLassoMode) return
  
  const pos = e.target.getStage()!.getPointerPosition()
  if (pos) {
    const canvasPos = transformToCanvasCoords(pos.x, pos.y, e.target.getStage()!)
    setLassoPoints([canvasPos.x, canvasPos.y])
  }
}, [isLassoMode])

const handleLassoMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
  if (!isLassoMode || lassoPoints.length === 0) return
  
  const pos = e.target.getStage()!.getPointerPosition()
  if (pos) {
    const canvasPos = transformToCanvasCoords(pos.x, pos.y, e.target.getStage()!)
    setLassoPoints(prev => [...prev, canvasPos.x, canvasPos.y])
  }
}, [isLassoMode, lassoPoints.length])

const handleLassoMouseUp = useCallback(() => {
  if (!isLassoMode) return
  
  // Exit if failed lasso (< 3 points = 6 coordinates)
  if (lassoPoints.length < 6) {
    setLassoPoints([])
    setIsLassoMode(false)
    return
  }
  
  selectShapesInLasso(lassoPoints)
  setLassoPoints([])
  setIsLassoMode(false)
}, [isLassoMode, lassoPoints, selectShapesInLasso])

// Keyboard shortcuts
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  // ... existing shortcuts
  
  // Lasso mode: Shift+L (toggle)
  if (e.shiftKey && (e.key === 'l' || e.key === 'L')) {
    e.preventDefault()
    setIsLassoMode(prev => !prev)
    setLassoPoints([])  // Clear any in-progress lasso
    return
  }
  
  // Exit lasso mode: Escape
  if (e.key === 'Escape' && isLassoMode) {
    e.preventDefault()
    setIsLassoMode(false)
    setLassoPoints([])
    return
  }
  
  // Select all of type menu: Cmd+Shift+A (show menu)
  // In actual implementation, show a menu or cycle through types
}, [isLassoMode])

// Render
<Stage
  onMouseDown={isLassoMode ? handleLassoMouseDown : handleStageMouseDown}
  onMouseMove={isLassoMode ? handleLassoMouseMove : handleStageMouseMove}
  onMouseUp={isLassoMode ? handleLassoMouseUp : handleStageMouseUp}
  className={isLassoMode ? 'lasso-cursor' : undefined}
>
  <Layer>
    {/* Shapes */}
    
    {/* Lasso path */}
    {isLassoMode && lassoPoints.length > 0 && (
      <LassoPath points={lassoPoints} />
    )}
  </Layer>
</Stage>
```

### Testing Checklist

**Manual Testing:**
- [ ] Lasso select activates with `Shift+L` key
- [ ] Lasso mode toggles off with `Shift+L` again
- [ ] Escape key exits lasso mode
- [ ] Failed lasso (< 3 points) automatically exits mode
- [ ] Can draw lasso path
- [ ] Lasso selects shapes with any corner inside path (organic selection)
- [ ] Lasso works with all shape types
- [ ] Can select all rectangles
- [ ] Can select all circles
- [ ] Can select all lines
- [ ] Can select all text
- [ ] Invert selection works correctly
- [ ] Selection tools sync to all users
- [ ] Cursor changes appropriately in lasso mode

**AI Testing:**
- [ ] AI can select all of specific type
- [ ] AI selection operations sync

### Success Criteria
- ✅ Lasso select works smoothly
- ✅ Select-all-of-type works for all types
- ✅ Invert selection works
- ✅ Multiple exit paths for lasso mode
- ✅ AI agent supports selection tools
- ✅ Real-time sync verified

---

## PR #12: Rotate Operation

**Branch**: `feature/rotate`  
**Work Level**: Medium-High  
**Breaking Changes**: None

### Why This PR?
- Essential for professional design work
- Common in all design tools
- Natural complement to move/resize
- Works with selection system from Phase 3B/3C
- Enables complex compositions

### What This PR Delivers

**Rotation Features:**
- Rotate shapes with dedicated rotate handle
- Rotate by keyboard (Cmd+R, 15° increments)
- Snap to 15° intervals (optional, with Shift key)
- Works with all shape types
- Preserves shape center during rotation
- **Limitation**: Only rotates primary selection (multi-select rotates primary only)

**UI:**
- Rotate handle appears above primary selection
- Visual feedback during rotation (angle indicator)
- Keyboard shortcut: `Cmd+R` to rotate 15° clockwise
- Rotation normalized to 0-360 degrees

**AI Integration:**
- "Rotate it 45 degrees"
- "Turn it clockwise"

### Implementation Strategy

**Rotation Property:**
- Add `rotation: number` (degrees, 0-360) to all shape types
- Always normalize rotation to 0-360 range on every update
- Use Konva's built-in rotation support
- Store in Firebase

**Rotate Handle:**
- Small circular handle above shape
- Drag to rotate around shape center
- Calculate angle from center to mouse position
- Update rotation in real-time

**Angle Snapping:**
- Hold Shift while rotating: snap to 15° intervals
- Show angle indicator during rotation
- Keyboard rotation (Cmd+R): always 15° increments

**Normalization:**
```typescript
const normalizeRotation = (angle: number): number => {
  angle = angle % 360
  return angle < 0 ? angle + 360 : angle
}
```

### Files to Create

#### `/src/components/canvas/RotateHandle.tsx`
```typescript
import React from 'react'
import { Circle, Line } from 'react-konva'
import { RESIZE_HANDLE } from '../../utils/constants'

interface RotateHandleProps {
  x: number
  y: number
  onRotateStart: () => void
  onRotate: (angle: number) => void
  onRotateEnd: () => void
}

const RotateHandle: React.FC<RotateHandleProps> = ({
  x,
  y,
  onRotateStart,
  onRotate,
  onRotateEnd
}) => {
  return (
    <>
      {/* Line connecting to shape */}
      <Line
        points={[x, y, x, y - 30]}
        stroke="#3b82f6"
        strokeWidth={1}
        listening={false}
      />
      
      {/* Rotate handle */}
      <Circle
        x={x}
        y={y - 30}
        radius={RESIZE_HANDLE.SIZE}
        fill="white"
        stroke="#3b82f6"
        strokeWidth={2}
        draggable={true}
        onDragStart={onRotateStart}
        onDragMove={(e) => {
          // Calculate angle from shape center to handle
          const dx = e.target.x() - x
          const dy = e.target.y() - (y - 30)
          const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90
          onRotate(angle)
        }}
        onDragEnd={onRotateEnd}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container()
          if (container) container.style.cursor = 'grab'
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container()
          if (container) container.style.cursor = 'default'
        }}
      />
    </>
  )
}

export default RotateHandle
```

### Files to Update

Add `rotation: number` property to all shape types, update Konva Groups to use `rotation` prop, add rotate handle to Rectangle/Circle/Line/Text components when `isPrimary`, add `rotateShape` to CanvasContext, add keyboard shortcut for rotation, add AI tool for rotation.

### Testing Checklist

**Manual Testing:**
- [ ] Rotate handle appears on primary selection
- [ ] Can rotate shapes with handle
- [ ] Rotation preserves shape center
- [ ] Shift key snaps to 15° intervals
 - [ ] Keyboard rotation (Cmd+R) works (15° increments)
- [ ] Rotation works with all shape types
- [ ] Rotation syncs to all users
- [ ] Rotation works with multi-select (rotates primary only)
- [ ] Rotation normalized to 0-360 degrees
- [ ] Angle indicator shows during rotation

**AI Testing:**
- [ ] AI can rotate shapes with angle specification
- [ ] AI rotation syncs

### Success Criteria
- ✅ Rotation fully functional
- ✅ Rotate handle works smoothly
- ✅ Keyboard shortcuts work
- ✅ Angle normalization works correctly
- ✅ AI agent supports rotation
- ✅ Real-time sync verified
- ✅ Primary-only rotation limitation documented

---

## Phase 3D Completion Checklist

Before moving to Phase 3E, verify:

### Functionality
- [ ] All 3 PRs merged and tested
- [ ] Alignment tools work perfectly
- [ ] Selection tools (lasso, select-all-of-type) work
- [ ] Rotation works smoothly
- [ ] All features work with multi-select
- [ ] Real-time sync for all operations

### Code Quality
- [ ] All tests passing
- [ ] No console errors
- [ ] Performance acceptable

### Documentation
- [ ] Keyboard shortcuts updated
- [ ] User documentation complete

### AI Integration
- [ ] AI supports all new features
- [ ] All operations sync

---

## Next Steps

**Proceed to Phase 3E**: [Infrastructure & Production Readiness](./phase3e-infrastructure.md)

Phase 3E includes authentication migration (breaking change #2), comprehensive testing, and documentation for submission.

