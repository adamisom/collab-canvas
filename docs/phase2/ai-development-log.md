# AI Agent MVP Development Log

## PR #1: Firebase Cloud Functions Setup & Infrastructure ✅

**Status:** Completed  
**Date:** October 17, 2025  
**Branch:** `ai-spike`

### Overview
Set up Firebase Cloud Functions infrastructure to proxy AI requests to OpenAI, implement rate limiting, and secure API keys.

### Files Created (7 files)

1. **`/functions/src/index.ts`** (Main Cloud Function)
   - Callable function: `processAICommand`
   - Authentication enforcement (Firebase Anonymous Auth)
   - Canvas state validation (max 1000 rectangles)
   - User quota checking (max 1000 commands per user)
   - OpenAI API integration with 6-second timeout
   - Atomic command counter increment
   - Structured error handling (unauthenticated, quota exceeded, timeout, etc.)

2. **`/functions/src/types.ts`** (TypeScript Interfaces)
   - `CanvasState` - Current rectangles on canvas
   - `ViewportInfo` - User's viewport position and zoom
   - `SelectedShape` - Currently selected rectangle (if any)
   - `ProcessAICommandRequest` - Cloud Function input
   - `ProcessAICommandResponse` - Cloud Function output with commands and optional message
   - `AICommand` - Individual tool call structure

3. **`/functions/src/tools.ts`** (AI Tool Definitions)
   - 6 canvas manipulation tools using Vercel AI SDK `tool()` function
   - Zod schema validation for all parameters
   - Tools:
     - `createRectangle` - Single rectangle creation
     - `changeColor` - Modify rectangle color
     - `moveRectangle` - Update rectangle position
     - `resizeRectangle` - Change rectangle dimensions
     - `deleteRectangle` - Remove rectangle
     - `createMultipleRectangles` - Batch creation with layout options
   - Strict color validation (red: #ef4444, blue: #3b82f6, green: #22c55e)
   - Parameter constraints enforced in descriptions

4. **`/functions/src/utils/rateLimiter.ts`** (Quota Management)
   - `checkCommandQuota()` - Verifies user hasn't exceeded 1000 command limit
   - `incrementCommandCount()` - Atomic Firebase transaction for race-condition-free counting
   - Proper error handling and logging
   - Non-blocking increment (doesn't fail if increment errors)

5. **`/functions/src/utils/systemPrompt.ts`** (Dynamic System Prompt)
   - Context-aware prompt builder
   - Includes canvas state (total rectangles)
   - Includes viewport info (center coordinates)
   - Includes selection context
   - Defines parameter ranges and validation rules
   - Multi-step command rules (max 5 steps, only if first creates single rectangle)
   - Color hex code mapping (red/blue/green → hex)

6. **`/functions/.gitignore`**
   - Excludes compiled JS files (`lib/**`)
   - Excludes local config (`.runtimeconfig.json`)
   - Excludes dependencies (`node_modules/`)

7. **`/database.rules.json`** (Firebase Security Rules)
   - Protects `aiCommandCount` from manipulation
   - Only allows increments (prevents decrementing to reset quota)
   - User can only read/write their own count
   - Maintains existing rules for rectangles and cursors

### Files Updated (3 files)

1. **`/firebase.json`**
   - Added database rules configuration
   - Points to `database.rules.json`

2. **`/package.json`** (root)
   - Added convenience scripts:
     - `functions:serve` - Local function serving
     - `functions:deploy` - Deploy functions only
     - `functions:logs` - View function logs
     - `emulators` - Start Functions + Database emulators

3. **`/.gitignore`** (root)
   - Added `functions/lib/` (compiled output)
   - Added `functions/.runtimeconfig.json` (local env config)

### Dependencies Installed

**Functions (`/functions/package.json`):**
- `ai@5.0.76` - Vercel AI SDK for tool calling and generateText
- `@ai-sdk/openai` - OpenAI provider for AI SDK
- `zod` - Schema validation for tool parameters

**Root (dev dependencies):**
- `firebase-admin` - For local testing scripts

### Configuration

**OpenAI API Key:**
```bash
firebase functions:config:set openai.key="YOUR_OPENAI_API_KEY"
```

### Deployment

```bash
firebase deploy --only functions,database
```

**Deployed Resources:**
- Cloud Function: `processAICommand` (us-central1)
- Database Rules: Applied to Realtime Database

### Testing

**Local Emulator Setup:**
```bash
# Start emulators
npm run emulators

# Run test script
node test-function.js
```

**Emulator URLs:**
- Functions: http://localhost:5001
- Database: http://localhost:9000
- Emulator UI: http://localhost:4000

### Key Technical Decisions

1. **Vercel AI SDK over OpenAI SDK directly**
   - Reason: Better structured tool calling, automatic retries, type-safe tool definitions
   - Using `createOpenAI()` with API key for provider configuration
   - Using `generateText()` for synchronous tool generation

2. **Tool definitions use `inputSchema` not `parameters`**
   - Fixed TypeScript errors by using correct AI SDK v5 syntax
   - Tools defined with `tool()` function from `ai` package

3. **6-second timeout for OpenAI calls**
   - Prevents long-running requests
   - Returns user-friendly "AI service temporarily unavailable" message
   - Uses `Promise.race()` pattern

4. **Atomic increment for command counter**
   - Firebase transactions prevent race conditions
   - Multiple simultaneous requests won't cause incorrect counts

5. **System prompt includes context**
   - Canvas state (rectangle count)
   - Viewport center (for "create at center" commands)
   - Selection state (for modification commands)
   - Multi-step rules and color validation

6. **Error handling layers**
   - Authentication check (first)
   - Quota check (before OpenAI call)
   - Canvas limit check (1000 rectangles)
   - API key validation
   - Timeout handling
   - OpenAI API errors
   - Generic error fallback

### Build Verification

✅ TypeScript compilation successful (no errors)  
✅ All 7 new files created  
✅ All 3 existing files updated  
✅ Dependencies installed  
✅ API key configured  
✅ Deployed to production  

### Next Steps (PR #2)

- Create Canvas Command Executor Service (`/src/services/canvasCommandExecutor.ts`)
- Implement context gathering methods
- Implement command execution methods
- Add viewport tracking to CanvasContext
- Add selection locking to CanvasContext

---

## PR #2: Canvas Command Executor Service ✅

**Status:** Completed  
**Date:** October 17, 2025  
**Branch:** `ai-spike`

### Overview
Created the Canvas Command Executor service to execute AI-generated commands and manage viewport/selection context for the AI agent.

### Files Created (2 files)

1. **`/src/types/ai.ts`** (Client-Side AI Types)
   - `CanvasState` - All rectangles on canvas
   - `ViewportInfo` - User's viewport (center, zoom, visible bounds)
   - `SelectedShape` - Currently selected rectangle
   - `ProcessAICommandRequest` - Request to Cloud Function
   - `ProcessAICommandResponse` - Response from Cloud Function
   - `AICommand` - Individual tool call structure
   - `CommandSnapshot` - Immutable snapshot for command execution
   - **Note:** Types must match `/functions/src/types.ts` exactly

2. **`/src/services/canvasCommandExecutor.ts`** (Command Executor)
   - `CanvasCommandExecutor` class with dependency injection
   - **Context Gathering Methods:**
     - `getCanvasState()` - Returns all rectangles
     - `getViewportInfo()` - Returns current viewport from CanvasContext
     - `getSelectedShape()` - Returns selected rectangle or null
   - **Command Execution Methods:**
     - `executeCommand()` - Main dispatcher for all 6 tools
     - `executeCreateRectangle()` - Create single rectangle
     - `executeChangeColor()` - Modify rectangle color
     - `executeMoveRectangle()` - Update position
     - `executeResizeRectangle()` - Change dimensions
     - `executeDeleteRectangle()` - Remove rectangle
     - `executeCreateMultipleRectangles()` - Batch creation with layouts
   - **Critical Delegation Pattern:** Only calls CanvasContext methods, never writes to Firebase directly
   - **Hybrid Validation:** 
     - Color validation (strict VALID_AI_COLORS check)
     - Parameter clamping (x, y, width, height to valid ranges)
     - Rectangle existence checks
   - **Auto-Selection Support:** Accepts optional `createdRectangleId` for multi-step commands
   - **Layout Calculation:** row, column, grid patterns for batch creation

### Files Updated (3 files)

1. **`/src/utils/constants.ts`**
   - Added `AI_CONSTANTS`:
     - `MAX_CANVAS_RECTANGLES: 1000`
     - `MAX_USER_COMMANDS: 1000`
     - `DEFAULT_BATCH_OFFSET: 25`
     - `MIN_BATCH_OFFSET: 10`
     - `MAX_BATCH_OFFSET: 100`
     - `MAX_BATCH_COUNT: 50`
   - Added `VALID_AI_COLORS` array (matches Cloud Function)

2. **`/src/contexts/CanvasContext.tsx`** (Viewport & Selection Tracking)
   - Added `ViewportInfo` type import
   - Added state: `selectionLocked` (boolean)
   - Added ref: `viewportInfoRef` (useRef, no re-renders)
   - **New Methods:**
     - `getViewportInfo()` - Returns current viewport from ref
     - `updateViewportInfo(info)` - Updates viewport ref
     - `setSelectionLocked(locked)` - Controls selection changes during AI processing
   - **Modified `selectRectangle()`:**
     - Checks `selectionLocked` before allowing changes
     - Logs and returns early if locked
   - **Context Interface Updates:**
     - Added `selectionLocked` to state
     - Added viewport methods to interface
     - Updated context value object

3. **`/src/components/canvas/Canvas.tsx`** (Viewport Tracking)
   - Imported `updateViewportInfo` from useCanvas
   - **New Method: `sendViewportInfo()`:**
     - Calculates viewport center in canvas coordinates
     - Calculates visible bounds (left, top, right, bottom)
     - Gets current zoom level
     - Updates CanvasContext via `updateViewportInfo()`
   - **Viewport Updates On:**
     - Mount (initial viewport)
     - Wheel zoom (`handleWheel` - after zoom applied)
     - Pan end (`handleDragEnd` - after pan completed)
     - Window resize (new useEffect with resize listener)
   - Formula: `centerX = (width/2 - stageX) / scale`

### Key Technical Decisions

1. **useRef for Viewport Info**
   - Chosen over useState to avoid re-renders
   - Updated frequently (zoom, pan, resize) but only read during AI commands
   - CanvasContext exposes getter/setter methods

2. **Selection Locking**
   - Prevents race conditions when user changes selection during AI processing
   - Implemented in `selectRectangle()` with early return
   - Console logging for debugging

3. **Delegation Pattern (Critical)**
   - `canvasCommandExecutor` ONLY calls CanvasContext methods
   - CanvasContext handles ALL Firebase writes
   - Prevents duplicate broadcasts and data inconsistencies

4. **Hybrid Parameter Validation**
   - Executor clamps numeric values to valid ranges (safety net)
   - Strict color validation (throws error if invalid)
   - Rectangle existence checks before modifications

5. **Batch Creation Layouts**
   - Row: Horizontal spacing
   - Column: Vertical spacing  
   - Grid: Square/rectangular grid (√count columns)
   - All use configurable offset

### Build Verification

✅ TypeScript compilation successful (no errors)  
✅ All 2 new files created  
✅ All 3 existing files updated  
✅ Vite production build successful (810.58 KB bundle)  

### Next Steps (PR #3)

- Create AI Service Client (`/src/services/aiAgent.ts`)
- Create AI Agent Hook (`/src/hooks/useAIAgent.ts`)
- Create AI Error Utilities (`/src/utils/aiErrors.ts`)
- Update Firebase config for emulator support
- Implement command snapshot capture
- Implement selection locking during AI execution
- Implement auto-selection logic for single vs. multiple creation

---

## PR #3: AI Service Client & Cloud Function Integration

**Status:** Not Started  
**Branch:** `ai-spike`

(To be documented upon completion)

