# Phase 3B: Selection Model Refactor

**Focus**: Convert from single selection to multi-select (Breaking Change)  
**PRs**: 4  
**Work Level**: Medium-High  
**Dependencies**: Phase 3A complete  
**Status**: ✅ **COMPLETED** (October 2025)

> **⚠️ Before Implementation:** Review this plan and ask questions before proceeding. Consider whether any plans need to change first. Also re-read the sibling file README.md to ensure broader context.

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
- Industry-standard interaction pattern (Shift+Drag selection box)
- Copy/paste/duplicate (from PR #1) automatically work with multiple items
- Enables professional workflows
- Pan mode (Spacebar+Drag) for easier canvas navigation

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
1. **Click on rectangle** - Select single (clear others)
2. **Cmd/Ctrl+Click on rectangle** - Add/remove from selection (toggle)
3. **Shift+Drag on canvas** - Draw selection box, select all fully contained rectangles
4. **Cmd/Ctrl+A** - Select all available rectangles (skip those selected by others)
5. **Escape** - Clear selection

**Selection Limit:**
- Maximum 25 rectangles can be selected at once
- If selection box would select >25 rectangles, show toast: "Selection too large (max 25 rectangles)"
- Existing selection is cleared, no rectangles selected

**Canvas Interaction Model:**
- **Click on empty space** - Create new rectangle (unchanged from Phase 3A)
- **Shift+Drag on empty space** - Draw selection box (no ambiguity, no detection needed)
- **Spacebar + Drag** - Pan canvas (new pan mode)
- **Scroll wheel** - Zoom in/out (unchanged)
- **Arrow keys** - Navigate canvas (unchanged)

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
- `selectedRectangleIds: Set<string>` - All selected rectangle IDs (local state)
- `primarySelectionId: string | null` - Last clicked rectangle (shows resize handles)
- **Firebase**: Use existing `selectedBy` field on each rectangle - no schema changes needed
  - When selecting rectangles, check THEN set `selectedBy: userId` sequentially (one at a time)
  - **Check before each write** to minimize race conditions with other users
  - When deselecting, clear `selectedBy` on each rectangle
  - Exclusive selection: Can't select rectangles with `selectedBy !== currentUser`
  - Filter rectangles by `selectedBy === userId` to reconstruct selection
  - **Selection limit**: Maximum 25 rectangles, enforced before Firebase writes

**Clipboard Updates:**
- Change `clipboardRectangle` to `clipboardRectangles: Rectangle[]` (plural)
- Copy stores all selected rectangles
- Paste creates all with same relative positions maintained
- Calculate bounding box of clipboard items, apply uniform offset to preserve spatial relationships

**Drag Selection Box:**
- **Shift+Drag on empty space** activates selection box
- **Design Decision**: Using Shift+Drag (vs. regular drag) for simplicity
  - No click vs drag detection logic needed (no ">5px threshold")
  - Clear user intent - Shift explicitly activates selection mode
  - Industry standard (Figma, Adobe XD use Shift+Drag)
  - Simpler implementation, fewer edge cases
- **Rectangle dragging disabled while Shift held** to prevent accidental drags
  - Rectangles: `draggable={isSelected && !isShiftPressed}`
  - Resize handles hidden during Shift mode
  - Ensures clean selection box UX
- Track mouse down/move/up on stage when Shift is held
- Draw transparent blue rectangle during drag
- On mouse up, select all rectangles that are **fully contained** within selection box
- Use intersection detection: rectangle must be completely inside box bounds
- If >25 rectangles would be selected, show toast and don't select any
- Cancel with Escape key (cancels box and clears selection)

**Pan Mode:**
- Hold Spacebar to enter pan mode (cursor changes to hand icon)
- Spacebar + Drag moves the canvas viewport
- Release Spacebar to exit pan mode
- Stage `draggable` prop must respect pan mode state

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

// UPDATED: selectRectangle now supports additive selection with Firebase sync
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
    showToast(`Rectangle is currently selected by another user`)
    return
  }
  
  if (!additive) {
    // Clear all previous selections in Firebase first
    for (const prevId of selectedRectangleIds) {
      await canvasService.clearSelection(prevId)
    }
    
    // Then select this one
    setSelectedRectangleIds(new Set([rectangleId]))
    setPrimarySelectionId(rectangleId)
    await canvasService.selectRectangle(rectangleId, user.uid, username!)
  } else {
    // Add/remove from selection (toggle)
    const isCurrentlySelected = selectedRectangleIds.has(rectangleId)
    
    if (isCurrentlySelected) {
      // Remove from selection - clear Firebase
      await canvasService.clearSelection(rectangleId)
      
      setSelectedRectangleIds(prev => {
        const next = new Set(prev)
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
        return next
      })
    } else {
      // Add to selection - set Firebase
      await canvasService.selectRectangle(rectangleId, user.uid, username!)
      
      setSelectedRectangleIds(prev => new Set(prev).add(rectangleId))
      setPrimarySelectionId(rectangleId)
    }
  }
}, [selectionLocked, user, username, rectangles, selectedRectangleIds, primarySelectionId, showToast])

// NEW: Select multiple rectangles (used by drag selection box)
const selectMultiple = useCallback(async (rectangleIds: string[]) => {
  if (selectionLocked) return
  if (!user) return
  
  // Enforce selection limit
  if (rectangleIds.length > 25) {
    showToast('Selection too large (max 25 rectangles)')
    // Clear selection
    for (const prevId of selectedRectangleIds) {
      await canvasService.clearSelection(prevId)
    }
    setSelectedRectangleIds(new Set())
    setPrimarySelectionId(null)
    return
  }
  
  // Clear previous selections
  for (const prevId of selectedRectangleIds) {
    await canvasService.clearSelection(prevId)
  }
  
  // Select new ones sequentially, checking before each write
  const selected: string[] = []
  const skipped: string[] = []
  
  for (const id of rectangleIds) {
    const rect = rectangles.find(r => r.id === id)
    
    // Check right before writing to minimize race condition
    if (rect && (!rect.selectedBy || rect.selectedBy === user.uid)) {
      await canvasService.selectRectangle(id, user.uid, username!)
      selected.push(id)
    } else {
      skipped.push(id)
    }
  }
  
  setSelectedRectangleIds(new Set(selected))
  setPrimarySelectionId(selected[selected.length - 1] || null)
  
  if (skipped.length > 0) {
    showToast(`Selected ${selected.length}, ${skipped.length} already taken by other users`)
  } else {
    showToast(`Selected ${selected.length} rectangles`)
  }
}, [selectionLocked, user, username, rectangles, selectedRectangleIds, showToast])

// NEW: Select all available rectangles (skip those selected by others)
const selectAll = useCallback(async () => {
  if (selectionLocked) return
  if (!user) return
  
  // Filter to only available rectangles
  const availableIds = rectangles
    .filter(r => !r.selectedBy || r.selectedBy === user.uid)
    .map(r => r.id)
  
  // Enforce selection limit
  if (availableIds.length > 25) {
    showToast(`Too many rectangles (${availableIds.length}). Max selection is 25.`)
    return
  }
  
  // Clear previous selections
  for (const prevId of selectedRectangleIds) {
    await canvasService.clearSelection(prevId)
  }
  
  // Select all available ones
  for (const id of availableIds) {
    await canvasService.selectRectangle(id, user.uid, username!)
  }
  
  setSelectedRectangleIds(new Set(availableIds))
  setPrimarySelectionId(availableIds[availableIds.length - 1] || null)
  
  showToast(`Selected all ${availableIds.length} rectangles`)
}, [selectionLocked, user, username, rectangles, selectedRectangleIds, showToast])

// UPDATED: Clear selection (clear Firebase for all selected rectangles)
const clearSelection = useCallback(async () => {
  if (!user) return
  
  // Clear all selections in Firebase
  for (const id of selectedRectangleIds) {
    await canvasService.clearSelection(id)
  }
  
  setSelectedRectangleIds(new Set())
  setPrimarySelectionId(null)
}, [user, selectedRectangleIds])

// NEW: Clear selection on sign-out
useEffect(() => {
  if (!user) {
    setSelectedRectangleIds(new Set())
    setPrimarySelectionId(null)
  }
}, [user])

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

// UPDATED from PR #1: Paste now works with multiple and preserves relative positions
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
    
    // Calculate bounding box of all clipboard rectangles
    const minX = Math.min(...clipboardRectangles.map(r => r.x))
    const minY = Math.min(...clipboardRectangles.map(r => r.y))
    
    // Paste all rectangles with same relative positions
    for (const original of clipboardRectangles) {
      // Calculate position relative to group's top-left
      const relativeX = original.x - minX
      const relativeY = original.y - minY
      
      // Apply uniform offset to entire group
      const newX = Math.min(
        minX + PASTE_OFFSET + relativeX,
        CANVAS_WIDTH - original.width
      )
      const newY = Math.min(
        minY + PASTE_OFFSET + relativeY,
        CANVAS_HEIGHT - original.height
      )
      
      const input: RectangleInput = {
        x: newX,
        y: newY,
        width: original.width,
        height: original.height,
        color: original.color
      }
      
      const newRectangle = await canvasService.createRectangle(input)
      if (newRectangle) {
        newIds.push(newRectangle.id)
        // Select the newly pasted rectangle
        await canvasService.selectRectangle(newRectangle.id, user.uid, username!)
      }
    }
    
    // Select all newly pasted rectangles
    setSelectedRectangleIds(new Set(newIds))
    setPrimarySelectionId(newIds[newIds.length - 1] || null)
    
    const count = newIds.length
    showToast(`Pasted ${count} rectangle${count > 1 ? 's' : ''}`)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to paste rectangles')
  }
}, [user, username, clipboardRectangles, showToast, setError])

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
const [isShiftPressed, setIsShiftPressed] = useState(false)
const [isPanning, setIsPanning] = useState(false)

// Compute cursor class (for CSS-based cursor styling)
const cursorClass = isPanning ? 'panning' : (isShiftPressed ? 'selection-mode' : '')

// Transform screen coordinates to canvas coordinates (accounts for zoom/pan)
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

// Handle stage mouse down - Shift+Drag for selection box, otherwise create rectangle
const handleStageMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
  // Only if clicking on stage (not on rectangles)
  if (e.target === e.target.getStage()) {
    const pos = e.target.getStage()!.getPointerPosition()
    if (!pos) return
    
    const canvasPos = transformToCanvasCoords(pos)
    
    if (isPanning) {
      // Pan mode is handled by Stage draggable prop
      return
    }
    
    if (isShiftPressed) {
      // Start selection box
      setSelectionBoxStart(canvasPos)
      setSelectionBoxEnd(canvasPos)
    } else {
      // Create rectangle
      createRectangle(e.evt.clientX, e.evt.clientY)
    }
  }
}, [transformToCanvasCoords, isShiftPressed, isPanning, createRectangle])

// Handle stage mouse move (draw selection box)
const handleStageMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
  if (selectionBoxStart && isShiftPressed) {
    const pos = e.target.getStage()!.getPointerPosition()
    if (pos) {
      const canvasPos = transformToCanvasCoords(pos)
      setSelectionBoxEnd(canvasPos)
    }
  }
}, [selectionBoxStart, isShiftPressed, transformToCanvasCoords])

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
    
    // Find rectangles FULLY within box (fully contained)
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
  // Handle Shift key (for selection box)
  if (e.key === 'Shift') {
    setIsShiftPressed(true)
  }
  
  // Handle Spacebar (for pan mode)
  if (e.key === ' ' && !isPanning) {
    e.preventDefault()
    setIsPanning(true)
  }
  
  // Escape: Clear selection and cancel selection box
  if (e.key === 'Escape') {
    e.preventDefault()
    clearSelection()
    setSelectionBoxStart(null)
    setSelectionBoxEnd(null)
    return
  }
  
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
  
  // ... rest of keyboard handling (arrows, 0, etc.)
}, [
  isPanning,
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
  clearSelection,
  showToast
])

const handleKeyUp = useCallback((e: KeyboardEvent) => {
  // Release Shift key (cancel selection box if active)
  if (e.key === 'Shift') {
    setIsShiftPressed(false)
    setSelectionBoxStart(null)
    setSelectionBoxEnd(null)
  }
  
  // Release Spacebar (exit pan mode)
  if (e.key === ' ') {
    setIsPanning(false)
  }
}, [])

useEffect(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  }
}, [handleKeyDown, handleKeyUp])

// Render with selection box and pan mode
return (
  <div className="canvas-container">
    {/* Canvas stats, shortcuts modal, etc. */}
    
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      draggable={isPanning} // Only draggable in pan mode
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      className={cursorClass}  // Use CSS class for cursor styling (not style prop)
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
            isShiftPressed={isShiftPressed}  // Pass to Rectangle to disable dragging
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

**Add to `/src/components/canvas/Canvas.css`:**

```css
/* Pan mode cursor - follows existing dragging pattern */
.canvas-wrapper canvas.panning,
.canvas-wrapper .panning canvas {
  cursor: grab !important;
}

.canvas-wrapper canvas.panning:active,
.canvas-wrapper .panning:active canvas {
  cursor: grabbing !important;
}

/* Selection box mode cursor */
.canvas-wrapper canvas.selection-mode,
.canvas-wrapper .selection-mode canvas {
  cursor: crosshair !important;
}
```

#### 3. `/src/components/canvas/Rectangle.tsx` ⚠️ UPDATED

Update props to support multi-select and disable dragging during selection box mode:

```typescript
interface RectangleProps {
  rectangle: RectangleType
  isSelected: boolean      // NEW: Is this rectangle in selection set?
  isPrimary: boolean       // NEW: Is this the primary selection?
  isShiftPressed: boolean  // NEW: Is Shift key held (selection box mode)?
  onSelect: (additive: boolean) => void  // NEW: Pass additive flag
}

const Rectangle: React.FC<RectangleProps> = ({
  rectangle,
  isSelected,
  isPrimary,
  isShiftPressed,
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
        draggable={isSelected && !isShiftPressed}  // Disable dragging in selection box mode
        // ... other props
      />
      
      {/* Only show resize handles on primary selection */}
      {isPrimary && !isShiftPressed && (  // Also hide handles during selection box mode
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

#### 4. `/src/components/canvas/ColorPicker.tsx` ⚠️ UPDATED

Update to work with multi-select and show question mark for mixed colors:

```typescript
interface ColorPickerProps {
  selectedRectangleIds: Set<string>  // Changed from selectedRectangleId
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedRectangleIds
}) => {
  const { rectangles, changeSelectedRectanglesColor } = useCanvas()
  const { user } = useAuth()
  const [hexInput, setHexInput] = useState('')
  const [colorHistory, setColorHistory] = useState<string[]>([])
  
  // Load color history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('collabcanvas_colorHistory')
    if (saved) {
      try {
        setColorHistory(JSON.parse(saved))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])
  
  // Save color history to localStorage
  const saveHistory = useCallback((history: string[]) => {
    localStorage.setItem('collabcanvas_colorHistory', JSON.stringify(history))
    setColorHistory(history)
  }, [])
  
  // Add color to history (max 5 recent colors)
  const addToHistory = useCallback((color: string) => {
    const MAX_HISTORY = 5
    setColorHistory(prev => {
      // Remove if already exists
      const filtered = prev.filter(c => c !== color)
      // Add to front
      const updated = [color, ...filtered]
      // Limit to MAX_HISTORY
      const trimmed = updated.slice(0, MAX_HISTORY)
      // Save to localStorage
      saveHistory(trimmed)
      return trimmed
    })
  }, [saveHistory])
  
  // Get colors of all selected rectangles
  const selectedColors = Array.from(selectedRectangleIds)
    .map(id => rectangles.find(r => r.id === id)?.color)
    .filter(Boolean) as string[]
  
  const hasMixedColors = selectedColors.length > 1 && 
    !selectedColors.every(c => c === selectedColors[0])
  
  const singleColor = !hasMixedColors && selectedColors.length > 0 
    ? selectedColors[0] 
    : null

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
  
  const hasSelection = selectedRectangleIds.size > 0
  
  return (
    <div className="color-picker">
      {/* Show current color or "?" for mixed */}
      <div className="current-color">
        {hasMixedColors ? (
          <div className="color-preview mixed">?</div>
        ) : singleColor ? (
          <div className="color-preview" style={{ backgroundColor: singleColor }} />
        ) : null}
      </div>
      
      {/* Quick color presets */}
      <div className="quick-colors">
        <button 
          onClick={() => handleQuickColor('#FF5733')}
          style={{ backgroundColor: '#FF5733' }}
          title="Red"
          disabled={!hasSelection}
        />
        <button 
          onClick={() => handleQuickColor('#33FF57')}
          style={{ backgroundColor: '#33FF57' }}
          title="Green"
          disabled={!hasSelection}
        />
        <button 
          onClick={() => handleQuickColor('#3357FF')}
          style={{ backgroundColor: '#3357FF' }}
          title="Blue"
          disabled={!hasSelection}
        />
        {/* ... more colors */}
      </div>
      
      {/* Hex input */}
      <form onSubmit={(e) => { e.preventDefault(); handleHexSubmit(); }}>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          placeholder={hasMixedColors ? "Mixed colors" : "HEX (e.g., FF5733)"}
          disabled={!hasSelection}
          maxLength={7}
        />
        <button type="submit" disabled={!hasSelection}>Apply</button>
      </form>
      
      {selectedRectangleIds.size > 1 && (
        <div className="selection-count">
          {selectedRectangleIds.size} rectangles selected
        </div>
      )}
      
      {/* Color history */}
      {colorHistory.length > 0 && (
        <div className="color-history">
          <span>Recent:</span>
          {colorHistory.map((color, i) => (
            <button
              key={i}
              onClick={() => handleQuickColor(color)}
              style={{ backgroundColor: color }}
              title={color}
              disabled={!hasSelection}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ColorPicker
```

**New CSS for mixed color indicator:**

```css
.color-preview.mixed {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: #64748b;
  background: linear-gradient(135deg, #f1f5f9 25%, #e2e8f0 25%, #e2e8f0 50%, #f1f5f9 50%, #f1f5f9 75%, #e2e8f0 75%);
  background-size: 8px 8px;
}
```

#### 5. `/src/components/layout/Header.tsx` ⚠️ UPDATED

Update to pass new props to ColorPicker:

```typescript
<ColorPicker selectedRectangleIds={selectedRectangleIds} />
```

#### 6. `/src/components/canvas/KeyboardShortcuts.tsx` ⚠️ UPDATED

Add multi-select shortcuts (component already exists in sidebar, update text):

```typescript
const SHORTCUTS: Shortcut[] = [
  // ... existing shortcuts
  
  // Selection (NEW category)
  { keys: 'Click', description: 'Select single rectangle', category: 'Selection' },
  { keys: 'Cmd/Ctrl+Click', description: 'Add/remove from selection', category: 'Selection' },
  { keys: 'Shift+Drag', description: 'Select multiple (box)', category: 'Selection' },
  { keys: 'Cmd/Ctrl+A', description: 'Select all', category: 'Selection' },
  { keys: 'Escape', description: 'Clear selection', category: 'Selection' },
  { keys: 'Delete/Backspace', description: 'Delete selected', category: 'Selection' },
  
  // Canvas Navigation (NEW category)
  { keys: 'Spacebar+Drag', description: 'Pan canvas', category: 'Navigation' },
  { keys: 'Scroll wheel', description: 'Zoom in/out', category: 'Navigation' },
  { keys: 'Arrow keys', description: 'Navigate canvas', category: 'Navigation' },
  { keys: '0', description: 'Reset zoom', category: 'Navigation' },
  
  // Update existing clipboard shortcuts
  { keys: 'Cmd/Ctrl+C', description: 'Copy selected (works with multiple)', category: 'Clipboard' },
  { keys: 'Cmd/Ctrl+V', description: 'Paste (works with multiple)', category: 'Clipboard' },
  { keys: 'Cmd/Ctrl+D', description: 'Duplicate (single selection only)', category: 'Clipboard' },
  
  // Update layer operations (single selection only from Phase 3A)
  { keys: 'Cmd/Ctrl+]', description: 'Bring to front (single only)', category: 'Layering' },
  { keys: 'Cmd/Ctrl+[', description: 'Send to back (single only)', category: 'Layering' },
  { keys: 'Cmd/Ctrl+Shift+]', description: 'Bring forward (single only)', category: 'Layering' },
  { keys: 'Cmd/Ctrl+Shift+[', description: 'Send backward (single only)', category: 'Layering' },
  
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

**High-Value Unit Tests** 🧪

Before implementing, consider these unit tests for critical logic:

1. **`transformToCanvasCoords` (Canvas.tsx)** - HIGH VALUE
   ```typescript
   // Test: Coordinate transformation with zoom
   // Given: Stage scaled to 2x, point at screen (200, 200), stage position (50, 50)
   // Expected: Canvas coords (75, 75) = ((200 - 50) / 2, (200 - 50) / 2)
   ```
   **Why**: Critical for selection box working correctly with zoom/pan. Easy to break.

2. **`selectMultiple` race condition handling (CanvasContext.tsx)** - HIGH VALUE
   ```typescript
   // Test: Skip rectangles already selected by other users
   // Given: 5 rectangles, 2 have selectedBy="otherUser"
   // Expected: Only 3 selected, toast shows "Selected 3, 2 already taken by other users"
   ```
   **Why**: Core multi-user conflict resolution. Complex logic.

3. **`selectMultiple` limit enforcement (CanvasContext.tsx)** - HIGH VALUE
   ```typescript
   // Test: Enforce 25 rectangle limit
   // Given: 30 rectangles in selection box
   // Expected: None selected, toast shows "Selection too large (max 25 rectangles)"
   ```
   **Why**: Important UX constraint, edge case handling.

4. **`pasteRectangles` relative positioning (CanvasContext.tsx)** - HIGH VALUE
   ```typescript
   // Test: Maintain relative positions when pasting multiple
   // Given: 3 clipboard rectangles at [(10,10), (50,10), (30,50)]
   // Expected: Pasted at [(30,30), (70,30), (50,70)] - all offset by (20,20), spacing preserved
   ```
   **Why**: Complex spatial calculation. Easy to get wrong. High user impact.

5. **ColorPicker `addToHistory` (ColorPicker.tsx)** - MEDIUM-HIGH VALUE
   ```typescript
   // Test: Enforce MAX_HISTORY=5, deduplicate, newest first
   // Given: History [A,B,C,D,E], add B
   // Expected: History [B,A,C,D,E] (B moved to front, still 5 items)
   
   // Test: Pop oldest when at limit
   // Given: History [A,B,C,D,E], add F
   // Expected: History [F,A,B,C,D] (E dropped)
   ```
   **Why**: Clear business logic, localStorage interaction.

6. **ColorPicker `hasMixedColors` (ColorPicker.tsx)** - MEDIUM VALUE
   ```typescript
   // Test: Detect mixed colors correctly
   // Given: 3 selected, colors ["#FF0000", "#FF0000", "#00FF00"]
   // Expected: hasMixedColors = true
   
   // Test: Single color not mixed
   // Given: 3 selected, all color "#FF0000"
   // Expected: hasMixedColors = false
   ```
   **Why**: Drives UI state (? indicator). Simple but important.

**Lower Priority (Better as Integration Tests):**
- Mouse/keyboard event handlers (test via integration)
- SelectionBox rendering (visual component)
- `copySelectedRectangles` (straightforward filter/map)
- `deleteSelectedRectangles` (simple loop)
- `changeSelectedRectanglesColor` (simple loop)

**Recommendation**: Focus on tests #1-4 (coordinate transform, selectMultiple, paste positioning). These have the highest complexity-to-value ratio.

---

**Manual Testing - Selection Methods:**
- [ ] Click rectangle selects single (clears others)
- [ ] Cmd/Ctrl+Click adds rectangle to selection
- [ ] Cmd/Ctrl+Click removes rectangle from selection (toggle)
- [ ] Click on empty space (no drag) creates new rectangle
- [ ] Shift+Drag on empty space creates selection box
- [ ] Drag selection box selects all rectangles **fully contained** within bounds (not partially overlapping)
- [ ] Rectangles are not draggable while Shift is held (prevents accidental drags during selection box)
- [ ] Selection box limited to 25 rectangles (toast shown if exceeded)
- [ ] Cmd/Ctrl+A selects all available rectangles (skips those selected by others)
- [ ] Cmd/Ctrl+A with >25 rectangles shows toast and doesn't select
- [ ] Escape clears selection and cancels active selection box
- [ ] Spacebar+Drag pans the canvas (cursor shows grab/hand icon)
- [ ] Release Spacebar exits pan mode
- [ ] Cursor changes to crosshair when Shift is held
- [ ] Cursor changes to grab when Spacebar is held

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
- [ ] **Zoom/Pan Interaction**: Selection box coordinates adjust correctly when canvas is zoomed
- [ ] **Zoom/Pan Interaction**: Selection box coordinates adjust correctly when canvas is panned
- [ ] **Zoom/Pan Interaction**: Drag selection box while zoomed in (2x) selects correct rectangles
- [ ] **Zoom/Pan Interaction**: Drag selection box while zoomed out (0.5x) selects correct rectangles
- [ ] **Zoom/Pan Interaction**: Pan canvas (Spacebar+Drag), then drag selection box - coordinates are correct
- [ ] **Shift + Spacebar Priority**: Holding both Shift and Spacebar activates pan mode (Spacebar takes priority)

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

## Implementation Decisions Summary

This section documents key implementation decisions made during planning:

### **Selection Box Trigger: Shift+Drag**
- **Decision**: Use Shift+Drag to activate selection box (not regular drag)
- **Rationale**: 
  - Simpler implementation (no click vs drag detection logic)
  - Industry standard (Figma, Adobe XD)
  - Clear user intent - Shift explicitly signals selection mode
  - Fewer edge cases to handle
- **Alternative considered**: Regular drag with ">5px detection" (used by Sketch)

### **Firebase Write Pattern: Sequential Check-Then-Write**
- **Decision**: Check `selectedBy` immediately before each write (sequential, not batched)
- **Rationale**:
  - Minimizes race condition window (~10-20ms per rectangle vs ~100-500ms for batch)
  - If another user selects a rectangle during multi-select, we skip it gracefully
  - Better UX: Shows "Selected 8, 2 already taken" instead of overwriting
- **Alternative considered**: Batch all writes together (faster but higher collision risk)

### **Rectangle Dragging During Selection Mode**
- **Decision**: Disable rectangle dragging while Shift is held
- **Implementation**: `draggable={isSelected && !isShiftPressed}`
- **Rationale**:
  - Prevents accidental rectangle drags when trying to draw selection box
  - Clean UX - selection box always activates when dragging over rectangles
  - Minimal complexity (one prop passed down)

### **Cursor Styling: CSS Classes**
- **Decision**: Use `className` prop on Stage (not `style` prop)
- **Rationale**:
  - Matches existing codebase pattern (`.dragging` class)
  - Konva-compatible approach
  - Follows existing CSS: `.canvas-wrapper canvas.panning { cursor: grab !important; }`
- **Alternative**: Direct `style` prop might not work reliably with Konva

### **Escape Key Behavior**
- **Decision**: Escape clears selection AND cancels active selection box
- **Rationale**: Standard behavior, matches user expectations

### **Shift + Spacebar Priority**
- **Decision**: Spacebar takes priority when both keys held
- **Implementation**: `if (isPanning) return` check comes first
- **Rationale**: Pan mode is less common, so prioritize it when user explicitly activates

### **Implementation Variation: Interaction Model (Implemented)**
- **Actual Implementation**: Double-click to create shapes, Click+Drag to pan canvas
- **Originally Planned**: Single-click to create, Spacebar+Drag to pan
- **Rationale for Change**: 
  - Double-click to create is more intentional, reduces accidental shape creation
  - Click+Drag for pan is more discoverable and standard in many tools
  - Added discoverability via first-visit toast and empty canvas message
  - Updated keyboard shortcuts modal accordingly

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

## Quick Local Testing Plan

### **Setup:**
```bash
npm run dev
```
Then open `http://localhost:5173` - this will connect to production Firebase.

---

### **Phase 3B Feature Testing:**

#### **1. Selection Box (Shift+Drag)**
- ✅ Hold **Shift**, drag on empty space → Should see blue transparent selection box with dashed border
- ✅ Draw box around 2-3 rectangles → Should select all fully contained rectangles
- ✅ Release Shift → Cursor returns to normal, can't drag rectangles while Shift held
- ✅ Press **Escape** during drag → Cancels selection box

#### **2. Multi-Select Methods**
- ✅ Click rectangle → Selects single (clears others), shows red border
- ✅ **Cmd/Ctrl+Click** another rectangle → Adds to selection (both red borders)
- ✅ Cmd/Ctrl+Click selected rectangle → Removes from selection (toggle)
- ✅ **Cmd/Ctrl+A** → Selects all rectangles (or shows toast if >25)
- ✅ **Escape** → Clears all selections

#### **3. Primary Selection & Resize Handles**
- ✅ Select 3 rectangles → All have red borders
- ✅ Check resize handles → Only the **last-clicked** rectangle shows handles
- ✅ Click different selected rectangle → Resize handles move to that one

#### **4. Pan Mode (Spacebar)**
- ✅ Hold **Spacebar** → Cursor changes to grab/hand icon
- ✅ Spacebar+Drag → Pans the canvas
- ✅ Release Spacebar → Returns to normal mode

#### **5. Copy/Paste Multiple**
- ✅ Select 2-3 rectangles, press **Cmd+C** → Should see "X rectangles copied" toast
- ✅ Press **Cmd+V** → Should paste all with same relative positions, 20px offset
- ✅ All pasted rectangles should be selected
- ✅ Paste again (Cmd+V) → Creates another set

#### **6. Delete Multiple**
- ✅ Select 2-3 rectangles, press **Delete** or **Backspace** → All should disappear

#### **7. Color Picker with Multi-Select**
- ✅ Select 2 rectangles with **same color** → Color picker shows that color
- ✅ Select 2 rectangles with **different colors** → Color picker shows **?** (mixed)
- ✅ With mixed colors, click a preset color → Both rectangles change to that color

#### **8. Selection Limit**
- ✅ Create 26+ rectangles, try Cmd+A → Should see toast "Maximum 25 rectangles can be selected"
- ✅ Try Shift+Drag over 26+ rectangles → Should see same toast

#### **9. Updated Keyboard Shortcuts**
- ✅ Check left sidebar → "Keyboard Shortcuts" section should include:
  - Space+Drag (Pan mode)
  - Shift+Drag (Select box)
  - Cmd/Ctrl+A (Select all)
  - Esc (Clear selection)

#### **10. AI Agent with Multi-Select**
- ✅ Select 1 rectangle, ask AI: "duplicate it" → Still works for single selection
- ✅ Select multiple rectangles, ask AI: "change color to red" → Should change all selected (uses primary)
- ✅ Without selection, ask AI: "create a rectangle" → Should still work

**Total test time: ~7-8 minutes** ⏱️

---

## Next Steps

**Proceed to Phase 3C**: [Shape Expansion](./phase3c-shapes.md)

Phase 3C adds new shape types (Circle, Line, Text) using separate collections approach. With multi-select complete, users will be able to select and manipulate different shape types together.

**Note**: Phase 3C can partially overlap with Phase 3D development if desired, as they don't have hard dependencies. However, completing Phase 3C first is recommended for a cleaner progression.

