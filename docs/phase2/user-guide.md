# Collab Canvas User Guide - AI Agent MVP

## Overview

Collab Canvas is a real-time collaborative canvas where you can create and manipulate rectangles either manually or through natural language AI commands. All changes sync instantly across all connected users.

**Key Features:**
- 🎨 Create, move, resize, and delete rectangles
- 🤖 Control canvas with natural language commands
- 👥 See other users' cursors and changes in real-time
- 🔒 Exclusive selection prevents conflicts
- ⌨️ Keyboard shortcuts for power users

---

## Getting Started

### 1. Accessing the Application

Open your browser and navigate to:
- **Production:** `https://your-project.web.app`
- **Local Development:** `http://localhost:5173`

### 2. Creating a Username

1. When you first visit, you'll see a login screen
2. Enter a username (this will be displayed to other users)
3. Click "Sign In" or press Enter

> **Note:** Your username is stored locally and persists across sessions. To change it, click "Sign Out" in the header and sign in again.

### 3. Interface Overview

> **[MANUAL UPDATE NEEDED: Add annotated screenshot showing main interface elements]**

**Main Interface Elements:**

1. **Header (Top)**
   - Your username
   - Active users list
   - Color picker (3 colors: red, blue, green)
   - Sign Out button

2. **Canvas (Center)**
   - 3000×3000 pixel workspace
   - Zoomable and pannable
   - Shows rectangles and other users' cursors

3. **AI Chat (Bottom-Right)**
   - Text input for AI commands
   - Submit button
   - Command hints
   - Response messages

4. **Other Users' Cursors**
   - Colored dots with usernames
   - Real-time position tracking
   - Unique color per user

---

## Manual Canvas Operations

### Creating Rectangles

**Method 1: Double-Click**
1. Double-click anywhere on the canvas
2. A blue rectangle (100×80px) appears at that location
3. The rectangle is automatically selected

**Method 2: AI Command**
- Type: "Create a blue rectangle"
- See [AI Commands](#ai-commands) section below

> **[MANUAL UPDATE NEEDED: Add GIF/screenshot showing double-click creation]**

### Selecting Rectangles

**To select a rectangle:**
1. Click on any rectangle
2. Selection indicators appear:
   - Red border (3px)
   - 8 resize handles at corners and edges

**To deselect:**
1. Click on the canvas (empty space)
2. Selection indicators disappear

**Selection Rules:**
- ✅ Only one user can select a rectangle at a time
- ✅ If another user has selected it, you'll see a toast notification
- ✅ Your selection is exclusive until you deselect

> **[MANUAL UPDATE NEEDED: Add screenshot showing selected rectangle with handles]**

### Moving Rectangles

**Drag and Drop:**
1. Select a rectangle
2. Click and hold on the rectangle body (not the handles)
3. Drag to new position
4. Release to drop
5. Position updates for all users

**Constraints:**
- Rectangles stay within canvas bounds (0-3000px)
- Changes sync instantly to all users

> **[MANUAL UPDATE NEEDED: Add GIF showing rectangle movement]**

### Resizing Rectangles

**Using Resize Handles:**
1. Select a rectangle
2. Hover over any of the 8 handles:
   - **Corners:** Resize width and height
   - **Edges:** Resize width or height only
3. Click and drag handle
4. Release when desired size reached

**Handle Types:**
- **tl** (top-left), **tr** (top-right), **bl** (bottom-left), **br** (bottom-right) - Corner handles
- **tc** (top-center), **bc** (bottom-center) - Vertical resize
- **ml** (middle-left), **mr** (middle-right) - Horizontal resize

**Constraints:**
- Minimum size: 20×20px
- Maximum size: 3000×3000px
- Rectangles stay within canvas bounds

> **[MANUAL UPDATE NEEDED: Add GIF showing resize operation]**

### Changing Colors

**Using Color Picker (Header):**
1. Select a rectangle
2. Click one of the 3 color buttons in the header:
   - 🔴 Red (#ef4444)
   - 🔵 Blue (#3b82f6)
   - 🟢 Green (#22c55e)
3. Rectangle color updates instantly

**Available Colors:**
- Only 3 colors in MVP
- Border color automatically matches (darker shade)

> **[MANUAL UPDATE NEEDED: Add screenshot highlighting color picker]**

### Deleting Rectangles

**Keyboard Shortcut:**
1. Select a rectangle
2. Press `Delete` (macOS/Windows) or `Backspace`
3. Rectangle disappears for all users

**Confirmation:**
- No confirmation dialog (instant delete)
- No undo feature (yet)

---

## Canvas Navigation

### Panning (Moving the View)

**Drag Canvas:**
1. Click and hold on empty space
2. Drag to move the view
3. Release to stop panning

**Keyboard Shortcuts:**
- `Arrow Up` - Pan up
- `Arrow Down` - Pan down
- `Arrow Left` - Pan left
- `Arrow Right` - Pan right

**Arrow Key Behavior:**
- If rectangle is selected: Resize rectangle
- If nothing is selected: Pan canvas

> **[MANUAL UPDATE NEEDED: Add GIF showing canvas panning]**

### Zooming

**Trackpad/Mouse Wheel:**
1. Scroll up to zoom in
2. Scroll down to zoom out
3. Zoom range: 0.1x - 10x
4. Zoom is smooth and centered on cursor position

**Keyboard Shortcut:**
- `0` (zero) - Reset zoom to 100% and center to origin (0, 0)

> **[MANUAL UPDATE NEEDED: Add GIF showing zoom operation]**

### Reset View

**Return to Center:**
1. Press `0` (zero key)
2. Zoom resets to 100%
3. Pan resets to (0, 0)

---

## AI Commands

### Overview

The AI Canvas Agent allows you to control the canvas using natural language. It understands context (your viewport, selected rectangles) and executes precise operations.

**AI Chat Location:**
- Fixed position: bottom-right of screen
- Width: 380px (desktop), full-width (mobile)
- Always visible while using the canvas

> **[MANUAL UPDATE NEEDED: Add screenshot highlighting AI Chat interface]**

### How to Use AI Commands

**Basic Flow:**
1. Type your command in the text input
2. Press Enter or click "Submit"
3. Wait for processing (spinner appears)
4. See result:
   - ✅ Success: Green checkmark + message
   - ❌ Error: Red X + error message
5. Click "OK" to dismiss or "Retry" to try again

**Example Commands:**
```
"Create a blue rectangle"
"Make it bigger"
"Change color to red"
"Move it to the center"
"Delete the rectangle"
"Create 5 green rectangles in a row"
```

### Command Categories

#### 1. Create Rectangle

**Single Rectangle:**
```
"Create a blue rectangle"
"Add a red square in the center"
"Make a green box"
```

**Details:**
- Creates 100×80px rectangle (default size)
- Position: Center of your current viewport
- Color: red, blue, or green
- Rectangle is automatically selected

**Multiple Rectangles:**
```
"Create 3 blue rectangles in a row"
"Make 6 red rectangles in a grid"
"Add 4 green rectangles in a column"
```

**Details:**
- Maximum: 50 rectangles at once
- Layouts: row (horizontal), column (vertical), grid (square)
- Spacing: 25px default (adjustable by AI)
- No rectangles are selected after batch creation

> **[MANUAL UPDATE NEEDED: Add before/after screenshots for create commands]**

#### 2. Change Color

**Requirement:** You must have a rectangle selected

**Commands:**
```
"Make it red"
"Change color to blue"
"Turn it green"
"Paint it blue"
```

**Details:**
- Only works on selected rectangle
- 3 colors available: red (#ef4444), blue (#3b82f6), green (#22c55e)
- If no rectangle selected, AI will inform you

#### 3. Move Rectangle

**Requirement:** You must have a rectangle selected

**Commands:**
```
"Move it to the center"
"Move it 100 pixels right"
"Put it at coordinates 500, 500"
"Shift it left"
```

**Details:**
- Canvas coordinates: (0, 0) to (3000, 3000)
- AI understands relative ("left", "up") and absolute ("at 500, 500") positions
- Rectangle stays within canvas bounds

> **[MANUAL UPDATE NEEDED: Add GIF showing AI move command]**

#### 4. Resize Rectangle

**Requirement:** You must have a rectangle selected

**Commands:**
```
"Make it bigger"
"Resize it to 200 by 150"
"Make it twice as wide"
"Shrink it"
```

**Details:**
- Size constraints: 20px - 3000px (width and height)
- AI understands relative ("bigger", "twice as wide") and absolute ("200 by 150") sizing
- Rectangle stays within canvas bounds

#### 5. Delete Rectangle

**Requirement:** You must have a rectangle selected

**Commands:**
```
"Delete it"
"Remove the rectangle"
"Get rid of it"
"Delete this"
```

**Details:**
- Instant deletion (no confirmation)
- Rectangle disappears for all users
- No undo feature

#### 6. Multi-Step Commands

**Special Case:** If your first command creates a single rectangle, the AI can perform follow-up actions on it.

**Examples:**
```
User: "Create a blue rectangle and make it bigger"
→ AI creates rectangle, then resizes it

User: "Add a red square in the center and move it up 100 pixels"
→ AI creates rectangle, then moves it

User: "Make a green box, resize it to 200x200, and move it to the top"
→ AI creates, resizes, then moves (max 5 steps)
```

**Details:**
- Maximum 5 steps in one command
- Only works if first step creates a single rectangle
- If any step fails, AI reports which step failed

### Command Hints

The AI Chat shows helpful hints:
> "Try: 'Create a blue rectangle' or 'Make it bigger'"

**More Examples:**
- "Create 10 blue rectangles in a grid"
- "Change it to red and make it bigger"
- "Move the rectangle to coordinates 1000, 1000"
- "Resize it to 300 wide and 200 tall"

### AI Response Messages

**Success Messages:**
- ✅ "Rectangle created"
- ✅ "Color changed to red"
- ✅ "Rectangle moved"
- ✅ Sometimes AI adds helpful context

**Error Messages:**

**Selection Required:**
- ❌ "Please select a rectangle first"
- → Solution: Click on a rectangle to select it

**Invalid Color:**
- ❌ "Invalid color: yellow. Must be red, blue, or green"
- → Solution: Use only the 3 available colors

**Rectangle Not Found:**
- ❌ "Rectangle XYZ not found or was deleted"
- → Solution: Rectangle was deleted by another user

**Quota Exceeded:**
- ❌ "AI command limit reached (1000 commands per user)"
- → Solution: You've reached the lifetime limit

**Service Unavailable:**
- ❌ "AI service temporarily unavailable. Please try again."
- → Solution: Click "Retry" button

**Partial Success:**
- ⚠️ "Completed 2 of 5 steps. Error: ..."
- → Shows which steps succeeded before failure

### Response Actions

**Success:**
- Green checkmark appears
- Click "OK" to dismiss

**Retryable Error:**
- Red X appears
- Click "Retry" to try the same command again
- Click "Cancel" to dismiss

**Non-Retryable Error:**
- Red X appears
- Click "OK" to dismiss
- Fix the issue (e.g., select a rectangle) before trying again

> **[MANUAL UPDATE NEEDED: Add screenshots showing success/error states]**

---

## Real-Time Collaboration

### Seeing Other Users

**Active Users List:**
- Located in header (top-right)
- Shows all connected users
- Updates in real-time as users join/leave

**Cursor Tracking:**
- Each user has a colored dot showing their cursor position
- Username appears next to the cursor
- Color is unique per user (deterministic based on user ID)
- Cursors update in real-time (throttled to 60fps)

**Cursor Behavior:**
- Cursors disappear after 30 seconds of inactivity (stale cursor cleanup)
- Your own cursor is not shown (you see the system cursor)

> **[MANUAL UPDATE NEEDED: Add screenshot showing multiple users' cursors]**

### Selection Conflicts

**Exclusive Selection:**
- Only one user can select a rectangle at a time
- If you try to select a rectangle already selected by another user, you'll see a toast notification

**Toast Message:**
```
"Rectangle is currently selected by [Username]"
```

**Resolution:**
- Wait for the other user to deselect
- Select a different rectangle
- The other user's selection automatically expires after some time

> **[MANUAL UPDATE NEEDED: Add screenshot of selection conflict toast]**

### Real-Time Sync

**What Syncs:**
- ✅ Rectangle creation
- ✅ Rectangle movement
- ✅ Rectangle resizing
- ✅ Rectangle color changes
- ✅ Rectangle deletion
- ✅ Selection state (per user)
- ✅ Cursor positions
- ✅ User join/leave

**What Doesn't Sync:**
- ❌ Canvas pan position (local only)
- ❌ Canvas zoom level (local only)
- ❌ AI chat state (local only)

**Sync Speed:**
- WebSocket connection via Firebase Realtime Database
- Typical latency: 100-300ms
- Cursor updates: throttled to 16ms (60fps)

---

## Keyboard Shortcuts

### Canvas Operations

| Shortcut | Action |
|----------|--------|
| Double-click | Create rectangle at cursor position |
| Click rectangle | Select/deselect rectangle |
| `Delete` / `Backspace` | Delete selected rectangle |
| Drag rectangle | Move selected rectangle |
| Drag handle | Resize selected rectangle |

### Canvas Navigation

| Shortcut | Action |
|----------|--------|
| Drag canvas | Pan view |
| Scroll wheel | Zoom in/out |
| `Arrow Up` | Resize selected rectangle OR pan canvas |
| `Arrow Down` | Resize selected rectangle OR pan canvas |
| `Arrow Left` | Resize selected rectangle OR pan canvas |
| `Arrow Right` | Resize selected rectangle OR pan canvas |
| `0` (zero) | Reset zoom and position |

### Arrow Key Behavior

**With Rectangle Selected:**
- `Arrow Up` - Decrease height (resize smaller vertically)
- `Arrow Down` - Increase height (resize larger vertically)
- `Arrow Left` - Decrease width (resize smaller horizontally)
- `Arrow Right` - Increase width (resize larger horizontally)

**Without Selection:**
- `Arrow Up` - Pan canvas upward
- `Arrow Down` - Pan canvas downward
- `Arrow Left` - Pan canvas left
- `Arrow Right` - Pan canvas right

---

## Limitations & Constraints

### Canvas Limits

- **Canvas Size:** 3000×3000 pixels
- **Maximum Rectangles:** 1000 rectangles per canvas
- **Rectangle Size:** 20px - 3000px (width and height)
- **Colors:** 3 options only (red, blue, green)

### AI Agent Limits

- **Command Quota:** 1000 AI commands per user (lifetime)
- **Batch Creation:** Maximum 50 rectangles at once
- **Multi-Step Commands:** Maximum 5 steps
- **Multi-Step Rule:** First step must create a single rectangle
- **Processing Time:** 6-second timeout (if exceeded, retry)
- **Cold Start:** First request may take 2-5 seconds

### Browser Compatibility

**Supported Browsers:**
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

**Required Features:**
- JavaScript enabled
- WebSocket support
- Canvas API support
- LocalStorage enabled

---

## Tips & Best Practices

### For Manual Operations

1. **Use keyboard shortcuts** - Faster than clicking
2. **Reset view with 0** - Quick way to find origin
3. **Zoom before creating** - Easier to position precisely
4. **Select before deleting** - Remember selection is exclusive

### For AI Commands

1. **Be specific** - "Create a blue rectangle" works better than "Make something"
2. **Use context** - "Make it bigger" works if you have a rectangle selected
3. **Try simple first** - Test with basic commands before complex multi-step
4. **Check selection** - Many commands require a selected rectangle
5. **Watch your quota** - You have 1000 commands per user
6. **Retry on errors** - Network issues happen; use the Retry button

### For Collaboration

1. **Communicate** - Use external chat to coordinate with team
2. **Respect selections** - Don't fight over the same rectangle
3. **Be patient** - Changes may take 100-300ms to sync
4. **Use different areas** - Spread out to avoid conflicts
5. **Watch active users** - Know who's online in the header

---

## Troubleshooting

### Common Issues

**"Canvas is blank"**
- Refresh the page
- Check if you're signed in
- Try zooming out (press `0`)

**"AI commands not working"**
- Check if you have a selected rectangle (if required)
- Verify you haven't exceeded quota (1000 commands)
- Check browser console for errors
- Try a simpler command first

**"Can't select rectangle"**
- Another user may have it selected
- Check toast notifications
- Wait a moment and try again

**"Cursor not showing"**
- Your own cursor is hidden (by design)
- Other users' cursors should appear
- Check if they're in your viewport

**"Changes not syncing"**
- Check internet connection
- Refresh the page
- Check Firebase status (firebase.google.com/support/status)

### Error Messages

**"Please select a rectangle first"**
- Select a rectangle before running color/move/resize/delete commands

**"AI command limit reached"**
- You've used all 1000 commands for this user
- Sign out and create a new username (or wait for quota reset in future)

**"Canvas has too many rectangles"**
- Canvas has reached 1000 rectangle limit
- Delete some rectangles to make room

**"AI service temporarily unavailable"**
- OpenAI API may be down
- Click "Retry" after a moment
- Check status.openai.com

### Getting Help

1. Check browser console (F12) for errors
2. Try refreshing the page
3. Test in a different browser
4. Review this user guide
5. Check setup guide for configuration issues

---

## Frequently Asked Questions

**Q: Can I undo my actions?**  
A: No, there is no undo feature in the MVP. Be careful with deletions.

**Q: How do I save my canvas?**  
A: Your canvas is automatically saved in Firebase. Just refresh to see your rectangles.

**Q: Can I invite specific users?**  
A: No, anyone with the URL can join (anonymous auth). Future versions may add permissions.

**Q: What happens if two users create rectangles at the same time?**  
A: Both rectangles are created. Firebase handles concurrent writes gracefully.

**Q: Can AI commands work on other users' rectangles?**  
A: Yes, if you have them selected. The AI doesn't distinguish between your rectangles and others'.

**Q: What if someone deletes all my rectangles?**  
A: Currently there's no protection. This is a collaborative canvas without ownership. Future versions may add permissions.

**Q: How much do AI commands cost?**  
A: Each command costs approximately $0.002-0.005 (OpenAI pricing). You have a quota of 1000 commands per user.

**Q: Can I change my username?**  
A: Yes, click "Sign Out" and sign in again with a new username.

**Q: Do I need to install anything?**  
A: No, it's a web application. Just open the URL in your browser.

**Q: Can I use this on mobile?**  
A: Yes, the interface is responsive, but the experience is optimized for desktop with mouse/trackpad.

---

## Appendix: Command Examples

### Basic Commands

```
Create a blue rectangle
Make a red rectangle in the center
Add a green box
```

### Modification Commands (require selection)

```
Make it red
Change color to blue
Make it bigger
Resize it to 200 by 150
Move it to the center
Move it 100 pixels right
Delete it
Remove this rectangle
```

### Batch Creation Commands

```
Create 5 blue rectangles in a row
Make 10 red rectangles in a grid
Add 3 green rectangles in a column
Create 8 blue rectangles with 50 pixel spacing
```

### Multi-Step Commands

```
Create a blue rectangle and make it bigger
Add a red square and move it to the top
Make a green box, resize it to 300x300, and change it to blue
```

### Advanced Commands

```
Create a rectangle at coordinates 1000, 1000
Resize the rectangle to 500 pixels wide and 300 pixels tall
Move it 200 pixels left and 100 pixels up
Create 12 rectangles in a grid with 40 pixel spacing
```

---

## Summary

**Collab Canvas** combines the simplicity of direct manipulation with the power of natural language AI control. You can:

- ✨ Create and manipulate rectangles manually with click-and-drag
- 🤖 Control the canvas with AI commands ("Create a blue rectangle")
- 👥 Collaborate in real-time with other users
- 🎨 Change colors and sizes precisely
- ⌨️ Use keyboard shortcuts for efficiency

**Remember:**
- AI commands are powerful but have a 1000-command quota
- Selection is exclusive (one user at a time)
- Changes sync in real-time across all users
- Be respectful in collaborative spaces

**Ready to create?** Open the app and try: "Create a blue rectangle" 🎨

---

> **[MANUAL UPDATES NEEDED]**
> - Replace all `[MANUAL UPDATE NEEDED: ...]` placeholders with actual screenshots/GIFs
> - Add annotated interface overview
> - Add before/after comparisons for AI commands
> - Add GIFs showing interactions (drag, resize, zoom)
> - Add screenshots of AI Chat states (loading, success, error)
> - Add screenshot of selection conflict toast
> - Verify all command examples work correctly

