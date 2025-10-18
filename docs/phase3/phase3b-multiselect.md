# Phase 3B: Selection Model Refactor

**Focus**: Convert from single selection to multi-select (Breaking Change)  
**PRs**: 4  
**Work Level**: Medium-High  
**Dependencies**: Phase 3A complete

> **⚠️ Before Implementation:** Review this plan and ask questions before proceeding. Consider whether any plans need to change first.

---

## Phase Overview

Phase 3B introduces the **first breaking change** in Phase 3 - converting the selection model from single to multi-select. This is isolated in its own phase due to the scope of changes and need for focused testing.

**Why a separate phase?**
- Breaking change affects many files
- Foundation for advanced features (Phases 3D and 3F)
- Enables bulk operations
- Requires thorough testing before proceeding
- Good checkpoint for review

**What changes:**
- Selection state: `selectedRectangleId: string | null` → `selectedRectangleIds: Set<string>`
- Copy/paste from Phase 3A automatically works with multiple items
- Color picker from Phase 3A works with multiple selections
- Layer operations from Phase 3A still work (on primary selection only)

---

## PR #4: Multi-Select Implementation

**Branch**: `feature/multi-select`  
**Work Level**: Medium-High  
**Breaking Changes**: ⚠️ YES - Major refactor of selection model

### Why This PR?
- Foundation for alignment tools (Phase 3D)
- Foundation for bulk operations (delete all, color all)
- Industry-standard interaction pattern
- Copy/paste/duplicate (from PR #1) automatically work with multiple items
- Enables professional workflows

### Breaking Changes

This PR changes the selection model throughout the codebase:

**Before (Phase 3A):**
```typescript
selectedRectangleId: string | null
selectRectangle(id: string): void
```

**After (Phase 3B):**
```typescript
selectedRectangleIds: Set<string>
primarySelectionId: string | null
selectRectangle(id: string, additive?: boolean): void
selectMultiple(ids: string[]): void
selectAll(): void
```

**Impact:**
- CanvasContext interface changes
- All components using `selectedRectangleId` must be updated
- Rectangle component needs `isSelected` and `isPrimary` props
- AI agent uses `primarySelectionId` for commands requiring single selection

### What This PR Delivers

**Multi-Select Methods:**
1. **Click** - Select single (clear others)
2. **Cmd/Ctrl+Click** - Add/remove from selection (toggle)
3. **Shift+Click** - Select range (all rectangles between two clicks)
4. **Drag Selection Box** - Select all within dragged rectangle
5. **Cmd/Ctrl+A** - Select all rectangles

**Visual Feedback:**
- All selected rectangles: Red border (3px)
- Primary selection (last clicked): Resize handles
- Selection box: Transparent blue with dashed border
- Selection count indicator (optional UI enhancement)

**Operations on Multi-Select:**
- **Copy/Paste** (from PR #1): Works with multiple items automatically
- **Duplicate** (from PR #1): Only works with single selection (shows message for multiple)
- **Delete**: Deletes all selected
- **Color Change** (from PR #2): Changes all selected
- **Layer Operations** (from PR #3): Only work on primary selection

### Implementation Strategy

**Selection State Management:**
- `selectedRectangleIds: Set<string>` - All selected rectangle IDs
- `primarySelectionId: string | null` - Last clicked (shows resize handles)
- Firebase selection tracking: Keep per-user as-is (each user has own selection)

**Clipboard Updates:**
- Change `clipboardRectangle` to `clipboardRectangles: Rectangle[]` (plural)
- Copy stores all selected
- Paste creates all with offset
- Multiple pastes work (stagger offsets)

**Drag Selection Box:**
- Track mouse down/move/up on stage
- Draw transparent blue rectangle during drag
- On mouse up, select all rectangles within bounds
- Cancel with Escape key

### Files to Create

#### `/src/components/canvas/SelectionBox.tsx`
Visual component for drag selection:

```typescript
import React from 'react'
import { Rect } from 'react-konva'

interface SelectionBoxProps {
  x: number
  y: number
  width: number
  height: number
}

const SelectionBox: React.FC<SelectionBoxProps> = ({ x, y, width, height }) => {
  return (
    <>
      {/* Background */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.1)"
        listening={false}
      />
      {/* Border */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke="#3b82f6"
        strokeWidth={1}
        dash={[5, 5]}
        listening={false}
      />
    </>
  )
}

export default SelectionBox
```

### Files to Update

#### 1. `/src/contexts/CanvasContext.tsx` ⚠️ MAJOR REFACTOR

Change selection from single to multi:

```typescript
interface CanvasContextType {
  // CHANGED: From single to multi
  selectedRectangleIds: Set<string>  // Was: selectedRectangleId: string | null
  primarySelectionId: string | null  // NEW: Last clicked rectangle
  
  // UPDATED: Method signatures
  selectRectangle: (rectangleId: string, additive?: boolean) => Promise<void>
  selectMultiple: (rectangleIds: string[]) => Promise<void>  // NEW
  selectAll: () => Promise<void>  // NEW
  clearSelection: () => Promise<void>  // UPDATED
  
  // NEW: Bulk operations
  deleteSelectedRectangles: () => Promise<void>
  changeSelectedRectanglesColor: (color: string) => Promise<void>
  
  // UPDATED from PR #1: Now work with multiple
  copySelectedRectangles: () => void  // Was: copyRectangle(id)
  pasteRectangles: () => Promise<void>  // Was: pasteRectangle()
  duplicateRectangle: (rectangleId: string) => Promise<Rectangle | null>  // Unchanged (single only)
  
  // Existing methods continue to work
  createRectangle: (x: number, y: number) => Promise<Rectangle | null>
  updateRectangle: (rectangleId: string, updates: Partial<Rectangle>) => Promise<void>
  resizeRectangle: (rectangleId: string, newWidth: number, newHeight: number) => Promise<void>
  deleteRectangle: (rectangleId: string) => Promise<void>
  changeRectangleColor: (rectangleId: string, color: string) => Promise<void>
  
  // From PR #3: Layer operations (work on primary only)
  bringToFront: (rectangleId: string) => Promise<void>
  sendToBack: (rectangleId: string) => Promise<void>
  bringForward: (rectangleId: string) => Promise<void>
  sendBackward: (rectangleId: string) => Promise<void>
}

// Implementation
const [selectedRectangleIds, setSelectedRectangleIds] = useState<Set<string>>(new Set())
const [primarySelectionId, setPrimarySelectionId] = useState<string | null>(null)
const [clipboardRectangles, setClipboardRectangles] = useState<Rectangle[]>([])  // Was: clipboardRectangle

// Keep ref in sync for Firebase callbacks
const selectedRectangleIdsRef = useRef<Set<string>>(new Set())
const primarySelectionIdRef = useRef<string | null>(null)

useEffect(() => {
  selectedRectangleIdsRef.current = selectedRectangleIds
  primarySelectionIdRef.current = primarySelectionId
}, [selectedRectangleIds, primarySelectionId])

// UPDATED: selectRectangle now supports additive selection
const selectRectangle = useCallback(async (rectangleId: string, additive: boolean = false) => {
  if (selectionLocked) {
    console.log('Selection locked during AI processing')
    return
  }
  
  if (!user) return
  
  const rectangle = rectangles.find(r => r.id === rectangleId)
  if (!rectangle) {
    showToast('Rectangle not found')
    return
  }
  
  // Check if another user has it selected (exclusive selection per rectangle)
  if (rectangle.selectedBy && rectangle.selectedBy !== user.uid) {
    const otherUser = rectangle.selectedBy
    showToast(`Rectangle is currently selected by another user`)
    return
  }
  
  if (!additive) {
    // Clear others, select this one
    setSelectedRectangleIds(new Set([rectangleId]))
    setPrimarySelectionId(rectangleId)
    await canvasService.selectRectangle(rectangleId, user.uid, username!)
  } else {
    // Add/remove from selection (toggle)
    setSelectedRectangleIds(prev => {
      const next = new Set(prev)
      if (next.has(rectangleId)) {
        // Remove from selection
        next.delete(rectangleId)
        // If removing primary, set new primary
        if (rectangleId === primarySelectionId) {
          if (next.size > 0) {
            const newPrimary = Array.from(next)[0]
            setPrimarySelectionId(newPrimary)
          } else {
            setPrimarySelectionId(null)
          }
        }
      } else {
        // Add to selection
        next.add(rectangleId)
        setPrimarySelectionId(rectangleId)
      }
      return next
    })
  }
}, [selectionLocked, user, username, rectangles, primarySelectionId, showToast])

// NEW: Select multiple rectangles
const selectMultiple = useCallback(async (rectangleIds: string[]) => {
  if (selectionLocked) return
  
  setSelectedRectangleIds(new Set(rectangleIds))
  setPrimarySelectionId(rectangleIds[rectangleIds.length - 1] || null)
}, [selectionLocked])

// NEW: Select all rectangles
const selectAll = useCallback(async () => {
  if (selectionLocked) return
  
  const allIds = rectangles.map(r => r.id)
  setSelectedRectangleIds(new Set(allIds))
  setPrimarySelectionId(allIds[allIds.length - 1] || null)
}, [selectionLocked, rectangles])

// UPDATED: Clear selection
const clearSelection = useCallback(async () => {
  setSelectedRectangleIds(new Set())
  setPrimarySelectionId(null)
}, [])

// NEW: Delete all selected rectangles
const deleteSelectedRectangles = useCallback(async () => {
  const idsToDelete = Array.from(selectedRectangleIds)
  if (idsToDelete.length === 0) return
  
  // Delete all sequentially
  for (const id of idsToDelete) {
    await canvasService.deleteRectangle(id)
  }
  
  setSelectedRectangleIds(new Set())
  setPrimarySelectionId(null)
  
  const count = idsToDelete.length
  showToast(`Deleted ${count} rectangle${count > 1 ? 's' : ''}`)
}, [selectedRectangleIds, showToast])

// NEW: Change color of all selected rectangles
const changeSelectedRectanglesColor = useCallback(async (color: string) => {
  const idsToUpdate = Array.from(selectedRectangleIds)
  if (idsToUpdate.length === 0) return
  
  // Update all sequentially
  for (const id of idsToUpdate) {
    await canvasService.changeRectangleColor(id, color)
  }
  
  const count = idsToUpdate.length
  showToast(`Changed color of ${count} rectangle${count > 1 ? 's' : ''}`)
}, [selectedRectangleIds, showToast])

// UPDATED from PR #1: Copy now works with multiple
const copySelectedRectangles = useCallback(() => {
  const selected = rectangles.filter(r => selectedRectangleIds.has(r.id))
  if (selected.length === 0) {
    showToast('No rectangles selected to copy')
    return
  }
  
  setClipboardRectangles(selected)
  const count = selected.length
  showToast(`Copied ${count} rectangle${count > 1 ? 's' : ''}`)
}, [rectangles, selectedRectangleIds, showToast])

// UPDATED from PR #1: Paste now works with multiple
const pasteRectangles = useCallback(async () => {
  if (!user) {
    setError('You must be signed in to paste')
    return
  }
  
  if (clipboardRectangles.length === 0) {
    showToast('Nothing to paste')
    return
  }
  
  try {
    const PASTE_OFFSET = 20
    const newIds: string[] = []
    
    // Paste all rectangles with offset
    for (const original of clipboardRectangles) {
      const newX = Math.min(
        original.x + PASTE_OFFSET,
        CANVAS_WIDTH - original.width
      )
      const newY = Math.min(
        original.y + PASTE_OFFSET,
        CANVAS_HEIGHT - original.height
      )
      
      const input: RectangleInput = {
        x: newX,
        y: newY,
        width: original.width,
        height: original.height,
        color: original.color,
        createdBy: user.uid,
        createdAt: Date.now()
      }
      
      const pasted = await canvasService.createRectangle(input)
      if (pasted) {
        newIds.push(pasted.id)
      }
    }
    
    // Select all pasted rectangles
    setSelectedRectangleIds(new Set(newIds))
    setPrimarySelectionId(newIds[newIds.length - 1] || null)
    
    const count = newIds.length
    showToast(`Pasted ${count} rectangle${count > 1 ? 's' : ''}`)
  } catch (err: any) {
    console.error('Error pasting rectangles:', err)
    setError(err.message || 'Failed to paste rectangles')
  }
}, [user, clipboardRectangles, showToast])

// duplicateRectangle stays the same (single selection only)
// Layer operations stay the same (work on primary selection)

// Add to context value return
return (
  <CanvasContext.Provider value={{
    // ... existing values
    selectedRectangleIds,
    primarySelectionId,
    selectRectangle,
    selectMultiple,
    selectAll,
    clearSelection,
    deleteSelectedRectangles,
    changeSelectedRectanglesColor,
    copySelectedRectangles,
    pasteRectangles,
    duplicateRectangle,
    // ... rest of existing values
  }}>
    {children}
  </CanvasContext.Provider>
)
```

#### 2. `/src/components/canvas/Canvas.tsx` ⚠️ MAJOR REFACTOR

Update to use multi-select and add drag selection:

```typescript
import SelectionBox from './SelectionBox'

const {
  selectedRectangleIds,  // Changed from selectedRectangleId
  primarySelectionId,    // NEW
  selectRectangle,
  selectMultiple,
  selectAll,
  clearSelection,
  deleteSelectedRectangles,
  changeSelectedRectanglesColor,
  copySelectedRectangles,
  pasteRectangles,
  duplicateRectangle,
  // ... rest
} = useCanvas()

// Drag selection state
const [selectionBoxStart, setSelectionBoxStart] = useState<{x: number, y: number} | null>(null)
const [selectionBoxEnd, setSelectionBoxEnd] = useState<{x: number, y: number} | null>(null)

// Transform screen coordinates to canvas coordinates
const transformToCanvasCoords = useCallback((screenPos: {x: number, y: number}) => {
  if (!stageRef.current) return screenPos
  
  const stage = stageRef.current
  const scale = stage.scaleX()
  const stagePos = stage.position()
  
  return {
    x: (screenPos.x - stagePos.x) / scale,
    y: (screenPos.y - stagePos.y) / scale
  }
}, [])

// Handle stage mouse down (start selection box)
const handleStageMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
  // Only if clicking on stage (not on rectangles)
  if (e.target === e.target.getStage()) {
    const pos = e.target.getStage()!.getPointerPosition()
    if (pos) {
      const canvasPos = transformToCanvasCoords(pos)
      setSelectionBoxStart(canvasPos)
      
      // Clear selection if not holding modifier key
      if (!e.evt.metaKey && !e.evt.ctrlKey && !e.evt.shiftKey) {
        clearSelection()
      }
    }
  }
}, [transformToCanvasCoords, clearSelection])

// Handle stage mouse move (draw selection box)
const handleStageMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
  if (selectionBoxStart) {
    const pos = e.target.getStage()!.getPointerPosition()
    if (pos) {
      const canvasPos = transformToCanvasCoords(pos)
      setSelectionBoxEnd(canvasPos)
    }
  }
}, [selectionBoxStart, transformToCanvasCoords])

// Handle stage mouse up (complete selection)
const handleStageMouseUp = useCallback(() => {
  if (selectionBoxStart && selectionBoxEnd) {
    // Calculate selection box bounds
    const box = {
      x: Math.min(selectionBoxStart.x, selectionBoxEnd.x),
      y: Math.min(selectionBoxStart.y, selectionBoxEnd.y),
      width: Math.abs(selectionBoxEnd.x - selectionBoxStart.x),
      height: Math.abs(selectionBoxEnd.y - selectionBoxStart.y)
    }
    
    // Find rectangles fully within box
    const selected = rectangles.filter(rect => {
      return rect.x >= box.x &&
             rect.y >= box.y &&
             rect.x + rect.width <= box.x + box.width &&
             rect.y + rect.height <= box.y + box.height
    })
    
    if (selected.length > 0) {
      selectMultiple(selected.map(r => r.id))
    }
  }
  
  // Clear selection box
  setSelectionBoxStart(null)
  setSelectionBoxEnd(null)
}, [selectionBoxStart, selectionBoxEnd, rectangles, selectMultiple])

// Updated keyboard shortcuts
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (selectionLocked) return
  
  // Select All: Cmd+A
  if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
    e.preventDefault()
    selectAll()
    return
  }
  
  // Copy: Cmd+C
  if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
    e.preventDefault()
    if (selectedRectangleIds.size > 0) {
      copySelectedRectangles()
    }
    return
  }
  
  // Paste: Cmd+V
  if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
    e.preventDefault()
    pasteRectangles()
    return
  }
  
  // Delete: Delete/Backspace
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    if (selectedRectangleIds.size > 0) {
      deleteSelectedRectangles()
    }
    return
  }
  
  // Duplicate: Cmd+D (only works with single selection)
  if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
    e.preventDefault()
    if (selectedRectangleIds.size === 1 && primarySelectionId) {
      duplicateRectangle(primarySelectionId)
    } else if (selectedRectangleIds.size > 1) {
      showToast('Duplicate only works with single selection')
    }
    return
  }
  
  // Layer operations: Only work with single selection
  if ((e.metaKey || e.ctrlKey) && e.key === ']') {
    e.preventDefault()
    if (primarySelectionId && selectedRectangleIds.size === 1) {
      if (e.shiftKey) {
        bringToFront(primarySelectionId)
      } else {
        bringForward(primarySelectionId)
      }
    } else if (selectedRectangleIds.size > 1) {
      showToast('Layer operations only work with single selection')
    }
    return
  }
  
  if ((e.metaKey || e.ctrlKey) && e.key === '[') {
    e.preventDefault()
    if (primarySelectionId && selectedRectangleIds.size === 1) {
      if (e.shiftKey) {
        sendToBack(primarySelectionId)
      } else {
        sendBackward(primarySelectionId)
      }
    } else if (selectedRectangleIds.size > 1) {
      showToast('Layer operations only work with single selection')
    }
    return
  }
  
  // Show shortcuts: ?
  if (e.key === '?') {
    e.preventDefault()
    setShowShortcuts(true)
    return
  }
  
  // ... rest of keyboard handling (arrows, 0, etc.)
}, [
  selectionLocked,
  selectedRectangleIds,
  primarySelectionId,
  selectAll,
  copySelectedRectangles,
  pasteRectangles,
  deleteSelectedRectangles,
  duplicateRectangle,
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
  showToast
])

// Render with selection box
return (
  <div className="canvas-container">
    {/* Canvas stats, shortcuts modal, etc. */}
    
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      // ... other stage props
    >
      <Layer>
        {/* Rectangles */}
        {sortedRectangles.map(rect => (
          <Rectangle
            key={rect.id}
            rectangle={rect}
            isSelected={selectedRectangleIds.has(rect.id)}
            isPrimary={rect.id === primarySelectionId}
            onSelect={(additive) => selectRectangle(rect.id, additive)}
          />
        ))}
        
        {/* Cursors */}
        {cursors.map(cursor => (
          <Cursor key={cursor.userId} cursor={cursor} />
        ))}
        
        {/* Selection box */}
        {selectionBoxStart && selectionBoxEnd && (
          <SelectionBox
            x={Math.min(selectionBoxStart.x, selectionBoxEnd.x)}
            y={Math.min(selectionBoxStart.y, selectionBoxEnd.y)}
            width={Math.abs(selectionBoxEnd.x - selectionBoxStart.x)}
            height={Math.abs(selectionBoxEnd.y - selectionBoxStart.y)}
          />
        )}
      </Layer>
    </Stage>
  </div>
)
```

#### 3. `/src/components/canvas/Rectangle.tsx` ⚠️ UPDATED

Update props to support multi-select:

```typescript
interface RectangleProps {
  rectangle: RectangleType
  isSelected: boolean     // NEW: Is this rectangle in selection set?
  isPrimary: boolean      // NEW: Is this the primary selection?
  onSelect: (additive: boolean) => void  // NEW: Pass additive flag
}

const Rectangle: React.FC<RectangleProps> = ({
  rectangle,
  isSelected,
  isPrimary,
  onSelect
}) => {
  const handleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    stopEventPropagation(e)
    const additive = e.evt.metaKey || e.evt.ctrlKey
    onSelect(additive)
  }, [onSelect])
  
  return (
    <Group onClick={handleClick}>
      {/* Rectangle body */}
      <Rect
        x={rectangle.x}
        y={rectangle.y}
        width={rectangle.width}
        height={rectangle.height}
        fill={rectangle.color}
        stroke={isSelected ? SELECTION_COLORS.STROKE : borderColor}
        strokeWidth={isSelected ? SELECTION_COLORS.STROKE_WIDTH : DEFAULT_RECT.STROKE_WIDTH}
        draggable={isSelected}
        // ... other props
      />
      
      {/* Only show resize handles on primary selection */}
      {isPrimary && (
        <>
          {/* Resize handles components */}
          <ResizeHandle position="tl" ... />
          <ResizeHandle position="tr" ... />
          {/* ... other handles */}
        </>
      )}
    </Group>
  )
}

export default Rectangle
```

#### 4. `/src/components/canvas/EnhancedColorPicker.tsx`

Update to work with multi-select:

```typescript
interface EnhancedColorPickerProps {
  selectedRectangleIds: Set<string>  // Changed from selectedRectangleId
}

const EnhancedColorPicker: React.FC<EnhancedColorPickerProps> = ({
  selectedRectangleIds
}) => {
  const { changeSelectedRectanglesColor } = useCanvas()  // Use bulk operation
  const { user } = useAuth()
  const [hexInput, setHexInput] = useState('')
  const [colorHistory, setColorHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const handleQuickColor = async (color: string) => {
    if (selectedRectangleIds.size > 0) {
      await changeSelectedRectanglesColor(color)
      addToHistory(color)
    }
  }

  const handleHexSubmit = async () => {
    if (selectedRectangleIds.size === 0) return
    
    const hex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`
    if (!/^#[0-9A-F]{6}$/i.test(hex)) {
      alert('Invalid hex color. Use format: #FF5733 or FF5733')
      return
    }
    
    await changeSelectedRectanglesColor(hex)
    addToHistory(hex)
    setHexInput('')
  }
  
  // ... rest of implementation (history loading, etc.)
  
  const hasSelection = selectedRectangleIds.size > 0
  
  return (
    <div className="enhanced-color-picker">
      <div className="quick-colors">
        <button
          onClick={() => handleQuickColor(RECTANGLE_COLORS.RED)}
          style={{ background: RECTANGLE_COLORS.RED }}
          title="Red"
          disabled={!hasSelection}
        />
        {/* ... other color buttons */}
      </div>

      <div className="hex-input-group">
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleHexSubmit()}
          placeholder="#FF5733"
          maxLength={7}
          disabled={!hasSelection}
        />
        <button onClick={handleHexSubmit} disabled={!hasSelection}>
          Apply
        </button>
      </div>
      
      {/* Optional: Show selection count */}
      {selectedRectangleIds.size > 1 && (
        <div className="selection-count">
          {selectedRectangleIds.size} rectangles selected
        </div>
      )}
      
      {/* ... color history */}
    </div>
  )
}
```

#### 5. `/src/components/layout/Header.tsx`

Update to pass new props:

```typescript
<EnhancedColorPicker selectedRectangleIds={selectedRectangleIds} />
```

#### 6. `/src/components/ui/KeyboardShortcutsModal.tsx`

Add multi-select shortcuts:

```typescript
const SHORTCUTS: Shortcut[] = [
  // ... existing shortcuts
  
  // Selection (NEW category)
  { keys: 'Click', description: 'Select single rectangle', category: 'Selection' },
  { keys: 'Cmd/Ctrl+Click', description: 'Add/remove from selection', category: 'Selection' },
  { keys: 'Shift+Click', description: 'Select range', category: 'Selection' },
  { keys: 'Drag on canvas', description: 'Select multiple (box)', category: 'Selection' },
  { keys: 'Cmd/Ctrl+A', description: 'Select all', category: 'Selection' },
  { keys: 'Escape', description: 'Clear selection', category: 'Selection' },
  
  // Update existing clipboard shortcuts
  { keys: 'Cmd/Ctrl+C', description: 'Copy selected (works with multiple)', category: 'Clipboard' },
  { keys: 'Cmd/Ctrl+V', description: 'Paste (works with multiple)', category: 'Clipboard' },
  { keys: 'Cmd/Ctrl+D', description: 'Duplicate (single selection only)', category: 'Clipboard' },
  
  // ... rest
]
```

#### 7. `/src/services/aiAgent.ts`

Update to use `primarySelectionId`:

```typescript
// In captureSnapshot() - capture primary selection ID
const captureSnapshot = useCallback((): CommandSnapshot => {
  // ... existing viewport capture
  
  return {
    canvasState: getCanvasState(),
    viewportInfo: getViewportInfo(),
    selectedShapeId: primarySelectionId,  // Use primary instead of single
    timestamp: Date.now()
  }
}, [primarySelectionId, /* ... */])

// Commands requiring single selection now use primary
// If multiple selected, AI operates on primary selection
```

### Testing Checklist

**Manual Testing - Selection Methods:**
- [ ] Click selects single rectangle (clears others)
- [ ] Cmd/Ctrl+Click adds rectangle to selection
- [ ] Cmd/Ctrl+Click removes rectangle from selection (toggle)
- [ ] Shift+Click selects range (all between two clicks)
- [ ] Drag on canvas creates selection box
- [ ] Drag selection box selects all rectangles fully within bounds
- [ ] Cmd/Ctrl+A selects all rectangles
- [ ] Escape clears selection
- [ ] Click on canvas (empty space) clears selection (when not dragging)

**Manual Testing - Visual Feedback:**
- [ ] All selected rectangles show red border (3px)
- [ ] Only primary selection shows resize handles
- [ ] Selection box appears during drag (transparent blue, dashed border)
- [ ] Selection box disappears on mouse up
- [ ] Selection count indicator shows correct number (if implemented)

**Manual Testing - Operations with Multi-Select:**
- [ ] Copy (Cmd+C) copies all selected rectangles
- [ ] Paste (Cmd+V) pastes all copied rectangles with offset
- [ ] Pasted rectangles are all selected after paste
- [ ] Can paste same set multiple times
- [ ] Delete (Delete/Backspace) deletes all selected
- [ ] Color change (color picker) changes all selected
- [ ] Duplicate (Cmd+D) only works with single selection
- [ ] Duplicate with multiple selected shows helpful message
- [ ] Layer operations only work with single selection
- [ ] Layer operations with multiple selected show helpful message

**Manual Testing - Migration from Phase 3A:**
- [ ] All Phase 3A features still work correctly
- [ ] Copy/paste from Phase 3A now works with multiple
- [ ] Enhanced color picker from Phase 3A works with multiple
- [ ] Layer operations from Phase 3A still work (on primary)
- [ ] Keyboard shortcuts from Phase 3A still work

**Manual Testing - Real-Time Sync:**
- [ ] Multi-select works independently for each user
- [ ] User A selects multiple, User B sees User A's cursors
- [ ] Operations sync: User A deletes 3, User B sees all 3 disappear
- [ ] Exclusive selection still works per rectangle
- [ ] No conflicts when multiple users work on different rectangles

**Manual Testing - Edge Cases:**
- [ ] Select all (Cmd+A) with 100+ rectangles performs well
- [ ] Drag selection with 100+ rectangles performs well
- [ ] Copy/paste 20+ rectangles at once works
- [ ] Delete 50+ rectangles at once works
- [ ] Selection state cleared when rectangles are deleted by others
- [ ] Primary selection updates correctly when primary is deleted

**AI Testing:**
- [ ] AI commands still work with single rectangle selected
- [ ] AI commands work correctly when multiple rectangles selected (operates on primary)
- [ ] AI gives clear feedback about operating on primary when multiple selected
- [ ] All Phase 3A AI features (duplicate, layer operations) still work
- [ ] AI operations sync to all users

### Success Criteria
- ✅ All multi-select methods work smoothly
- ✅ Visual feedback is clear and professional
- ✅ All operations updated to support multi-select
- ✅ Copy/paste works with multiple items
- ✅ Bulk operations (delete, color) work correctly
- ✅ Single-selection operations (duplicate, layer) give helpful messages for multiple
- ✅ No breaking changes to AI agent functionality
- ✅ All Phase 3A features still work correctly
- ✅ Real-time sync verified with 2+ browsers
- ✅ Performance is acceptable (tested with 100+ rectangles)
- ✅ No console errors

---

## Phase 3B Completion Checklist

Before moving to Phase 3C, verify:

### Functionality
- [ ] PR #4 merged and thoroughly tested
- [ ] All 5 selection methods work perfectly
- [ ] Visual feedback is clear (borders, handles, selection box)
- [ ] Copy/paste works with multiple items
- [ ] Delete works with multiple items
- [ ] Color change works with multiple items
- [ ] Duplicate gives helpful message for multiple
- [ ] Layer operations give helpful message for multiple
- [ ] Real-time sync works for all multi-select operations

### Migration Verification
- [ ] All Phase 3A features still work correctly
- [ ] No regression in copy/paste functionality
- [ ] No regression in color picker functionality
- [ ] No regression in layer operations
- [ ] No regression in AI agent functionality

### Code Quality
- [ ] All tests passing (run `npx vitest run`)
- [ ] No console errors or warnings
- [ ] Code is well-commented
- [ ] No TODO comments left behind
- [ ] Breaking changes documented

### Documentation
- [ ] README updated with multi-select instructions
- [ ] Keyboard shortcuts modal updated
- [ ] Migration notes documented (if needed for team)

### Performance
- [ ] Tested with 2+ concurrent users
- [ ] Multi-select works smoothly with 100+ rectangles
- [ ] Drag selection performs well
- [ ] Bulk operations perform acceptably

### AI Integration
- [ ] AI agent still works correctly
- [ ] AI operates on primary selection when multiple selected
- [ ] All Phase 3A AI features still work
- [ ] AI gives clear feedback about selection state

---

## Breaking Changes Summary

This PR introduces breaking changes. Document for future reference:

### Changed Interfaces
- `CanvasContextType`: Selection state changed from single to multi
- Rectangle component props: Added `isSelected`, `isPrimary`, updated `onSelect`

### Changed Method Signatures
- `selectRectangle(id)` → `selectRectangle(id, additive?)`
- `copyRectangle(id)` → `copySelectedRectangles()`
- `pasteRectangle()` → `pasteRectangles()` (now handles multiple)

### New State
- `selectedRectangleIds: Set<string>`
- `primarySelectionId: string | null`
- `clipboardRectangles: Rectangle[]` (was `clipboardRectangle`)

### Migration Notes
All components using `selectedRectangleId` must be updated to use `selectedRectangleIds.has(id)` instead. Components needing single selection (AI agent, layer operations) should use `primarySelectionId`.

---

## Next Steps

**Proceed to Phase 3C**: [Shape Expansion](./phase3c-shapes.md)

Phase 3C adds new shape types (Circle, Line, Text) using separate collections approach. With multi-select complete, users will be able to select and manipulate different shape types together.

**Note**: Phase 3C can partially overlap with Phase 3D development if desired, as they don't have hard dependencies. However, completing Phase 3C first is recommended for a cleaner progression.

