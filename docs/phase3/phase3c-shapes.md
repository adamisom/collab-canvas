# Phase 3C: Shape Expansion

**Focus**: Add Circle, Line, and Text shapes using separate collections  
**PRs**: 5-8  
**Work Level**: High  
**Dependencies**: Phase 3B complete (multi-select foundation)

> **⚠️ Before Implementation:** Review this plan and ask questions before proceeding. Consider whether any plans need to change first. Also re-read the sibling file README.md to ensure broader context.

---

## Key Architectural Decisions

**These decisions were made to simplify implementation and improve maintainability:**

### **1. Unified Selection State (Breaking from Phase 3B)**
- **Change**: Use `Map<string, ShapeType>` instead of separate Sets per shape type
- **Why**: Simpler state management, cleaner bulk operations, easier to add new shapes
- **Impact**: Refactor `CanvasContext` selection state in PR #5

### **2. Unified Clipboard with Discriminated Union**
- **Change**: `clipboardShapes: Shape[]` instead of `clipboardRectangles: Rectangle[]`
- **Why**: Enables copy/paste across different shape types
- **Impact**: Update clipboard logic in PR #5

### **3. Shape Mode Selector - Design for All 4 Shapes Upfront**
- **Change**: Design UI for Rectangle, Circle, Line, Text in PR #5 (disable Line/Text initially)
- **Why**: Avoid redesigning UI 3 times, better UX consistency
- **Impact**: More comprehensive UI in PR #5, but saves rework later

### **4. Text Editing: DOM Input Overlay**
- **Choice**: Use positioned `<input>` element over canvas (not Konva's built-in editable text)
- **Why**: Better UX (native keyboard, standard behavior), worth the extra complexity
- **Simplifications**: 
  - Disable pan/zoom during editing (simpler positioning)
  - Fixed font size initially (no zoom scaling)
  - Single line only (`<input>` not `<textarea>`)
  - Basic styling (don't perfectly match canvas text at first)
- **Complexity**: ~30 lines of code with simplifications (vs ~15 with Konva editable)
- **Gotchas**: Coordinate transformation, cleanup on unmount, z-index management

### **5. Future Migration Path**
- **Note**: Phase 3C uses **separate collections** (`/rectangles`, `/circles`, `/lines`, `/texts`)
- **Later**: Consider migrating to unified `/shapes` collection in Phase 3E for cleaner architecture
- **Why not now**: Avoid migration complexity, each PR stays independent
- **When**: After all shapes work, write migration script (see Phase 3E planning)

---

## Phase Overview

Phase 3C expands from rectangles-only to a multi-shape canvas. We're using the **separate collections approach** for simplicity - each shape type gets its own Firebase collection.

**Why separate collections?**
- No database migration needed
- No breaking changes
- Each PR is independent (can be parallelized)
- Can refactor to unified `shapes` collection later if needed
- Simplest implementation given current constraints

**Shape types added:**
- **PR #5**: Circle - Essential design primitive
- **PR #6**: Line/Arrow - For diagrams and connections
- **PR #7**: Basic Text - Single-line, no formatting (HIGH VALUE)
- **PR #8**: Text Enhancements - Size, bold/italic (BONUS if time)

**Multi-select integration:**
Phase 3B's multi-select automatically works across shape types once implemented.

---

## PR #5: Circle Shape

**Branch**: `feature/circle-shape`  
**Work Level**: Medium  
**Breaking Changes**: None

### Why This PR?
- Natural complement to rectangles
- Low complexity, high value
- Common in diagrams, wireframes, avatars
- Good learning for shape architecture
- Foundation for other shapes

### What This PR Delivers

**Circle Features:**
- Create circles (double-click in "circle mode")
- Resize circles (single radial handle)
- Move circles (drag)
- Change color (color picker from Phase 3A)
- Delete circles (Delete key)
- Layer circles (z-index from Phase 3A)
- Select circles (multi-select from Phase 3B)

**Shape Mode Selector:**
- Toggle between Rectangle and Circle modes
- Keyboard shortcut: `R` for rectangles, `C` for circles
- Visual indicator of current mode

**AI Integration:**
- "Create a circle"
- "Make it bigger/smaller" (when circle selected)
- "Change it to blue" (when circle selected)

### Implementation Strategy

**Separate Collection Approach:**
- Add `/circles` collection in Firebase (parallel to `/rectangles`)
- Each circle has: `id, type: 'circle', x, y, radius, color, zIndex, createdBy, selectedBy`
- Rendering: Merge circles and rectangles, sort by zIndex, render together

**Circle-Specific Properties:**
- `radius` instead of width/height
- Single resize handle on right edge (radial movement)
- Otherwise identical to rectangles (color, selection, layering)

**Mode Selection:**
- Add shape mode state: `'rectangle' | 'circle'`
- Double-click creates shape based on current mode
- Show mode indicator in UI

### Files to Create

#### `/src/components/canvas/Circle.tsx`
Circle component with Konva:

```typescript
import React, { useCallback } from 'react'
import { Circle as KonvaCircle, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { SELECTION_COLORS, RESIZE_HANDLE } from '../../utils/constants'
import { stopEventPropagation } from '../../utils/eventHelpers'
import { getRectangleBorderColor } from '../../utils/constants'

export interface CircleShape {
  id: string
  type: 'circle'
  x: number  // center X
  y: number  // center Y
  radius: number
  color: string
  zIndex: number
  createdBy: string
  createdAt: number
  selectedBy: string | null
  selectedAt: number | null
}

interface CircleProps {
  circle: CircleShape
  isSelected: boolean
  isPrimary: boolean
  onSelect: (additive: boolean) => void
  onDragEnd: (newX: number, newY: number) => void
  onRadiusChange: (newRadius: number) => void
}

const Circle: React.FC<CircleProps> = ({
  circle,
  isSelected,
  isPrimary,
  onSelect,
  onDragEnd,
  onRadiusChange
}) => {
  const borderColor = getRectangleBorderColor(circle.color)

  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    stopEventPropagation(e)
    onDragEnd(e.target.x(), e.target.y())
  }, [onDragEnd])

  const handleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    stopEventPropagation(e)
    const additive = e.evt.metaKey || e.evt.ctrlKey
    onSelect(additive)
  }, [onSelect])

  return (
    <Group
      x={circle.x}
      y={circle.y}
      draggable={isSelected}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Main circle */}
      <KonvaCircle
        radius={circle.radius}
        fill={circle.color}
        stroke={isSelected ? SELECTION_COLORS.STROKE : borderColor}
        strokeWidth={isSelected ? SELECTION_COLORS.STROKE_WIDTH : 2}
      />
      
      {/* Resize handle (on primary selection only) */}
      {isPrimary && (
        <KonvaCircle
          x={circle.radius}
          y={0}
          radius={RESIZE_HANDLE.SIZE}
          fill={RESIZE_HANDLE.FILL}
          stroke={RESIZE_HANDLE.STROKE}
          strokeWidth={RESIZE_HANDLE.STROKE_WIDTH}
          draggable={true}
          onDragMove={(e) => {
            stopEventPropagation(e)
            // Calculate new radius based on handle position
            const newRadius = Math.hypot(e.target.x(), e.target.y())
            onRadiusChange(newRadius)
          }}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container()
            if (container) container.style.cursor = 'ew-resize'
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container()
            if (container) container.style.cursor = 'default'
          }}
        />
      )}
    </Group>
  )
}

export default Circle
```

#### `/src/components/canvas/ShapeModeSelector.tsx`
UI for selecting shape type (designed for all 4 shapes upfront):

```typescript
import React from 'react'
import './ShapeModeSelector.css'

type ShapeMode = 'rectangle' | 'circle' | 'line' | 'text'

interface ShapeModeSelectorProps {
  mode: ShapeMode
  onModeChange: (mode: ShapeMode) => void
  enabledModes: ShapeMode[]  // NEW: Which modes are currently available
}

const ShapeModeSelector: React.FC<ShapeModeSelectorProps> = ({ 
  mode, 
  onModeChange,
  enabledModes 
}) => {
  const modes: Array<{ type: ShapeMode; label: string; icon: JSX.Element; key: string }> = [
    {
      type: 'rectangle',
      label: 'Rectangle',
      key: 'R',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20">
          <rect x="2" y="4" width="16" height="12" fill="currentColor" />
        </svg>
      ),
    },
    {
      type: 'circle',
      label: 'Circle',
      key: 'C',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="currentColor" />
        </svg>
      ),
    },
    {
      type: 'line',
      label: 'Line',
      key: 'L',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20">
          <line x1="2" y1="18" x2="18" y2="2" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      type: 'text',
      label: 'Text',
      key: 'T',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20">
          <text x="10" y="15" textAnchor="middle" fontSize="14" fill="currentColor">T</text>
        </svg>
      ),
    },
  ]

  return (
    <div className="shape-mode-selector">
      {modes.map((modeInfo) => {
        const isEnabled = enabledModes.includes(modeInfo.type)
        const isActive = mode === modeInfo.type
        
        return (
          <button
            key={modeInfo.type}
            className={`mode-button ${isActive ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}`}
            onClick={() => isEnabled && onModeChange(modeInfo.type)}
            disabled={!isEnabled}
            title={`${modeInfo.label} (${modeInfo.key})${!isEnabled ? ' - Coming Soon' : ''}`}
          >
            {modeInfo.icon}
            <span>{modeInfo.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ShapeModeSelector
```

**Usage in PR #5:**
```typescript
// In Canvas.tsx or App.tsx
<ShapeModeSelector
  mode={shapeMode}
  onModeChange={setShapeMode}
  enabledModes={['rectangle', 'circle']}  // Only these work in PR #5
/>
```

**PR #6** adds `'line'` to `enabledModes`.  
**PR #7** adds `'text'` to `enabledModes`.

### Files to Update

#### 1. `/src/services/canvasService.ts`
Add circle operations (parallel to rectangles):

```typescript
import type { CircleShape } from '../components/canvas/Circle'

// NEW: Circle operations
export const createCircle = async (
  x: number,
  y: number,
  radius: number,
  color: string,
  userId: string
): Promise<CircleShape | null> => {
  try {
    // Get next zIndex (shared across all shapes)
    const zIndex = await getNextZIndex()
    
    const circlesRef = dbRef('circles')  // NEW collection
    const newCircleRef = dbPush(circlesRef)
    
    const circle: CircleShape = {
      id: newCircleRef.key!,
      type: 'circle',
      x,
      y,
      radius,
      color,
      zIndex,
      createdBy: userId,
      createdAt: Date.now(),
      selectedBy: null,
      selectedAt: null
    }
    
    await dbSet(newCircleRef, circle)
    return circle
  } catch (error) {
    console.error('Error creating circle:', error)
    throw error
  }
}

export const updateCircle = async (
  circleId: string,
  updates: Partial<Omit<CircleShape, 'id' | 'type' | 'createdBy' | 'createdAt'>>
): Promise<void> => {
  const circleRef = dbRef(`circles/${circleId}`)
  await dbUpdate(circleRef, updates)
}

export const updateCircleRadius = async (circleId: string, radius: number): Promise<void> => {
  const circleRef = dbRef(`circles/${circleId}`)
  const clampedRadius = Math.max(10, Math.min(1500, radius))
  await dbUpdate(circleRef, { radius: clampedRadius })
}

export const deleteCircle = async (circleId: string): Promise<void> => {
  const circleRef = dbRef(`circles/${circleId}`)
  await dbRemove(circleRef)
}

export const changeCircleColor = async (circleId: string, color: string): Promise<void> => {
  const circleRef = dbRef(`circles/${circleId}`)
  await dbUpdate(circleRef, { color })
}

export const selectCircle = async (
  circleId: string,
  userId: string,
  username: string
): Promise<void> => {
  const circleRef = dbRef(`circles/${circleId}`)
  await dbUpdate(circleRef, {
    selectedBy: userId,
    selectedAt: Date.now()
  })
}

export const onCirclesChange = (callback: (circles: CircleShape[]) => void): (() => void) => {
  const circlesRef = dbRef('circles')
  
  return dbOnValue(circlesRef, (snapshot) => {
    const circles: CircleShape[] = []
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        circles.push(child.val())
      })
    }
    callback(circles)
  })
}

// UPDATE: getNextZIndex to check both rectangles AND circles
const getNextZIndex = async (): Promise<number> => {
  let maxZIndex = 0
  
  // Check rectangles
  const rectanglesRef = dbRef('rectangles')
  const rectSnapshot = await dbGet(rectanglesRef)
  if (rectSnapshot.exists()) {
    rectSnapshot.forEach((child) => {
      const rect = child.val()
      if (rect.zIndex > maxZIndex) maxZIndex = rect.zIndex
    })
  }
  
  // Check circles
  const circlesRef = dbRef('circles')
  const circSnapshot = await dbGet(circlesRef)
  if (circSnapshot.exists()) {
    circSnapshot.forEach((child) => {
      const circle = child.val()
      if (circle.zIndex > maxZIndex) maxZIndex = circle.zIndex
    })
  }
  
  return maxZIndex + 1
}

// Layer operations for circles (same as rectangles)
export const bringCircleToFront = async (circleId: string): Promise<void> => {
  const maxZIndex = await getMaxZIndexAcrossAllShapes()
  const circleRef = dbRef(`circles/${circleId}`)
  await dbUpdate(circleRef, { zIndex: maxZIndex + 1 })
}

// ... similar for sendCircleToBack, bringCircleForward, sendCircleBackward
```

#### 2. `/src/contexts/CanvasContext.tsx`
Add circle state and operations:

```typescript
import type { CircleShape } from '../components/canvas/Circle'

interface CanvasContextType {
  // Existing rectangle state
  rectangles: Rectangle[]
  
  // NEW: Circle state
  circles: CircleShape[]
  
  // Selection works across shapes (from Phase 3B)
  selectedRectangleIds: Set<string>
  selectedCircleIds: Set<string>  // NEW
  primarySelectionId: string | null
  primarySelectionType: 'rectangle' | 'circle' | null  // NEW
  
  // NEW: Circle operations
  createCircle: (x: number, y: number, radius: number) => Promise<CircleShape | null>
  updateCircle: (circleId: string, updates: Partial<CircleShape>) => Promise<void>
  updateCircleRadius: (circleId: string, radius: number) => Promise<void>
  deleteCircle: (circleId: string) => Promise<void>
  changeCircleColor: (circleId: string, color: string) => Promise<void>
  
  // ... existing methods
}

// Implementation
const [circles, setCircles] = useState<CircleShape[]>([])
const [selectedCircleIds, setSelectedCircleIds] = useState<Set<string>>(new Set())
const [primarySelectionType, setPrimarySelectionType] = useState<'rectangle' | 'circle' | null>(null)

// Listen to circles collection
useEffect(() => {
  if (!user) {
    setCircles([])
    return
  }
  
  const unsubscribe = canvasService.onCirclesChange((newCircles) => {
    setCircles(newCircles)
  })
  
  return unsubscribe
}, [user])

// Circle operations
const createCircle = useCallback(async (
  x: number,
  y: number,
  radius: number = 50
): Promise<CircleShape | null> => {
  if (!user) return null
  
  try {
    const circle = await canvasService.createCircle(x, y, radius, DEFAULT_RECT.FILL, user.uid)
    if (circle) {
      // Select the new circle
      setSelectedCircleIds(new Set([circle.id]))
      setSelectedRectangleIds(new Set())  // Clear rectangle selection
      setPrimarySelectionId(circle.id)
      setPrimarySelectionType('circle')
      showToast('Circle created')
    }
    return circle
  } catch (err) {
    console.error('Error creating circle:', err)
    setError('Failed to create circle')
    return null
  }
}, [user, showToast])

const updateCircleRadius = useCallback(async (circleId: string, radius: number) => {
  try {
    await canvasService.updateCircleRadius(circleId, radius)
  } catch (err) {
    console.error('Error updating circle radius:', err)
    setError('Failed to update circle radius')
  }
}, [])

const deleteCircle = useCallback(async (circleId: string) => {
  try {
    await canvasService.deleteCircle(circleId)
    // Remove from selection
    setSelectedCircleIds(prev => {
      const next = new Set(prev)
      next.delete(circleId)
      return next
    })
    if (primarySelectionId === circleId) {
      setPrimarySelectionId(null)
      setPrimarySelectionType(null)
    }
  } catch (err) {
    console.error('Error deleting circle:', err)
    setError('Failed to delete circle')
  }
}, [primarySelectionId])

// ... other circle operations

// UPDATE: Selection methods to handle both rectangles and circles
const selectCircle = useCallback(async (circleId: string, additive: boolean = false) => {
  if (selectionLocked) return
  if (!user) return
  
  const circle = circles.find(c => c.id === circleId)
  if (!circle) return
  
  if (!additive) {
    // Clear all selections, select this circle
    setSelectedRectangleIds(new Set())
    setSelectedCircleIds(new Set([circleId]))
    setPrimarySelectionId(circleId)
    setPrimarySelectionType('circle')
  } else {
    // Toggle in/out of circle selection
    setSelectedCircleIds(prev => {
      const next = new Set(prev)
      if (next.has(circleId)) {
        next.delete(circleId)
        if (circleId === primarySelectionId) {
          // Set new primary from remaining selection
          const allSelected = [...selectedRectangleIds, ...next]
          setPrimarySelectionId(allSelected[0] || null)
          setPrimarySelectionType(allSelected[0] ? 'circle' : null)
        }
      } else {
        next.add(circleId)
        setPrimarySelectionId(circleId)
        setPrimarySelectionType('circle')
      }
      return next
    })
  }
}, [selectionLocked, user, circles, primarySelectionId, selectedRectangleIds])

// UPDATE: Delete selected to handle both shapes
const deleteSelectedShapes = useCallback(async () => {
  const rectIds = Array.from(selectedRectangleIds)
  const circleIds = Array.from(selectedCircleIds)
  
  for (const id of rectIds) {
    await canvasService.deleteRectangle(id)
  }
  for (const id of circleIds) {
    await canvasService.deleteCircle(id)
  }
  
  setSelectedRectangleIds(new Set())
  setSelectedCircleIds(new Set())
  setPrimarySelectionId(null)
  setPrimarySelectionType(null)
  
  const total = rectIds.length + circleIds.length
  showToast(`Deleted ${total} shape${total > 1 ? 's' : ''}`)
}, [selectedRectangleIds, selectedCircleIds, showToast])

// UPDATE: Change color to handle both shapes
const changeSelectedShapesColor = useCallback(async (color: string) => {
  const rectIds = Array.from(selectedRectangleIds)
  const circleIds = Array.from(selectedCircleIds)
  
  for (const id of rectIds) {
    await canvasService.changeRectangleColor(id, color)
  }
  for (const id of circleIds) {
    await canvasService.changeCircleColor(id, color)
  }
  
  const total = rectIds.length + circleIds.length
  showToast(`Changed color of ${total} shape${total > 1 ? 's' : ''}`)
}, [selectedRectangleIds, selectedCircleIds, showToast])
```

#### 3. `/src/components/canvas/Canvas.tsx`
Add circle rendering and shape mode:

```typescript
import Circle from './Circle'
import type { CircleShape } from './Circle'
import ShapeModeSelector from './ShapeModeSelector'

const {
  rectangles,
  circles,  // NEW
  selectedRectangleIds,
  selectedCircleIds,  // NEW
  primarySelectionId,
  primarySelectionType,  // NEW
  createRectangle,
  createCircle,  // NEW
  updateCircleRadius,  // NEW
  selectCircle,  // NEW
  deleteSelectedShapes,  // UPDATED
  changeSelectedShapesColor,  // UPDATED
  // ... rest
} = useCanvas()

// Shape mode state
const [shapeMode, setShapeMode] = useState<'rectangle' | 'circle'>('rectangle')

// Merge and sort all shapes by zIndex
const allShapes = useMemo(() => {
  const shapes: Array<{ type: 'rectangle' | 'circle', data: Rectangle | CircleShape }> = [
    ...rectangles.map(r => ({ type: 'rectangle' as const, data: r })),
    ...circles.map(c => ({ type: 'circle' as const, data: c }))
  ]
  return shapes.sort((a, b) => a.data.zIndex - b.data.zIndex)
}, [rectangles, circles])

// Handle double-click to create shape
const handleDoubleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
  if (selectionLocked) return
  
  const stage = e.target.getStage()
  if (!stage) return
  
  const pos = stage.getPointerPosition()
  if (!pos) return
  
  const canvasPos = transformToCanvasCoords(pos)
  
  if (shapeMode === 'rectangle') {
    createRectangle(canvasPos.x, canvasPos.y)
  } else if (shapeMode === 'circle') {
    createCircle(canvasPos.x, canvasPos.y, 50)  // Default radius 50
  }
}, [shapeMode, createRectangle, createCircle, selectionLocked, transformToCanvasCoords])

// Update keyboard handler for shape mode
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (selectionLocked) return
  
  // ... existing shortcuts
  
  // Shape mode shortcuts
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    setShapeMode('rectangle')
    return
  }
  if (e.key === 'c' || e.key === 'C') {
    e.preventDefault()
    setShapeMode('circle')
    return
  }
  
  // Delete: works on both rectangles and circles
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    deleteSelectedShapes()
    return
  }
}, [selectionLocked, deleteSelectedShapes])

// Render
return (
  <div className="canvas-container">
    {/* Shape mode selector */}
    <ShapeModeSelector mode={shapeMode} onModeChange={setShapeMode} />
    
    {/* Canvas */}
    <Stage onDblClick={handleDoubleClick} /* ... */>
      <Layer>
        {/* Render all shapes sorted by zIndex */}
        {allShapes.map(shape => {
          if (shape.type === 'rectangle') {
            const rect = shape.data as Rectangle
            return (
              <Rectangle
                key={`rect-${rect.id}`}
                rectangle={rect}
                isSelected={selectedRectangleIds.has(rect.id)}
                isPrimary={rect.id === primarySelectionId && primarySelectionType === 'rectangle'}
                onSelect={(additive) => selectRectangle(rect.id, additive)}
              />
            )
          } else if (shape.type === 'circle') {
            const circle = shape.data as CircleShape
            return (
              <Circle
                key={`circle-${circle.id}`}
                circle={circle}
                isSelected={selectedCircleIds.has(circle.id)}
                isPrimary={circle.id === primarySelectionId && primarySelectionType === 'circle'}
                onSelect={(additive) => selectCircle(circle.id, additive)}
                onDragEnd={(x, y) => updateCircle(circle.id, { x, y })}
                onRadiusChange={(radius) => updateCircleRadius(circle.id, radius)}
              />
            )
          }
          return null
        })}
        
        {/* Cursors, selection box, etc. */}
      </Layer>
    </Stage>
  </div>
)
```

#### 4. `/src/utils/constants.ts`
Add circle constants:

```typescript
export const DEFAULT_CIRCLE = {
  RADIUS: 50,
  FILL: RECTANGLE_COLORS.BLUE
} as const

export const CIRCLE_CONSTRAINTS = {
  MIN_RADIUS: 10,
  MAX_RADIUS: 1500
} as const
```

#### 5. `/functions/src/tools.ts` (AI Support)
Add createCircle tool:

```typescript
export const createCircle = tool({
  description: 'Create a circle on the canvas',
  parameters: z.object({
    x: z.number().optional().describe('X position (center). Defaults to viewport center.'),
    y: z.number().optional().describe('Y position (center). Defaults to viewport center.'),
    radius: z.number().optional().describe('Radius in pixels. Default 50, min 10, max 1500.'),
    color: z.string().describe('Color as hex code. Must be #ef4444 (red), #3b82f6 (blue), or #22c55e (green).')
  }),
  execute: async () => ({ success: true })
})

// Add to tools object
export const tools = {
  // ... existing
  createCircle  // NEW
}
```

#### 6. `/functions/src/utils/systemPrompt.ts`
Update system prompt:

```typescript
AVAILABLE SHAPES:
- Rectangles (default)
- Circles (NEW)

AVAILABLE OPERATIONS:
- Create rectangle
- Create circle (NEW)
- Change color (works on selected rectangle OR circle)
- Move shape (works on selected rectangle OR circle)
- Resize shape (rectangle: width/height, circle: radius)
- Delete shape (works on selected rectangle OR circle)
- Duplicate shape (works on selected rectangle OR circle)
- Layer operations (works on selected rectangle OR circle)

When user says "create a circle", use createCircle tool.
When user says "make it bigger" with a circle selected, use resizeRectangle tool with radius parameter.
```

#### 7. `/src/services/aiAgent.ts`
Handle circle commands:

```typescript
case 'createCircle':
  const circleId = await context.createCircle(
    parameters.x || viewportInfo.centerX,
    parameters.y || viewportInfo.centerY,
    parameters.radius || 50
  )
  return circleId?.id || null

// Resize should work for circles too
case 'resizeRectangle':
  if (primarySelectionType === 'circle') {
    // Interpret as radius change
    await context.updateCircleRadius(primarySelectionId!, parameters.width)
  } else {
    // Normal rectangle resize
    await context.resizeRectangle(primarySelectionId!, parameters.width, parameters.height)
  }
  break
```

### Testing Checklist

**Manual Testing - Circle Creation:**
- [ ] Can create circles by double-clicking in circle mode
- [ ] Circle mode activated with `C` key
- [ ] Rectangle mode activated with `R` key
- [ ] Mode selector shows current mode visually
- [ ] Default circle radius is 50px
- [ ] Circles appear at click position

**Manual Testing - Circle Operations:**
- [ ] Can select circles (click)
- [ ] Can drag circles to new position
- [ ] Can resize circles with radial handle
- [ ] Resize handle constrained to 10-1500px radius
- [ ] Can delete circles (Delete key)
- [ ] Can change circle color (color picker)
- [ ] Circles work with layer operations (bring to front, etc.)

**Manual Testing - Multi-Select with Circles:**
- [ ] Can select multiple circles (Cmd+click)
- [ ] Can select rectangles and circles together
- [ ] Drag selection box selects both shapes
- [ ] Cmd+A selects all shapes (rectangles and circles)
- [ ] Delete works on mixed selection
- [ ] Color change works on mixed selection

**Manual Testing - Z-Index:**
- [ ] Circles and rectangles layer correctly together
- [ ] New circles appear on top
- [ ] Layer operations work on circles
- [ ] Visual stacking order is correct

**Manual Testing - Real-Time Sync:**
- [ ] Circles sync across users in real-time
- [ ] All circle operations sync (create, move, resize, delete, color)
- [ ] Multi-user circle editing works smoothly

**AI Testing:**
- [ ] AI can create circles ("create a circle")
- [ ] AI can create circles with color ("create a red circle")
- [ ] AI can resize circles when circle selected ("make it bigger")
- [ ] AI can change circle color when circle selected
- [ ] AI can delete circles when circle selected
- [ ] AI gives helpful error when asked to operate on circle without one selected
- [ ] All AI circle operations sync to all users

### Success Criteria
- ✅ Circles fully functional (create, select, move, resize, delete, color)
- ✅ Shape mode selector works smoothly
- ✅ Multi-select works with circles and rectangles together
- ✅ Z-index/layering works across shape types
- ✅ AI agent supports circle creation and operations
- ✅ Real-time sync verified
- ✅ No console errors
- ✅ Performance acceptable with 50+ shapes of mixed types

---

## PR #6: Line/Arrow Shape

**Branch**: `feature/line-arrow`  
**Work Level**: Medium  
**Breaking Changes**: None

### Why This PR?
- Essential for diagrams, flowcharts, wireframes
- Connects elements together
- Low complexity with high utility
- Arrow variant adds significant value
- Foundation for more complex connectors

### What This PR Delivers

**Line Features:**
- Create lines (two-click: start point, end point)
- Move lines (drag)
- Adjust endpoints (drag handles)
- Change color and stroke width
- Delete lines
- Layer lines with other shapes

**Arrow Variant:**
- Toggle arrowhead on/off
- Arrowhead at end point
- Same operations as lines

**AI Integration:**
- "Create a line from here to there"
- "Draw an arrow"
- "Make the line thicker"

### Implementation Strategy

**Line Properties:**
- Start point: `x, y`
- End point: `endX, endY`
- `strokeWidth` (default: 4px)
- `hasArrow` boolean
- Otherwise similar to other shapes

**Two-Click Creation:**
- First click: Set start point, show preview line
- Mouse move: Update preview end point
- Second click: Create line
- Escape: Cancel

**Endpoint Handles:**
- Two handles: one at each end
- Drag to reposition endpoints
- Only show on primary selection

### Files to Create

#### `/src/components/canvas/Line.tsx`
```typescript
import React, { useCallback } from 'react'
import { Line as KonvaLine, Circle, Group, Arrow } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { SELECTION_COLORS, RESIZE_HANDLE } from '../../utils/constants'
import { stopEventPropagation } from '../../utils/eventHelpers'

export interface LineShape {
  id: string
  type: 'line'
  x: number  // start X
  y: number  // start Y
  endX: number
  endY: number
  strokeWidth: number
  color: string
  hasArrow: boolean
  zIndex: number
  createdBy: string
  createdAt: number
  selectedBy: string | null
  selectedAt: number | null
}

interface LineProps {
  line: LineShape
  isSelected: boolean
  isPrimary: boolean
  onSelect: (additive: boolean) => void
  onDragEnd: (newX: number, newY: number) => void
  onStartPointChange: (newX: number, newY: number) => void
  onEndPointChange: (newEndX: number, newEndY: number) => void
}

const Line: React.FC<LineProps> = ({
  line,
  isSelected,
  isPrimary,
  onSelect,
  onDragEnd,
  onStartPointChange,
  onEndPointChange
}) => {
  const handleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    stopEventPropagation(e)
    const additive = e.evt.metaKey || e.evt.ctrlKey
    onSelect(additive)
  }, [onSelect])

  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    stopEventPropagation(e)
    const deltaX = e.target.x()
    const deltaY = e.target.y()
    onDragEnd(line.x + deltaX, line.y + deltaY)
    // Reset group position
    e.target.position({ x: 0, y: 0 })
  }, [line.x, line.y, onDragEnd])

  const points = [0, 0, line.endX - line.x, line.endY - line.y]

  return (
    <Group
      x={line.x}
      y={line.y}
      draggable={isSelected}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Main line or arrow */}
      {line.hasArrow ? (
        <Arrow
          points={points}
          stroke={isSelected ? SELECTION_COLORS.STROKE : line.color}
          strokeWidth={isSelected ? line.strokeWidth + 2 : line.strokeWidth}
          fill={line.color}
          pointerLength={10}
          pointerWidth={10}
        />
      ) : (
        <KonvaLine
          points={points}
          stroke={isSelected ? SELECTION_COLORS.STROKE : line.color}
          strokeWidth={isSelected ? line.strokeWidth + 2 : line.strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      )}
      
      {/* Endpoint handles (on primary selection only) */}
      {isPrimary && (
        <>
          {/* Start handle */}
          <Circle
            x={0}
            y={0}
            radius={RESIZE_HANDLE.SIZE}
            fill={RESIZE_HANDLE.FILL}
            stroke={RESIZE_HANDLE.STROKE}
            strokeWidth={RESIZE_HANDLE.STROKE_WIDTH}
            draggable={true}
            onDragEnd={(e) => {
              stopEventPropagation(e)
              const newX = line.x + e.target.x()
              const newY = line.y + e.target.y()
              onStartPointChange(newX, newY)
              e.target.position({ x: 0, y: 0 })
            }}
          />
          
          {/* End handle */}
          <Circle
            x={line.endX - line.x}
            y={line.endY - line.y}
            radius={RESIZE_HANDLE.SIZE}
            fill={RESIZE_HANDLE.FILL}
            stroke={RESIZE_HANDLE.STROKE}
            strokeWidth={RESIZE_HANDLE.STROKE_WIDTH}
            draggable={true}
            onDragEnd={(e) => {
              stopEventPropagation(e)
              const newEndX = line.x + e.target.x()
              const newEndY = line.y + e.target.y()
              onEndPointChange(newEndX, newEndY)
              e.target.position({ x: line.endX - line.x, y: line.endY - line.y })
            }}
          />
        </>
      )}
    </Group>
  )
}

export default Line
```

### Files to Update

Similar pattern to PR #5 (Circle):
1. Add `/lines` collection in Firebase
2. Add line operations to `canvasService.ts`
3. Add line state to `CanvasContext.tsx`
4. Add line rendering to `Canvas.tsx` with two-click creation
5. Add `'line'` mode to `ShapeModeSelector` (keyboard: `L`)
6. Add `createLine` tool to Cloud Function
7. Update system prompt and AI agent

### Testing Checklist

**Manual Testing:**
- [ ] Can create lines with two clicks
- [ ] Preview line shows during creation
- [ ] Can cancel line creation with Escape
- [ ] Can move lines by dragging
- [ ] Can adjust start point with handle
- [ ] Can adjust end point with handle
- [ ] Can create arrows (hasArrow toggle)
- [ ] Arrows show arrowhead at end point
- [ ] Lines work with all operations (delete, color, layer)
- [ ] Lines work with multi-select

**AI Testing:**
- [ ] AI can create lines
- [ ] AI can create arrows
- [ ] AI can adjust line properties when line selected
- [ ] All AI line operations sync

### Success Criteria
- ✅ Lines and arrows fully functional
- ✅ Two-click creation works smoothly
- ✅ Endpoint handles work correctly
- ✅ AI agent supports lines
- ✅ Real-time sync verified

---

## PR #7: Basic Text Shape

**Branch**: `feature/text-basic`  
**Work Level**: Medium-High  
**Breaking Changes**: None

### Why This PR?
- **Highest value despite complexity**
- Can't build useful diagrams/wireframes without text
- Single-line version delivers most value
- Formatting can wait (PR #8 BONUS)

### What This PR Delivers

**Basic Text Features:**
- Create text (double-click in text mode)
- Edit text (double-click to edit, Escape/Enter to finish)
- Move text (drag)
- Delete text
- Change color
- Layer text

**Limitations (intentional for PR #7):**
- Single line only
- Fixed font (system default)
- Fixed size (16px)
- No bold/italic/formatting

**AI Integration:**
- "Add text that says 'Hello World'"
- "Create a label"
- "Change the text to 'Updated'"

### Implementation Strategy

**Text Properties:**
- `text: string` content
- `x, y` position
- `fontSize: number` (fixed at 16 for PR #7)
- `fontFamily: string` (fixed at 'Arial' for PR #7)
- Otherwise similar to other shapes

**Editing Mode:**
- Double-click text enters edit mode
- Show editable HTML input positioned over canvas
- Escape or Enter finishes editing
- Click outside finishes editing

**Single-Line Constraint:**
- Input type="text" (not textarea)
- Strip newlines on save
- Max length: 200 characters

### Files to Create

#### `/src/components/canvas/Text.tsx`
```typescript
import React, { useCallback, useState, useRef, useEffect } from 'react'
import { Text as KonvaText, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { SELECTION_COLORS } from '../../utils/constants'
import { stopEventPropagation } from '../../utils/eventHelpers'

export interface TextShape {
  id: string
  type: 'text'
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily: string
  color: string
  zIndex: number
  createdBy: string
  createdAt: number
  selectedBy: string | null
  selectedAt: number | null
}

interface TextProps {
  textShape: TextShape
  isSelected: boolean
  isPrimary: boolean
  onSelect: (additive: boolean) => void
  onDragEnd: (newX: number, newY: number) => void
  onTextChange: (newText: string) => void
  onEditingChange: (editing: boolean) => void
}

const Text: React.FC<TextProps> = ({
  textShape,
  isSelected,
  isPrimary,
  onSelect,
  onDragEnd,
  onTextChange,
  onEditingChange
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const textRef = useRef<any>(null)

  const handleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    stopEventPropagation(e)
    const additive = e.evt.metaKey || e.evt.ctrlKey
    onSelect(additive)
  }, [onSelect])

  const handleDblClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    stopEventPropagation(e)
    setIsEditing(true)
    onEditingChange(true)
  }, [onEditingChange])

  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    stopEventPropagation(e)
    onDragEnd(e.target.x(), e.target.y())
  }, [onDragEnd])

  useEffect(() => {
    if (isEditing && textRef.current) {
      const textNode = textRef.current
      const stage = textNode.getStage()
      if (!stage) return

      // Get text position on screen
      const textPosition = textNode.getClientRect()
      const stageBox = stage.container().getBoundingClientRect()
      
      // Create input element
      const input = document.createElement('input')
      input.type = 'text'
      input.value = textShape.text
      input.maxLength = 200
      input.style.position = 'absolute'
      input.style.left = `${stageBox.left + textPosition.x}px`
      input.style.top = `${stageBox.top + textPosition.y}px`
      input.style.width = `${Math.max(textPosition.width, 100)}px`
      input.style.fontSize = `${textShape.fontSize}px`
      input.style.fontFamily = textShape.fontFamily
      input.style.color = textShape.color
      input.style.border = '2px solid #3b82f6'
      input.style.padding = '2px'
      input.style.background = 'white'
      input.style.zIndex = '1000'
      
      document.body.appendChild(input)
      input.focus()
      input.select()
      
      const finishEditing = () => {
        const newText = input.value.trim()
        if (newText && newText !== textShape.text) {
          onTextChange(newText)
        }
        document.body.removeChild(input)
        setIsEditing(false)
        onEditingChange(false)
      }
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault()
          finishEditing()
        }
      })
      
      input.addEventListener('blur', finishEditing)
      
      return () => {
        if (document.body.contains(input)) {
          document.body.removeChild(input)
        }
      }
    }
  }, [isEditing, textShape, onTextChange, onEditingChange])

  return (
    <Group
      x={textShape.x}
      y={textShape.y}
      draggable={isSelected && !isEditing}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onDblClick={handleDblClick}
      onTap={handleClick}
      onDblTap={handleDblClick}
    >
      <KonvaText
        ref={textRef}
        text={textShape.text}
        fontSize={textShape.fontSize}
        fontFamily={textShape.fontFamily}
        fill={textShape.color}
        stroke={isSelected ? SELECTION_COLORS.STROKE : undefined}
        strokeWidth={isSelected ? 1 : 0}
      />
    </Group>
  )
}

export default Text
```

Similar Firebase, context, and AI integration patterns as PR #5 and #6.

### Testing Checklist

**Manual Testing:**
- [ ] Can create text by double-clicking in text mode
- [ ] Can enter edit mode (double-click)
- [ ] Can type text (single line)
- [ ] Enter finishes editing
- [ ] Escape finishes editing
- [ ] Click outside finishes editing
- [ ] Empty text not saved
- [ ] Max 200 characters enforced
- [ ] Can move text when not editing
- [ ] Can't move text while editing
- [ ] All operations work (delete, color, layer, multi-select)

**AI Testing:**
- [ ] AI can create text ("add text that says 'Hello'")
- [ ] AI can update text when text selected
- [ ] AI text operations sync

### Success Criteria
- ✅ Basic text creation and editing works
- ✅ Single-line constraint enforced
- ✅ Editing UX is smooth
- ✅ AI agent supports text
- ✅ Real-time sync verified

---

## PR #8: Text Enhancements (BONUS)

**Branch**: `feature/text-enhancements`  
**Work Level**: Medium  
**Breaking Changes**: None

**⚠️ BONUS PR - Only if time permits**

### What This PR Delivers

**Text Formatting:**
- Font size adjustment (10px - 72px)
- Bold toggle
- Italic toggle

**Implementation:**
- Add fontSize, fontWeight, fontStyle to TextShape
- Add formatting toolbar (shows when text selected)
- AI: "make the text bigger", "make it bold"

### Testing Checklist
- [ ] Can change font size
- [ ] Bold toggle works
- [ ] Italic toggle works
- [ ] Formatting syncs
- [ ] AI can apply formatting

---

## Phase 3C Completion Checklist

Before moving to Phase 3D, verify:

### Functionality
- [ ] All 4 PRs merged (or 3 if skipping PR #8 BONUS)
- [ ] Circles fully functional
- [ ] Lines/Arrows fully functional
- [ ] Text fully functional (basic or enhanced)
- [ ] Shape mode selector works
- [ ] All shapes work with multi-select
- [ ] All shapes work with Phase 3A features (copy/paste, layers, color picker)
- [ ] Real-time sync for all shapes

### Code Quality
- [ ] All tests passing
- [ ] No console errors
- [ ] Separate collections working cleanly
- [ ] Performance acceptable with mixed shapes

### Documentation
- [ ] Shape creation documented
- [ ] Keyboard shortcuts updated

### AI Integration
- [ ] AI supports all new shapes
- [ ] AI gives helpful feedback
- [ ] All AI shape operations sync

---

## Next Steps

**Proceed to Phase 3D**: [Advanced Features](./phase3d-advanced.md)

Phase 3D adds professional design tool features: Alignment tools, Selection tools, and Rotate operation. These require Phase 3B (multi-select) to be complete.

