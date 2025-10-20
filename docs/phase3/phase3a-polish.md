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
- Clear on sign out (useEffect watching user state)

**Paste Behavior:**
- Offset by **fixed +20px x and y** from original (defined as local constants)
- **Rationale:** Simple, predictable, matches Figma/Sketch behavior
- Clamp to canvas bounds if would go outside
- Auto-select the pasted rectangle
- Can paste same rectangle multiple times (clipboard persists until next copy)

**Keyboard Shortcuts:**
- Add checks for `selectionLocked` state (prevents shortcuts during AI operations)
- Use **refs pattern** to avoid large dependency arrays in useEffect (see implementation notes)

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

// Clear clipboard on sign out
useEffect(() => {
  if (!user) {
    setClipboardRectangle(null)
  }
}, [user])

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
      createdBy: user.uid
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
      createdBy: user.uid
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
Add keyboard shortcuts using refs pattern to avoid dependency issues:

```typescript
const {
  // ... existing
  copyRectangle,
  pasteRectangle,
  duplicateRectangle,
  selectionLocked,
} = useCanvas()

// Create refs to avoid adding functions to dependency array
const copyRectangleRef = useRef(copyRectangle)
const pasteRectangleRef = useRef(pasteRectangle)
const duplicateRectangleRef = useRef(duplicateRectangle)

// Keep refs updated with latest functions
useEffect(() => {
  copyRectangleRef.current = copyRectangle
  pasteRectangleRef.current = pasteRectangle
  duplicateRectangleRef.current = duplicateRectangle
}, [copyRectangle, pasteRectangle, duplicateRectangle])

// Update existing keyboard handler (in the existing useEffect)
// Add these cases to the handleKeyDown function:
const handleKeyDown = (e: KeyboardEvent) => {
  // ... existing checks (isTyping, etc.)
  
  // Don't handle shortcuts during AI operations
  if (selectionLocked) return
  
  // Copy: Cmd+C (Mac) or Ctrl+C (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
    e.preventDefault()
    if (selectedRectangleId) {
      copyRectangleRef.current(selectedRectangleId)
    }
    return
  }
  
  // Paste: Cmd+V (Mac) or Ctrl+V (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
    e.preventDefault()
    pasteRectangleRef.current()
    return
  }
  
  // Duplicate: Cmd+D (Mac) or Ctrl+D (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
    e.preventDefault() // Prevent browser bookmark shortcut
    if (selectedRectangleId) {
      duplicateRectangleRef.current(selectedRectangleId)
    }
    return
  }
  
  // ... rest of existing keyboard handling (delete, arrows, etc.)
}

// Note: The existing useEffect dependency array stays the same - 
// we only add selectionLocked to the dependencies, not the function refs
```

**Note:** `PASTE_OFFSET` and `DUPLICATE_OFFSET` constants are defined locally in CanvasContext.tsx (20px each). No need to add to constants.ts since they're only used in one place.

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

**Keyboard Shortcuts Reference:**
1. Collapsible section in canvas-info
2. Always-visible toggle button
3. Organized by category
4. Persists expanded/collapsed state

### Implementation Strategy

**Color Picker Enhancements:**
- Keep existing 3-color buttons
- Add hex input field with validation
- Store color history in **localStorage** (not Firebase)
- **Rationale:** Color history doesn't need cross-device sync. localStorage is instant, free, and simpler.
- Show history in expandable section
- Store as `collabcanvas_colorHistory` key

**Shortcuts Collapsible Section:**
- Add toggle button to canvas-info: "▶/▼ Keyboard Shortcuts"
- Expand/collapse to show full shortcuts list
- Group shortcuts by category (Canvas, Clipboard, Edit, Layers)
- Save expanded/collapsed state to localStorage (default: expanded for new users)
- **Rationale:** More discoverable than hidden `?` key, simpler than modal, doesn't take space when collapsed

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

**Note:** No separate component needed - shortcuts section is integrated directly into Canvas.tsx (see below).

### Files to Update

#### `/src/components/canvas/Canvas.tsx`
Add collapsible shortcuts section and replace ColorPicker:

```typescript
import EnhancedColorPicker from './EnhancedColorPicker'

// State for collapsible shortcuts
const [showShortcuts, setShowShortcuts] = useState(() => {
  return localStorage.getItem('collabcanvas_showShortcuts') !== 'false'
})

// Save expanded/collapsed state
useEffect(() => {
  localStorage.setItem('collabcanvas_showShortcuts', String(showShortcuts))
}, [showShortcuts])

// In canvas-info section, after canvas-controls:
<div className="canvas-info">
  <div className="canvas-stats">
    <span>Zoom: ...</span>
    <span>Position: ...</span>
    <span>Rectangles: {rectangles.length}</span>
    <span>Friends: {Object.keys(cursors).length}</span>
    
    {/* REPLACE ColorPicker with EnhancedColorPicker */}
    <div className="header-color-picker">
      {selectedRectangle ? (
        <>
          <span className="color-label">Color:</span>
          <EnhancedColorPicker
            selectedRectangleId={selectedRectangleId}
          />
        </>
      ) : (
        <div className="color-picker-placeholder">
          {/* Same placeholder structure as before */}
        </div>
      )}
    </div>
  </div>
  
  <div className="canvas-controls">
    <span>🖱️ Double-click: create | Drag: pan | Scroll: zoom | 0: reset</span>
  </div>
  
  {/* NEW: Collapsible shortcuts section */}
  <button 
    className="shortcuts-toggle"
    onClick={() => setShowShortcuts(!showShortcuts)}
    aria-expanded={showShortcuts}
  >
    {showShortcuts ? '▼' : '▶'} Keyboard Shortcuts
  </button>
  
  {showShortcuts && (
    <div className="shortcuts-expanded">
      <div className="shortcuts-category">
        <strong>Canvas:</strong> Double-click: create | Drag: pan | Scroll: zoom | 0: reset
      </div>
      <div className="shortcuts-category">
        <strong>Clipboard:</strong> ⌘C: copy | ⌘V: paste | ⌘D: duplicate
      </div>
      <div className="shortcuts-category">
        <strong>Edit:</strong> Delete: remove | Arrows: resize (Shift/Ctrl) or navigate
      </div>
      <div className="shortcuts-category">
        <strong>Layers:</strong> ⌘]: bring to front | ⌘[: send to back
      </div>
    </div>
  )}
</div>
```

**CSS to add** (in Canvas.css):

```css
/* Shortcuts Toggle Button */
.shortcuts-toggle {
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.shortcuts-toggle:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

/* Shortcuts Expanded Section */
.shortcuts-expanded {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.shortcuts-category {
  color: #4a5568;
  line-height: 1.6;
}

.shortcuts-category strong {
  color: #1a202c;
  margin-right: 8px;
}
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
- [ ] Shortcuts toggle button is visible
- [ ] Clicking toggle expands/collapses shortcuts section
- [ ] Shortcuts section shows all shortcuts organized by category
- [ ] Expanded/collapsed state persists across page refreshes
- [ ] Default state is expanded for new users
- [ ] No console errors

### Success Criteria
- ✅ Enhanced color picker works with hex input and history
- ✅ Keyboard shortcuts collapsible section is discoverable and helpful
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
// UPDATE: Rectangle interface to include zIndex
export interface Rectangle {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  createdBy: string
  createdAt: number
  updatedAt: number
  selectedBy?: string | null
  selectedByUsername?: string | null
  zIndex: number  // NEW
}

// Inside CanvasService class:

/**
 * Get the current maximum zIndex from all rectangles
 * @private
 */
private async getMaxZIndex(): Promise<number> {
  const snapshot = await dbGet(this.rectanglesRef)
  
  let maxZIndex = 0
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const rect = child.val()
      if (rect.zIndex && rect.zIndex > maxZIndex) {
        maxZIndex = rect.zIndex
      }
    })
  }
  
  return maxZIndex
}

/**
 * Get the current minimum zIndex from all rectangles
 * @private
 */
private async getMinZIndex(): Promise<number> {
  const snapshot = await dbGet(this.rectanglesRef)
  
  let minZIndex = Infinity
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const rect = child.val()
      if (rect.zIndex !== undefined && rect.zIndex < minZIndex) {
        minZIndex = rect.zIndex
      }
    })
  }
  
  return minZIndex === Infinity ? 0 : minZIndex
}

// UPDATE: createRectangle method to include zIndex
async createRectangle(rectangleData: RectangleInput): Promise<Rectangle> {
  try {
    const now = Date.now()
    const newRectangleRef = dbPush(this.rectanglesRef)
    
    if (!newRectangleRef.key) {
      throw new Error('Failed to generate rectangle ID')
    }

    // Get next zIndex (max + 1000 for gaps)
    const maxZIndex = await this.getMaxZIndex()
    const zIndex = maxZIndex + 1000

    const rectangle: Rectangle = {
      id: newRectangleRef.key,
      ...rectangleData,
      color: rectangleData.color || RECTANGLE_COLORS.BLUE,
      createdAt: now,
      updatedAt: now,
      zIndex  // NEW
    }

    await dbSet(newRectangleRef, rectangle)
    return rectangle
  } catch (error) {
    console.error('Error creating rectangle:', error)
    throw error
  }
}

/**
 * NEW: Bring rectangle to front (highest zIndex)
 * O(1) operation - only updates ONE rectangle
 */
async bringToFront(rectangleId: string): Promise<void> {
  try {
    const maxZIndex = await this.getMaxZIndex()
    const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
    await dbUpdate(rectangleRef, { 
      zIndex: maxZIndex + 1000,
      updatedAt: Date.now()
    })
  } catch (error) {
    console.error('Error bringing rectangle to front:', error)
    throw error
  }
}

/**
 * NEW: Send rectangle to back (lowest zIndex)
 * O(1) operation - only updates ONE rectangle
 * Allows negative zIndex values
 */
async sendToBack(rectangleId: string): Promise<void> {
  try {
    const minZIndex = await this.getMinZIndex()
    const rectangleRef = dbRef(firebaseDatabase, `${DB_PATHS.RECTANGLES}/${rectangleId}`)
    await dbUpdate(rectangleRef, { 
      zIndex: minZIndex - 1000,
      updatedAt: Date.now()
    })
  } catch (error) {
    console.error('Error sending rectangle to back:', error)
    throw error
  }
}
```

**Note:** No migration for existing rectangles. They will have `undefined` zIndex and be treated as 0 when sorting. This means old rectangles will appear below all new rectangles (which start at 1000), but this is acceptable given the small number of production rectangles.

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
Sort by zIndex and add shortcuts using refs pattern:

```typescript
const { 
  bringToFront, 
  sendToBack,
  // ... other context values
} = useCanvas()

// Sort rectangles by zIndex before rendering
const sortedRectangles = useMemo(() => {
  return [...rectangles].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
}, [rectangles])

// Create refs for layer functions
const bringToFrontRef = useRef(bringToFront)
const sendToBackRef = useRef(sendToBack)

// Keep refs updated
useEffect(() => {
  bringToFrontRef.current = bringToFront
  sendToBackRef.current = sendToBack
}, [bringToFront, sendToBack])

// Add to existing keyboard handler:
const handleKeyDown = (e: KeyboardEvent) => {
  // ... existing checks
  
  if (selectionLocked) return
  
  // Bring to Front: Cmd+]
  if ((e.metaKey || e.ctrlKey) && e.key === ']') {
    e.preventDefault()
    if (selectedRectangleId) {
      bringToFrontRef.current(selectedRectangleId)
    }
    return
  }
  
  // Send to Back: Cmd+[
  if ((e.metaKey || e.ctrlKey) && e.key === '[') {
    e.preventDefault()
    if (selectedRectangleId) {
      sendToBackRef.current(selectedRectangleId)
    }
    return
  }
  
  // ... rest of existing keyboard handling
}

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
- [ ] Keyboard shortcuts collapsible section is complete and discoverable
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

## Quick Local Testing Plan

### **Setup:**
```bash
npm run dev
```
Then open `http://localhost:5173` - this will connect to production Firebase.

---

### **Phase 3A Feature Testing:**

#### **1. Duplicate + Copy/Paste**
- ✅ Create a rectangle, select it, press **Cmd+C** → Should see "Rectangle copied" toast
- ✅ Press **Cmd+V** → Should paste with 20px offset, auto-selected, see "Rectangle pasted" toast
- ✅ Select rectangle, press **Cmd+D** → Should duplicate with 20px offset, see "Rectangle duplicated" toast
- ✅ Try these shortcuts without selection → Should not work/no toast
- ✅ **Text selection test:** Select text in sidebar (e.g., "Active Users"), press Cmd+C → Should copy text WITHOUT "Rectangle copied" toast

#### **2. Enhanced Color Picker**
- ✅ Select rectangle → Color picker appears in canvas stats bar
- ✅ Click preset colors (red/blue/green) → Changes color, adds to history
- ✅ Type hex code `#ff5500` in input, click ✓ → Changes color, adds to history
- ✅ Color history shows last 5 colors used
- ✅ **Vertical alignment:** Toggle rectangle selection on/off → Canvas stats bar should stay same height (no jumping)

#### **3. Keyboard Shortcuts Display**
- ✅ Check left sidebar → Should see collapsible "⌨️ Keyboard Shortcuts" section
- ✅ Click to collapse/expand → State persists on refresh (localStorage)
- ✅ Sidebar width stays consistent when toggling shortcuts

#### **4. Layering & Z-Index**
- ✅ Create 3 overlapping rectangles → Newer ones appear on top
- ✅ Select bottom rectangle, press **Cmd+]** → Brings to front, see toast
- ✅ Select top rectangle, press **Cmd+[** → Sends to back, see toast

#### **5. AI Agent Commands**
- ✅ Create and select rectangle, ask AI: "duplicate it" → Should duplicate
- ✅ Ask AI: "bring to front" → Should move to front
- ✅ Ask AI: "send to back" → Should move to back
- ✅ Without selection, ask: "duplicate it" → Should get error message

#### **6. UX Polish Checks**
- ✅ Sidebar is narrow (~200px) and clean
- ✅ Header shows: "🎨  ( • ᴗ - ) ✧"
- ✅ Header height is compact
- ✅ Sidebar spacing is tight but readable

**Total test time: ~5 minutes** ⏱️

---

## Next Steps

**Proceed to Phase 3B**: [Multi-Select Implementation](./phase3b-multiselect.md)

Phase 3B introduces the first breaking change - converting from single selection to multi-select. This is a critical foundation for advanced features in Phases 3D and 3F.

**Note**: Phase 3B is a good checkpoint to take a break, review progress, and ensure Phase 3A is solid before proceeding.

