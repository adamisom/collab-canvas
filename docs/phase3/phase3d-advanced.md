# Phase 3D: Advanced Features

**Focus**: Professional design tool features (Alignment, Selection, Rotation)  
**PRs**: 9-11  
**Work Level**: Medium-High  
**Dependencies**: Phase 3B complete (PRs #9-10 require multi-select; PR #11 uses selection infrastructure)

> **⚠️ Before Implementation:** Review this plan and ask questions before proceeding. Consider whether any plans need to change first. Also re-read the sibling file README.md to ensure broader context.

---

## Phase Overview

Phase 3D adds professional design tool features that users expect from Figma, Sketch, and other industry-standard tools. Alignment and selection tools require multi-select from Phase 3B, while rotation works with the selection system established in Phase 3B.

**Features added:**
- **PR #9**: Alignment Tools - Align shapes to each other
- **PR #10**: Selection Tools - Lasso select, select all of type
- **PR #11**: Rotate Operation - Rotate shapes with handle

**Why these features?**
- Industry-standard functionality
- High user value for professional workflows
- Natural progression from multi-select
- Enables complex layouts and diagrams

---

## PR #9: Alignment Tools

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
- Calculate bounding box for each shape
- Find reference edge/center based on operation
- Move shapes to align to reference
- Preserve shape sizes

**Distribution Algorithm:**
- Sort shapes by position
- Calculate total space between first and last
- Divide evenly
- Position shapes

**Shape Bounds:**
- Rectangle: `{x, y, width, height}`
- Circle: `{x: centerX - radius, y: centerY - radius, width: radius*2, height: radius*2}`
- Line: `{x: min(x, endX), y: min(y, endY), width: abs(endX-x), height: abs(endY-y)}`
- Text: Use Konva's `getClientRect()` for actual text bounds

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

#### `/src/utils/alignmentHelpers.ts`
```typescript
import type { Rectangle } from '../services/canvasService'
import type { CircleShape } from '../components/canvas/Circle'
import type { LineShape } from '../components/canvas/Line'
import type { TextShape } from '../components/canvas/Text'

type Shape = Rectangle | CircleShape | LineShape | TextShape

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

// Get bounding box for any shape
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
      // For text, we'll estimate bounds based on font size
      // In actual implementation, use Konva's getClientRect()
      const textWidth = shape.text.length * shape.fontSize * 0.6
      return {
        x: shape.x,
        y: shape.y,
        width: textWidth,
        height: shape.fontSize * 1.2
      }
    
    default:
      return { x: 0, y: 0, width: 0, height: 0 }
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
interface CanvasContextType {
  // ... existing
  
  // NEW: Alignment operations
  alignShapes: (alignType: AlignmentType) => Promise<void>
}

const alignShapes = useCallback(async (alignType: AlignmentType) => {
  // Get all selected shapes
  const selectedShapes: Shape[] = [
    ...rectangles.filter(r => selectedRectangleIds.has(r.id)),
    ...circles.filter(c => selectedCircleIds.has(c.id)),
    ...lines.filter(l => selectedLineIds.has(l.id)),
    ...texts.filter(t => selectedTextIds.has(t.id))
  ]
  
  if (selectedShapes.length < 2) {
    showToast('Select 2 or more shapes to align')
    return
  }
  
  if ((alignType === 'distribute-horizontal' || alignType === 'distribute-vertical') 
      && selectedShapes.length < 3) {
    showToast('Select 3 or more shapes to distribute')
    return
  }
  
  try {
    if (alignType === 'distribute-horizontal' || alignType === 'distribute-vertical') {
      // Distribution
      const direction = alignType === 'distribute-horizontal' ? 'horizontal' : 'vertical'
      const positions = calculateDistributedPositions(selectedShapes, direction)
      
      // Apply positions
      for (const shape of selectedShapes) {
        const newPos = positions.get(shape.id)
        if (newPos) {
          await updateShapePosition(shape, newPos)
        }
      }
    } else {
      // Alignment
      const bounds = selectedShapes.map(getShapeBounds)
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
      
      // Apply alignment
      for (const shape of selectedShapes) {
        const newPos = calculateAlignedPosition(shape, targetValue, alignType)
        if (newPos) {
          await updateShapePosition(shape, newPos)
        }
      }
    }
    
    showToast(`Aligned ${selectedShapes.length} shapes`)
  } catch (err) {
    console.error('Error aligning shapes:', err)
    setError('Failed to align shapes')
  }
}, [
  rectangles, circles, lines, texts,
  selectedRectangleIds, selectedCircleIds, selectedLineIds, selectedTextIds,
  showToast
])

// Helper to update any shape's position
const updateShapePosition = async (shape: Shape, updates: any) => {
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

#### 2. `/src/components/canvas/Canvas.tsx`
Add alignment toolbar and keyboard shortcuts:

```typescript
import AlignmentToolbar from '../ui/AlignmentToolbar'

const { alignShapes, /* ... */ } = useCanvas()

const totalSelected = 
  selectedRectangleIds.size + 
  selectedCircleIds.size + 
  selectedLineIds.size + 
  selectedTextIds.size

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

#### 5. `/src/components/ui/KeyboardShortcutsModal.tsx`
Add alignment shortcuts:

```typescript
// Add to SHORTCUTS array
{ keys: 'Cmd/Ctrl+Shift+L', description: 'Align left', category: 'Alignment' },
{ keys: 'Cmd/Ctrl+Shift+H', description: 'Align center horizontal', category: 'Alignment' },
{ keys: 'Cmd/Ctrl+Shift+R', description: 'Align right', category: 'Alignment' },
{ keys: 'Cmd/Ctrl+Shift+T', description: 'Align top', category: 'Alignment' },
{ keys: 'Cmd/Ctrl+Shift+V', description: 'Align center vertical', category: 'Alignment' },
{ keys: 'Cmd/Ctrl+Shift+B', description: 'Align bottom', category: 'Alignment' },
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

## PR #10: Selection Tools

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
1. **Lasso Select** - Draw freeform path to select shapes
2. **Select All of Type** - Select all rectangles, circles, lines, or text
3. **Invert Selection** - Select unselected, deselect selected

**UI:**
- Selection tools toolbar or mode
- Keyboard shortcuts: `L` for lasso, `Cmd+Shift+A` for select all type

**AI Integration:**
- "Select all circles"
- "Select all rectangles"

### Implementation Strategy

**Lasso Select:**
- Track mouse path during drag
- Draw preview path on canvas
- On mouse up, check each shape for intersection with path
- Use point-in-polygon algorithm

**Select All of Type:**
- Filter all shapes by type
- Set selection to filtered shapes
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
export const isShapeInLasso = (shape: Shape, lassoPoints: number[]): boolean => {
  const bounds = getShapeBounds(shape)
  
  // Check if any corner is inside lasso
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ]
  
  // Shape is selected if any corner is inside
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
  let ids: string[] = []
  
  switch (shapeType) {
    case 'rectangle':
      ids = rectangles.map(r => r.id)
      setSelectedRectangleIds(new Set(ids))
      setSelectedCircleIds(new Set())
      setSelectedLineIds(new Set())
      setSelectedTextIds(new Set())
      break
    case 'circle':
      ids = circles.map(c => c.id)
      setSelectedCircleIds(new Set(ids))
      setSelectedRectangleIds(new Set())
      setSelectedLineIds(new Set())
      setSelectedTextIds(new Set())
      break
    case 'line':
      ids = lines.map(l => l.id)
      setSelectedLineIds(new Set(ids))
      setSelectedRectangleIds(new Set())
      setSelectedCircleIds(new Set())
      setSelectedTextIds(new Set())
      break
    case 'text':
      ids = texts.map(t => t.id)
      setSelectedTextIds(new Set(ids))
      setSelectedRectangleIds(new Set())
      setSelectedCircleIds(new Set())
      setSelectedLineIds(new Set())
      break
  }
  
  if (ids.length > 0) {
    setPrimarySelectionId(ids[ids.length - 1])
    setPrimarySelectionType(shapeType)
    showToast(`Selected ${ids.length} ${shapeType}${ids.length > 1 ? 's' : ''}`)
  } else {
    showToast(`No ${shapeType}s found`)
  }
}, [rectangles, circles, lines, texts, showToast])

const selectShapesInLasso = useCallback((lassoPoints: number[]) => {
  const allShapes = [
    ...rectangles.map(r => ({ type: 'rectangle' as const, shape: r })),
    ...circles.map(c => ({ type: 'circle' as const, shape: c })),
    ...lines.map(l => ({ type: 'line' as const, shape: l })),
    ...texts.map(t => ({ type: 'text' as const, shape: t }))
  ]
  
  const rectIds: string[] = []
  const circleIds: string[] = []
  const lineIds: string[] = []
  const textIds: string[] = []
  
  for (const { type, shape } of allShapes) {
    if (isShapeInLasso(shape, lassoPoints)) {
      switch (type) {
        case 'rectangle': rectIds.push(shape.id); break
        case 'circle': circleIds.push(shape.id); break
        case 'line': lineIds.push(shape.id); break
        case 'text': textIds.push(shape.id); break
      }
    }
  }
  
  setSelectedRectangleIds(new Set(rectIds))
  setSelectedCircleIds(new Set(circleIds))
  setSelectedLineIds(new Set(lineIds))
  setSelectedTextIds(new Set(textIds))
  
  const total = rectIds.length + circleIds.length + lineIds.length + textIds.length
  if (total > 0) {
    // Set primary to last selected
    if (textIds.length > 0) {
      setPrimarySelectionId(textIds[textIds.length - 1])
      setPrimarySelectionType('text')
    } else if (lineIds.length > 0) {
      setPrimarySelectionId(lineIds[lineIds.length - 1])
      setPrimarySelectionType('line')
    } else if (circleIds.length > 0) {
      setPrimarySelectionId(circleIds[circleIds.length - 1])
      setPrimarySelectionType('circle')
    } else {
      setPrimarySelectionId(rectIds[rectIds.length - 1])
      setPrimarySelectionType('rectangle')
    }
    showToast(`Selected ${total} shape${total > 1 ? 's' : ''}`)
  }
}, [rectangles, circles, lines, texts, showToast])

const invertSelection = useCallback(() => {
  // Invert each shape type selection
  const allRectIds = new Set(rectangles.map(r => r.id))
  const allCircleIds = new Set(circles.map(c => c.id))
  const allLineIds = new Set(lines.map(l => l.id))
  const allTextIds = new Set(texts.map(t => t.id))
  
  const newRectIds = new Set<string>()
  const newCircleIds = new Set<string>()
  const newLineIds = new Set<string>()
  const newTextIds = new Set<string>()
  
  allRectIds.forEach(id => { if (!selectedRectangleIds.has(id)) newRectIds.add(id) })
  allCircleIds.forEach(id => { if (!selectedCircleIds.has(id)) newCircleIds.add(id) })
  allLineIds.forEach(id => { if (!selectedLineIds.has(id)) newLineIds.add(id) })
  allTextIds.forEach(id => { if (!selectedTextIds.has(id)) newTextIds.add(id) })
  
  setSelectedRectangleIds(newRectIds)
  setSelectedCircleIds(newCircleIds)
  setSelectedLineIds(newLineIds)
  setSelectedTextIds(newTextIds)
  
  const total = newRectIds.size + newCircleIds.size + newLineIds.size + newTextIds.size
  showToast(`Selected ${total} shape${total > 1 ? 's' : ''}`)
}, [
  rectangles, circles, lines, texts,
  selectedRectangleIds, selectedCircleIds, selectedLineIds, selectedTextIds,
  showToast
])
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
    const canvasPos = transformToCanvasCoords(pos)
    setLassoPoints([canvasPos.x, canvasPos.y])
  }
}, [isLassoMode, transformToCanvasCoords])

const handleLassoMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
  if (!isLassoMode || lassoPoints.length === 0) return
  
  const pos = e.target.getStage()!.getPointerPosition()
  if (pos) {
    const canvasPos = transformToCanvasCoords(pos)
    setLassoPoints(prev => [...prev, canvasPos.x, canvasPos.y])
  }
}, [isLassoMode, lassoPoints.length, transformToCanvasCoords])

const handleLassoMouseUp = useCallback(() => {
  if (!isLassoMode || lassoPoints.length < 6) {
    setLassoPoints([])
    return
  }
  
  selectShapesInLasso(lassoPoints)
  setLassoPoints([])
  setIsLassoMode(false)
}, [isLassoMode, lassoPoints, selectShapesInLasso])

// Keyboard shortcuts
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  // ... existing
  
  // Lasso mode: L
  if (e.key === 'l' || e.key === 'L') {
    e.preventDefault()
    setIsLassoMode(true)
    return
  }
  
  // Select all of type menu: Cmd+Shift+A (show menu)
  // In actual implementation, show a menu to choose type
}, [])

// Render
<Stage
  onMouseDown={isLassoMode ? handleLassoMouseDown : handleStageMouseDown}
  onMouseMove={isLassoMode ? handleLassoMouseMove : handleStageMouseMove}
  onMouseUp={isLassoMode ? handleLassoMouseUp : handleStageMouseUp}
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
- [ ] Lasso select activates with `L` key
- [ ] Can draw lasso path
- [ ] Lasso selects shapes within path
- [ ] Lasso works with all shape types
- [ ] Can select all rectangles
- [ ] Can select all circles
- [ ] Can select all lines
- [ ] Can select all text
- [ ] Invert selection works correctly
- [ ] Selection tools sync to all users

**AI Testing:**
- [ ] AI can select all of specific type
- [ ] AI selection operations sync

### Success Criteria
- ✅ Lasso select works smoothly
- ✅ Select-all-of-type works for all types
- ✅ Invert selection works
- ✅ AI agent supports selection tools
- ✅ Real-time sync verified

---

## PR #11: Rotate Operation

**Branch**: `feature/rotate`  
**Work Level**: Medium-High  
**Breaking Changes**: None

### Why This PR?
- Essential for professional design work
- Common in all design tools
- Natural complement to move/resize
- Works great with multi-select
- Enables complex compositions

### What This PR Delivers

**Rotation Features:**
- Rotate shapes with dedicated rotate handle
- Rotate by keyboard (Cmd+R, 15° increments)
- Snap to 15° intervals (optional, with Shift key)
- Works with all shape types
- Preserves shape center during rotation

**UI:**
- Rotate handle appears above primary selection
- Visual feedback during rotation (angle indicator)
- Keyboard shortcut: `Cmd+R` to rotate 15° clockwise

**AI Integration:**
- "Rotate it 45 degrees"
- "Turn it clockwise"

### Implementation Strategy

**Rotation Property:**
- Add `rotation: number` (degrees, 0-360) to all shape types
- Use Konva's built-in rotation support
- Store in Firebase

**Rotate Handle:**
- Small circular handle above shape
- Drag to rotate around shape center
- Calculate angle from center to mouse position

**Angle Snapping:**
- Hold Shift while rotating: snap to 15° intervals
- Show angle indicator during rotation

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
- [ ] Keyboard rotation (Cmd+R) works
- [ ] Rotation works with all shape types
- [ ] Rotation syncs to all users
- [ ] Rotation works with multi-select (rotates primary only)

**AI Testing:**
- [ ] AI can rotate shapes with angle specification
- [ ] AI rotation syncs

### Success Criteria
- ✅ Rotation fully functional
- ✅ Rotate handle works smoothly
- ✅ Keyboard shortcuts work
- ✅ AI agent supports rotation
- ✅ Real-time sync verified

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

