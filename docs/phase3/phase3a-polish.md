# Phase 3A: Polish & Quick Wins

**Focus**: Build on existing rectangle foundation with no breaking changes  
**PRs**: 1-3  
**Work Level**: Low-Medium  
**Dependencies**: None - Start here!

> **⚠️ Before Implementation:** Review this plan and ask questions before proceeding. Consider whether any plans need to change first.

---

## Phase Overview

Phase 3A adds professional polish to existing rectangle features. These PRs deliver immediate user value with minimal risk:

- **PR #1**: Duplicate + Copy/Paste - Core productivity shortcuts
- **PR #2**: Enhanced Color Picker + Keyboard Shortcuts - Professional color tools
- **PR #3**: Layering & Z-Index - Essential for complex layouts

**Why start here?**
- No dependencies on other Phase 3 work
- No breaking changes
- Good warm-up for more complex features
- Immediate user value
- Tests clipboard and layer patterns needed later

---

## PR #1: Duplicate + Copy/Paste

**Branch**: `feature/duplicate-copy-paste`  
**Work Level**: Low  
**Breaking Changes**: None

### Why This PR?
- Core productivity features users expect
- Teaches clipboard pattern for later multi-select (Phase 3B)
- Simple implementation, high value
- Natural progression: duplicate → copy/paste → multi-select copy/paste

### What This PR Delivers

Three related clipboard operations:
1. **Duplicate** (`Cmd+D`): Copy + Paste in one action
2. **Copy** (`Cmd+C`): Store to clipboard
3. **Paste** (`Cmd+V`): Create from clipboard with offset

All work with single selection. Multi-select support comes automatically in PR #4.

### Implementation Strategy

**Clipboard State:**
- Store in CanvasContext state (not localStorage or Browser Clipboard API)
- **Rationale:** Simple, works in all contexts, no permissions needed. Losing clipboard on refresh is standard web behavior.
- Store full rectangle data (x, y, width, height, color)
- Clear on sign out

**Paste Behavior:**
- Offset by **fixed +20px x and y** from original
- **Rationale:** Simple, predictable, matches Figma/Sketch behavior
- Clamp to canvas bounds if would go outside
- Auto-select the pasted rectangle
- Can paste same rectangle multiple times (clipboard persists until next copy)

**AI Integration:**
- Add `duplicateRectangle` tool to Cloud Function
- Update system prompt with duplicate operation
- Support natural language: "duplicate it", "make a copy"

### Files to Update

#### `/src/contexts/CanvasContext.tsx`
Add clipboard state and three new methods:

```typescript
interface CanvasContextType {
  // ... existing methods
  
  // NEW: Clipboard operations
  copyRectangle: (rectangleId: string) => void
  pasteRectangle: () => Promise<Rectangle | null>
  duplicateRectangle: (rectangleId: string) => Promise<Rectangle | null>
  hasClipboardData: () => boolean
}

// Implementation
const [clipboardRectangle, setClipboardRectangle] = useState<Rectangle | null>(null)

// COPY: Store rectangle to clipboard
const copyRectangle = useCallback((rectangleId: string) => {
  const rectangle = rectangles.find(r => r.id === rectangleId)
  if (!rectangle) {
    showToast('Rectangle not found')
    return
  }
  
  setClipboardRectangle(rectangle)
  showToast('Rectangle copied')
}, [rectangles, showToast])

// PASTE: Create from clipboard with offset
const pasteRectangle = useCallback(async (): Promise<Rectangle | null> => {
  if (!user) {
    setError('You must be signed in to paste')
    return null
  }
  
  if (!clipboardRectangle) {
    showToast('Nothing to paste')
    return null
  }
  
  try {
    const PASTE_OFFSET = 20
    const newX = Math.min(
      clipboardRectangle.x + PASTE_OFFSET, 
      CANVAS_WIDTH - clipboardRectangle.width
    )
    const newY = Math.min(
      clipboardRectangle.y + PASTE_OFFSET, 
      CANVAS_HEIGHT - clipboardRectangle.height
    )
    
    const input: RectangleInput = {
      x: newX,
      y: newY,
      width: clipboardRectangle.width,
      height: clipboardRectangle.height,
      color: clipboardRectangle.color,
      createdBy: user.uid,
      createdAt: Date.now()
    }
    
    const pasted = await canvasService.createRectangle(input)
    
    if (pasted) {
      await selectRectangle(pasted.id)
      showToast('Rectangle pasted')
    }
    
    return pasted
  } catch (err: any) {
    console.error('Error pasting rectangle:', err)
    setError(err.message || 'Failed to paste rectangle')
    return null
  }
}, [user, clipboardRectangle, selectRectangle, showToast])

// DUPLICATE: Copy + Paste in one action
const duplicateRectangle = useCallback(async (rectangleId: string): Promise<Rectangle | null> => {
  if (!user) {
    setError('You must be signed in to duplicate')
    return null
  }
  
  const rectangle = rectangles.find(r => r.id === rectangleId)
  if (!rectangle) {
    showToast('Rectangle not found')
    return null
  }
  
  try {
    const DUPLICATE_OFFSET = 20
    const newX = Math.min(
      rectangle.x + DUPLICATE_OFFSET, 
      CANVAS_WIDTH - rectangle.width
    )
    const newY = Math.min(
      rectangle.y + DUPLICATE_OFFSET, 
      CANVAS_HEIGHT - rectangle.height
    )
    
    const input: RectangleInput = {
      x: newX,
      y: newY,
      width: rectangle.width,
      height: rectangle.height,
      color: rectangle.color,
      createdBy: user.uid,
      createdAt: Date.now()
    }
    
    const duplicated = await canvasService.createRectangle(input)
    
    if (duplicated) {
      await selectRectangle(duplicated.id)
      showToast('Rectangle duplicated')
    }
    
    return duplicated
  } catch (err: any) {
    console.error('Error duplicating rectangle:', err)
    setError(err.message || 'Failed to duplicate rectangle')
    return null
  }
}, [user, rectangles, selectRectangle, showToast])

// Helper to check if clipboard has data
const hasClipboardData = useCallback(() => {
  return clipboardRectangle !== null
}, [clipboardRectangle])

// Clear clipboard on sign out
useEffect(() => {
  if (!user) {
    setClipboardRectangle(null)
  }
}, [user])

// Add to context value return
return (
  <CanvasContext.Provider value={{
    // ... existing values
    copyRectangle,
    pasteRectangle,
    duplicateRectangle,
    hasClipboardData,
  }}>
    {children}
  </CanvasContext.Provider>
)
```

#### `/src/components/canvas/Canvas.tsx`
Add keyboard shortcuts:

```typescript
const {
  // ... existing
  copyRectangle,
  pasteRectangle,
  duplicateRectangle,
} = useCanvas()

const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (selectionLocked) return
  
  // ... existing shortcuts
  
  // Copy: Cmd+C (Mac) or Ctrl+C (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
    e.preventDefault()
    if (selectedRectangleId) {
      copyRectangle(selectedRectangleId)
    }
    return
  }
  
  // Paste: Cmd+V (Mac) or Ctrl+V (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
    e.preventDefault()
    pasteRectangle()
    return
  }
  
  // Duplicate: Cmd+D (Mac) or Ctrl+D (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
    e.preventDefault() // Prevent browser bookmark shortcut
    if (selectedRectangleId) {
      duplicateRectangle(selectedRectangleId)
    }
    return
  }
}, [
  selectedRectangleId,
  copyRectangle,
  pasteRectangle,
  duplicateRectangle,
  selectionLocked
])
```

#### `/src/utils/constants.ts`
Add clipboard constants:

```typescript
export const CLIPBOARD = {
  PASTE_OFFSET: 20,     // pixels to offset pasted items
  DUPLICATE_OFFSET: 20  // pixels to offset duplicates
} as const
```

#### `/functions/src/tools.ts` (AI Support)
Add duplicate tool:

```typescript
export const duplicateRectangle = tool({
  description: 'Duplicate the currently selected rectangle with a slight offset',
  parameters: z.object({
    // No parameters needed - uses selected rectangle
  }),
  execute: async () => {
    return { success: true }
  }
})

// Add to tools object
export const tools = {
  createRectangle,
  changeColor,
  moveRectangle,
  resizeRectangle,
  deleteRectangle,
  createMultipleRectangles,
  duplicateRectangle // NEW
}
```

#### `/functions/src/utils/systemPrompt.ts`
Update system prompt:

```typescript
AVAILABLE OPERATIONS:
- Create rectangles (single or multiple)
- Change color (requires selection)
- Move rectangle (requires selection)
- Resize rectangle (requires selection)
- Delete rectangle (requires selection)
- Duplicate rectangle (requires selection) // NEW

When user says "duplicate it" or "make a copy", use duplicateRectangle tool.
```

#### `/src/services/aiAgent.ts`
Handle duplicate command:

```typescript
case 'duplicateRectangle':
  if (!selectedRectangleId) {
    throw new Error('No rectangle selected to duplicate')
  }
  await context.duplicateRectangle(selectedRectangleId)
  break
```

### Testing Checklist

**Manual Testing:**
- [ ] Can copy rectangle with `Cmd+C` / `Ctrl+C`
- [ ] Can paste rectangle with `Cmd+V` / `Ctrl+V`
- [ ] Can duplicate rectangle with `Cmd+D` / `Ctrl+D`
- [ ] Paste/duplicate appears offset from original (+20px x and y)
- [ ] Paste/duplicate has same size, color as original
- [ ] Paste/duplicate is auto-selected after creation
- [ ] Can paste same rectangle multiple times
- [ ] Clipboard persists across paste operations
- [ ] Clipboard cleared on sign out
- [ ] Keyboard shortcuts prevented when no selection (copy/duplicate)
- [ ] Paste works even without selection (if clipboard has data)
- [ ] Keyboard shortcuts prevented during AI processing
- [ ] All operations sync to all users in real-time
- [ ] Original rectangle remains unchanged
- [ ] Pasted/duplicated rectangles stay within canvas bounds
- [ ] Browser shortcuts (Cmd+C, Cmd+V, Cmd+D) are prevented

**AI Testing:**
- [ ] AI can duplicate selected rectangle with various phrasings ("duplicate it", "make a copy", etc.)
- [ ] AI gives helpful error message when asked to duplicate without selection ("Please select a rectangle first")
- [ ] AI duplicate syncs to all users

### Success Criteria
- ✅ Copy, paste, and duplicate operations work with keyboard shortcuts
- ✅ Clipboard state managed correctly
- ✅ AI agent supports duplicate command
- ✅ Duplicated/pasted rectangles properly positioned and selected
- ✅ Real-time sync verified with 2+ browsers
- ✅ No console errors
- ✅ Code is clean and well-commented

---

## PR #2: Enhanced Color Picker + Keyboard Shortcuts

**Branch**: `feature/color-picker-shortcuts`  
**Work Level**: Low  
**Breaking Changes**: None

### Why This PR?
- Professional color tools match industry standards
- Keyboard shortcuts make app more accessible
- No breaking changes, pure enhancement
- Teaches users how to use the app efficiently
- Foundation for custom color palettes

### What This PR Delivers

**Enhanced Color Picker:**
1. Hex code input (e.g., #FF5733)
2. Saved colors history (last 10, per user)
3. Quick color presets
4. Live preview while typing

**Keyboard Shortcuts:**
1. Help overlay (`?` key)
2. Organized by category
3. Searchable shortcuts list

### Implementation Strategy

**Color Picker Enhancements:**
- Keep existing 3-color buttons
- Add hex input field with validation
- Store color history in **localStorage** (not Firebase)
- **Rationale:** Color history doesn't need cross-device sync. localStorage is instant, free, and simpler.
- Show history in expandable section
- Store as `collabcanvas_colorHistory` key

**Shortcuts Modal:**
- Press `?` to show modal overlay
- Group shortcuts by category (Canvas, Clipboard, Edit, Layers, Help)
- Search filter
- Close with X or click outside

### Files to Create

#### `/src/components/canvas/EnhancedColorPicker.tsx`
```typescript
import React, { useState, useEffect } from 'react'
import { useCanvas } from '../../contexts/CanvasContext'
import { RECTANGLE_COLORS } from '../../utils/constants'
import './EnhancedColorPicker.css'

const COLOR_HISTORY_KEY = 'collabcanvas_colorHistory'

interface EnhancedColorPickerProps {
  selectedRectangleId: string | null
}

const EnhancedColorPicker: React.FC<EnhancedColorPickerProps> = ({
  selectedRectangleId
}) => {
  const { changeRectangleColor } = useCanvas()
  const [hexInput, setHexInput] = useState('')
  const [colorHistory, setColorHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Load color history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(COLOR_HISTORY_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setColorHistory(Array.isArray(parsed) ? parsed : [])
      } catch (e) {
        console.error('Failed to parse color history:', e)
      }
    }
  }, [])

  const handleQuickColor = async (color: string) => {
    if (selectedRectangleId) {
      await changeRectangleColor(selectedRectangleId, color)
      addToHistory(color)
    }
  }

  const handleHexSubmit = async () => {
    if (!selectedRectangleId) return
    
    // Validate hex
    const hex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`
    if (!/^#[0-9A-F]{6}$/i.test(hex)) {
      alert('Invalid hex color. Use format: #FF5733 or FF5733')
      return
    }
    
    await changeRectangleColor(selectedRectangleId, hex)
    addToHistory(hex)
    setHexInput('')
  }

  const addToHistory = (color: string) => {
    const updated = [color, ...colorHistory.filter(c => c !== color)].slice(0, 10)
    setColorHistory(updated)
    
    // Save to localStorage
    localStorage.setItem(COLOR_HISTORY_KEY, JSON.stringify(updated))
  }

  return (
    <div className="enhanced-color-picker">
      <div className="quick-colors">
        <button
          onClick={() => handleQuickColor(RECTANGLE_COLORS.RED)}
          style={{ background: RECTANGLE_COLORS.RED }}
          title="Red"
          disabled={!selectedRectangleId}
        />
        <button
          onClick={() => handleQuickColor(RECTANGLE_COLORS.BLUE)}
          style={{ background: RECTANGLE_COLORS.BLUE }}
          title="Blue"
          disabled={!selectedRectangleId}
        />
        <button
          onClick={() => handleQuickColor(RECTANGLE_COLORS.GREEN)}
          style={{ background: RECTANGLE_COLORS.GREEN }}
          title="Green"
          disabled={!selectedRectangleId}
        />
      </div>

      <div className="hex-input-group">
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleHexSubmit()}
          placeholder="#FF5733"
          maxLength={7}
          disabled={!selectedRectangleId}
        />
        <button onClick={handleHexSubmit} disabled={!selectedRectangleId}>
          Apply
        </button>
      </div>

      {colorHistory.length > 0 && (
        <div className="color-history">
          <button onClick={() => setShowHistory(!showHistory)}>
            Recent ({colorHistory.length})
          </button>
          {showHistory && (
            <div className="history-grid">
              {colorHistory.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickColor(color)}
                  style={{ background: color }}
                  title={color}
                  disabled={!selectedRectangleId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EnhancedColorPicker
```

#### `/src/components/ui/KeyboardShortcutsModal.tsx`
```typescript
import React, { useState } from 'react'
import './KeyboardShortcutsModal.css'

interface Shortcut {
  keys: string
  description: string
  category: string
}

const SHORTCUTS: Shortcut[] = [
  // Canvas
  { keys: 'Double-click', description: 'Create rectangle', category: 'Canvas' },
  { keys: 'Click', description: 'Select rectangle', category: 'Canvas' },
  { keys: 'Drag canvas', description: 'Pan view', category: 'Canvas' },
  { keys: 'Scroll', description: 'Zoom in/out', category: 'Canvas' },
  { keys: '0', description: 'Reset zoom & center', category: 'Canvas' },
  
  // Clipboard
  { keys: 'Cmd/Ctrl+C', description: 'Copy selected', category: 'Clipboard' },
  { keys: 'Cmd/Ctrl+V', description: 'Paste', category: 'Clipboard' },
  { keys: 'Cmd/Ctrl+D', description: 'Duplicate selected', category: 'Clipboard' },
  
  // Edit
  { keys: 'Delete/Backspace', description: 'Delete selected', category: 'Edit' },
  { keys: 'Arrow keys', description: 'Resize selected / Pan canvas', category: 'Edit' },
  
  // Layers (PR #3)
  { keys: 'Cmd/Ctrl+]', description: 'Bring to front', category: 'Layers' },
  { keys: 'Cmd/Ctrl+[', description: 'Send to back', category: 'Layers' },
  
  // Help
  { keys: '?', description: 'Show keyboard shortcuts', category: 'Help' },
]

interface KeyboardShortcutsModalProps {
  onClose: () => void
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
  const [search, setSearch] = useState('')

  const filtered = SHORTCUTS.filter(s =>
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    s.keys.toLowerCase().includes(search.toLowerCase())
  )

  const byCategory = filtered.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, Shortcut[]>)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <input
          type="text"
          placeholder="Search shortcuts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shortcut-search"
          autoFocus
        />

        <div className="shortcuts-list">
          {Object.entries(byCategory).map(([category, shortcuts]) => (
            <div key={category} className="shortcut-category">
              <h3>{category}</h3>
              {shortcuts.map((shortcut, idx) => (
                <div key={idx} className="shortcut-row">
                  <kbd>{shortcut.keys}</kbd>
                  <span>{shortcut.description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="no-results">
            No shortcuts found for "{search}"
          </div>
        )}
      </div>
    </div>
  )
}

export default KeyboardShortcutsModal
```

### Files to Update

#### `/src/components/canvas/Canvas.tsx`
Add `?` shortcut to show modal:

```typescript
import KeyboardShortcutsModal from '../ui/KeyboardShortcutsModal'

const [showShortcuts, setShowShortcuts] = useState(false)

const handleKeyDown = useCallback((e: KeyboardEvent) => {
  // ... existing shortcuts
  
  // Show keyboard shortcuts: ?
  if (e.key === '?' && !e.shiftKey) {
    e.preventDefault()
    setShowShortcuts(true)
    return
  }
}, [/* deps */])

// In render
return (
  <>
    {/* Canvas */}
    
    {showShortcuts && (
      <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
    )}
  </>
)
```

#### `/src/components/layout/Header.tsx`
Replace simple ColorPicker with EnhancedColorPicker:

```typescript
import EnhancedColorPicker from '../canvas/EnhancedColorPicker'

// Replace:
// <ColorPicker />

// With:
<EnhancedColorPicker selectedRectangleId={selectedRectangleId} />
```

#### No database changes needed
Color history uses localStorage, so no Firebase rules or schema updates needed.

### Testing Checklist

**Manual Testing:**
- [ ] Can input hex codes and apply to selected rectangle
- [ ] Hex codes with or without # work (e.g., FF5733 or #FF5733)
- [ ] Invalid hex codes show error message
- [ ] Color history saves last 10 colors
- [ ] Color history persists across sessions (localStorage)
- [ ] Color history persists across page refreshes
- [ ] Color history only shows when user has history
- [ ] Quick color buttons still work
- [ ] All disabled when no rectangle selected
- [ ] `?` key shows keyboard shortcuts modal
- [ ] Modal is searchable
- [ ] Modal shows all shortcuts organized by category
- [ ] Modal closes with X or clicking outside
- [ ] Modal search filters results correctly
- [ ] No console errors

### Success Criteria
- ✅ Enhanced color picker works with hex input and history
- ✅ Keyboard shortcuts modal is helpful and complete
- ✅ Color history persists in localStorage (instant, no Firebase overhead)
- ✅ Real-time color changes sync to all users
- ✅ No breaking changes
- ✅ Code is clean and accessible

---

## PR #3: Layering & Z-Index

**Branch**: `feature/layering-z-index`  
**Work Level**: Medium  
**Breaking Changes**: None

### Why This PR?
- Essential for professional design tools
- Enables complex layouts with overlapping rectangles
- Natural progression from basic manipulation
- Keyboard shortcuts match industry standards (Figma, Sketch)
- Foundation for more complex shape composition

### What This PR Delivers

Z-Index system with **2 layer operations** (simplified):
1. **Bring to Front** (`Cmd+]`): Move to top layer
2. **Send to Back** (`Cmd+[`): Move to bottom layer

**Rationale for simplification:** Most users only use front/back operations. Forward/backward add complexity for minimal benefit. Can add later if needed.

Plus AI support for "bring it to front", "send it to the back", etc.

### Implementation Strategy

**Z-Index Assignment (with gaps for efficiency):**
- New rectangles get `maxZIndex + 1000` (always created on top)
- **Start at 1000, increment by 1000**
- **Rationale:** Gaps between z-indexes allow O(1) operations - only update 1-2 rectangles instead of all rectangles. Critical for performance with 100+ shapes.
- Bring to Front: Set to `maxZIndex + 1000`
- Send to Back: Set to `minZIndex - 1000`

**Rendering:**
- Sort rectangles by zIndex before rendering
- Higher zIndex = rendered later = appears on top

**AI Integration:**
- Add `bringToFront` and `sendToBack` tools
- Support natural language commands
- Only work with selected rectangle

### Files to Update

#### `/src/services/canvasService.ts`
Add zIndex field and layer operations:

```typescript
export interface Rectangle {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  createdBy: string
  createdAt: number
  selectedBy: string | null
  selectedAt: number | null
  zIndex: number  // NEW
}

// Helper to get next zIndex (with gaps)
const getNextZIndex = async (): Promise<number> => {
  const rectanglesRef = dbRef(DB_PATHS.RECTANGLES)
  const snapshot = await dbGet(rectanglesRef)
  
  let maxZIndex = 0
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const rect = child.val()
      if (rect.zIndex > maxZIndex) {
        maxZIndex = rect.zIndex
      }
    })
  }
  
  // Increment by 1000 (not 1) to maintain gaps
  return maxZIndex + 1000
}

// Helper to get min zIndex
const getMinZIndex = async (): Promise<number> => {
  const rectanglesRef = dbRef(DB_PATHS.RECTANGLES)
  const snapshot = await dbGet(rectanglesRef)
  
  let minZIndex = Infinity
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const rect = child.val()
      if (rect.zIndex < minZIndex) {
        minZIndex = rect.zIndex
      }
    })
  }
  
  return minZIndex === Infinity ? 0 : minZIndex
}

// UPDATE: createRectangle to include zIndex
export const createRectangle = async (input: RectangleInput): Promise<Rectangle | null> => {
  const zIndex = await getNextZIndex()
  
  const rectangle: Rectangle = {
    ...input,
    id: newRectRef.key!,
    zIndex,  // NEW
    selectedBy: null,
    selectedAt: null
  }
  
  await dbSet(newRectRef, rectangle)
  return rectangle
}

// NEW: Bring to front (set zIndex to max + 1000)
// O(1) operation - only updates ONE rectangle
export const bringToFront = async (rectangleId: string): Promise<void> => {
  const maxZIndex = await getMaxZIndex()
  const rectangleRef = dbRef(`${DB_PATHS.RECTANGLES}/${rectangleId}`)
  await dbUpdate(rectangleRef, { zIndex: maxZIndex + 1000 })
}

// NEW: Send to back (set zIndex to min - 1000)
// O(1) operation - only updates ONE rectangle
export const sendToBack = async (rectangleId: string): Promise<void> => {
  const minZIndex = await getMinZIndex()
  const rectangleRef = dbRef(`${DB_PATHS.RECTANGLES}/${rectangleId}`)
  await dbUpdate(rectangleRef, { zIndex: minZIndex - 1000 })
}
```

#### `/src/contexts/CanvasContext.tsx`
Add layer methods:

```typescript
interface CanvasContextType {
  // ... existing
  bringToFront: (rectangleId: string) => Promise<void>
  sendToBack: (rectangleId: string) => Promise<void>
}

const bringToFront = useCallback(async (rectangleId: string) => {
  try {
    await canvasService.bringToFront(rectangleId)
    showToast('Brought to front')
  } catch (err) {
    setError('Failed to bring to front')
  }
}, [showToast])

const sendToBack = useCallback(async (rectangleId: string) => {
  try {
    await canvasService.sendToBack(rectangleId)
    showToast('Sent to back')
  } catch (err) {
    setError('Failed to send to back')
  }
}, [showToast])
```

#### `/src/components/canvas/Canvas.tsx`
Sort by zIndex and add shortcuts:

```typescript
// Sort rectangles by zIndex before rendering
const sortedRectangles = useMemo(() => {
  return [...rectangles].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
}, [rectangles])

// Add keyboard shortcuts
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  // ... existing shortcuts
  
  // Bring to Front: Cmd+]
  if ((e.metaKey || e.ctrlKey) && e.key === ']') {
    e.preventDefault()
    if (selectedRectangleId) {
      bringToFront(selectedRectangleId)
    }
    return
  }
  
  // Send to Back: Cmd+[
  if ((e.metaKey || e.ctrlKey) && e.key === '[') {
    e.preventDefault()
    if (selectedRectangleId) {
      sendToBack(selectedRectangleId)
    }
    return
  }
}, [selectedRectangleId, bringToFront, sendToBack])

// Render sorted rectangles
<Layer>
  {sortedRectangles.map(rect => (
    <Rectangle key={rect.id} rectangle={rect} />
  ))}
</Layer>
```

#### `/functions/src/tools.ts` (AI Support)
Add layer tools:

```typescript
export const bringToFront = tool({
  description: 'Bring the selected rectangle to the front (top layer)',
  parameters: z.object({}),
  execute: async () => ({ success: true })
})

export const sendToBack = tool({
  description: 'Send the selected rectangle to the back (bottom layer)',
  parameters: z.object({}),
  execute: async () => ({ success: true })
})

// Add to tools object
export const tools = {
  // ... existing
  bringToFront,
  sendToBack
}
```

#### `/functions/src/utils/systemPrompt.ts`
Update system prompt:

```typescript
AVAILABLE OPERATIONS:
- ... existing operations ...
- Bring to front (requires selection) // NEW
- Send to back (requires selection) // NEW

When user says "bring it to front", "put it on top", or "move it in front", use bringToFront.
When user says "send it to back", "put it behind", or "move it to the back", use sendToBack.
```

#### `/src/services/aiAgent.ts`
Handle layer commands:

```typescript
case 'bringToFront':
  if (!selectedRectangleId) {
    throw new Error('No rectangle selected')
  }
  await context.bringToFront(selectedRectangleId)
  break

case 'sendToBack':
  if (!selectedRectangleId) {
    throw new Error('No rectangle selected')
  }
  await context.sendToBack(selectedRectangleId)
  break
```

### Testing Checklist

**Manual Testing:**
- [ ] New rectangles appear on top of existing ones (zIndex increments by 1000)
- [ ] Bring to Front (`Cmd+]`) moves rectangle to top
- [ ] Send to Back (`Cmd+[`) moves rectangle to bottom
- [ ] Layer operations work when rectangles overlap
- [ ] Can repeatedly bring to front / send to back (z-index gaps allow this)
- [ ] Keyboard shortcuts prevented when no selection
- [ ] Keyboard shortcuts prevented during AI processing
- [ ] Layer changes sync to all users in real-time (only 1 rectangle updated, not all)
- [ ] Visual rendering respects zIndex order
- [ ] Performance is instant even with 100+ rectangles
- [ ] No console errors

**AI Testing:**
- [ ] AI can bring rectangle to front with various phrasings ("bring it to front", "put it on top", etc.)
- [ ] AI can send rectangle to back with various phrasings ("send it to back", "move it behind", etc.)
- [ ] AI gives helpful error message when asked to change layers without selection
- [ ] AI layer operations sync to all users

### Success Criteria
- ✅ Both layer operations work correctly (front/back)
- ✅ zIndex properly assigned with gaps (1000, 2000, 3000...)
- ✅ Layer operations are O(1) - only update 1 rectangle
- ✅ Keyboard shortcuts implemented and work smoothly
- ✅ AI agent supports layer commands
- ✅ Real-time sync verified
- ✅ Visual stacking order is correct
- ✅ Performance excellent with 100+ overlapping rectangles
- ✅ No console errors

---

## Phase 3A Completion Checklist

Before moving to Phase 3B, verify:

### Functionality
- [ ] All 3 PRs merged and tested
- [ ] Copy/paste/duplicate work perfectly
- [ ] Enhanced color picker with hex input works
- [ ] Color history persists across sessions
- [ ] Keyboard shortcuts modal is complete
- [ ] All layer operations work correctly
- [ ] Real-time sync works for all new features

### Code Quality
- [ ] All tests passing (run `npx vitest run`)
- [ ] No console errors or warnings
- [ ] Code is well-commented
- [ ] No TODO comments left behind
- [ ] Constants used instead of magic numbers

### Documentation
- [ ] README updated (if needed)
- [ ] Keyboard shortcuts list is complete
- [ ] Any new patterns documented

### Performance
- [ ] Tested with 2+ concurrent users
- [ ] Copy/paste works smoothly
- [ ] Layer operations are instant
- [ ] No noticeable lag with 100+ rectangles

### AI Integration
- [ ] AI agent supports duplicate command
- [ ] AI agent supports layer commands
- [ ] All AI tests passing
- [ ] Natural language commands work well

---

## Next Steps

**Proceed to Phase 3B**: [Multi-Select Implementation](./phase3b-multiselect.md)

Phase 3B introduces the first breaking change - converting from single selection to multi-select. This is a critical foundation for advanced features in Phases 3D and 3F.

**Note**: Phase 3B is a good checkpoint to take a break, review progress, and ensure Phase 3A is solid before proceeding.

