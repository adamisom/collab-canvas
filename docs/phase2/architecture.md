# Collab Canvas Architecture - Phase 2 (AI Agent MVP)

## Overview

Collab Canvas is a real-time collaborative canvas application with AI-powered natural language control. Users can create, modify, and delete rectangles on a shared canvas through direct manipulation or natural language commands. All changes sync instantly across connected clients, and AI-generated operations are indistinguishable from manual user actions.

**Technology Stack:**
- **Frontend:** React 18, TypeScript, Vite
- **Canvas:** Konva.js + React-Konva
- **Backend:** Firebase (Realtime Database, Cloud Functions, Auth, Hosting)
- **AI:** OpenAI GPT-4o via Vercel AI SDK
- **Testing:** Vitest, React Testing Library

---

## System Architecture

### Frontend Architecture

#### Component Hierarchy

```
App
├── AuthContext (Firebase Anonymous Auth)
├── CanvasContext (Canvas state management)
│   ├── Header
│   │   └── LoginForm (Anonymous username entry)
│   ├── Canvas (Konva Stage + Layer)
│   │   ├── Rectangle[] (canvas objects)
│   │   ├── Cursor[] (other users' cursors)
│   │   └── ResizeHandle[] (selection handles)
│   └── AIChat (AI command interface)
│       ├── Input form
│       ├── Loading state
│       └── Result messages (success/error)
└── Toast (notifications)
```

#### Core Contexts

**1. AuthContext** (`/src/contexts/AuthContext.tsx`)
- Manages Firebase Anonymous Authentication
- Provides: `user`, `username`, `signIn()`, `signOut()`
- Stores username in localStorage for persistence
- Creates anonymous Firebase user on first visit

**2. CanvasContext** (`/src/contexts/CanvasContext.tsx`)
- Central state management for canvas operations
- **State:**
  - `rectangles[]` - All canvas rectangles (synced from Firebase)
  - `selectedRectangleId` - Current selection (exclusive, per-user)
  - `loading` - Initial data load state
  - `selectionLocked` - Prevents selection changes during AI processing
  - `viewportInfoRef` - Current viewport (useRef, no re-renders)
- **Methods:**
  - Canvas operations: `createRectangle()`, `updateRectangle()`, `resizeRectangle()`, `deleteRectangle()`, `changeRectangleColor()`
  - Selection: `selectRectangle()`, `clearSelection()`
  - Viewport: `getViewportInfo()`, `updateViewportInfo()`
  - AI support: `setSelectionLocked()`
- **Critical Pattern:** All Firebase writes happen here (single source of truth)

#### Custom Hooks

**1. useCanvas** - Access CanvasContext
**2. useAuth** - Access AuthContext  
**3. useCursors** (`/src/hooks/useCursors.ts`) - Real-time cursor tracking
**4. useAIAgent** (`/src/hooks/useAIAgent.ts`) - AI command processing interface

#### Service Layer

**1. canvasService** (`/src/services/canvasService.ts`)
- Firebase RTDB operations for rectangles
- CRUD operations: create, read, update, delete
- Selection management (exclusive per-user)
- Real-time listeners via `onRectanglesChange()`

**2. cursorService** (`/src/services/cursorService.ts`)
- Firebase RTDB operations for cursor positions
- Throttled updates (16ms) to reduce Firebase writes
- Stale cursor cleanup (30 second threshold)
- Real-time listeners via `onCursorsChange()`

**3. aiAgent** (`/src/services/aiAgent.ts`)
- AI command orchestration
- Captures immutable snapshot (canvas state, viewport, selection)
- Implements selection locking pattern
- Calls Firebase Cloud Function
- Executes returned commands via Canvas Command Executor
- Error handling and retry classification

**4. canvasCommandExecutor** (`/src/services/canvasCommandExecutor.ts`)
- Translates AI commands to canvas operations
- **Dependency injection:** Accepts `CanvasContextMethods` interface
- **Delegation pattern:** Only calls CanvasContext methods, never writes to Firebase directly
- **Context gathering:** `getCanvasState()`, `getViewportInfo()`, `getSelectedShape()`
- **Command execution:** 6 tools (create, changeColor, move, resize, delete, createMultiple)
- **Hybrid validation:** Parameter clamping, color validation, existence checks
- **Auto-selection:** Supports multi-step commands (single rectangle creation)

**5. firebaseService** (`/src/services/firebaseService.ts`)
- Low-level Firebase abstractions
- Exports: `dbRef()`, `dbSet()`, `dbGet()`, `dbUpdate()`, `dbRemove()`, `dbOnValue()`, `dbPush()`

#### Utilities

**1. batchLayoutCalculator** (`/src/utils/batchLayoutCalculator.ts`)
- Pure function for calculating rectangle positions
- Layouts: row (horizontal), column (vertical), grid (square/rectangular)
- Configurable offset between rectangles

**2. aiErrors** (`/src/utils/aiErrors.ts`)
- Error mapping: Firebase/OpenAI errors → user-friendly messages
- Error classification: retryable vs. non-retryable
- Partial success formatting for multi-step commands

**3. canvasHelpers** (`/src/utils/canvasHelpers.ts`)
- Coordinate transformations, bounds checking, throttle/debounce

**4. userColors** (`/src/utils/userColors.ts`)
- Deterministic cursor color assignment per user

**5. constants** (`/src/utils/constants.ts`)
- Canvas dimensions, bounds, constraints
- Color palettes, AI limits, batch creation settings

---

### Backend Architecture

#### Firebase Realtime Database

**Database Structure:**
```
/
├── users/
│   └── {userId}/
│       ├── username: string
│       └── aiCommandCount: number (atomic increment)
├── cursors/
│   └── {userId}/
│       ├── x: number
│       ├── y: number
│       ├── username: string
│       ├── userId: string
│       └── timestamp: number
└── rectangles/
    └── {rectangleId}/
        ├── x: number
        ├── y: number
        ├── width: number
        ├── height: number
        ├── color: string (hex)
        ├── createdBy: string (userId)
        ├── selectedBy: string | null (exclusive selection)
        └── selectedAt: number | null
```

**Real-time Sync:**
- WebSocket connections to Firebase RTDB
- `onValue()` listeners for rectangles and cursors
- Automatic reconnection on network issues
- Optimistic UI updates with Firebase sync

**Security Rules** (`/database.rules.json`):
- Authenticated users only
- Users can read all data
- Users can only write their own cursor
- Users can create rectangles (with `createdBy` validation)
- Users can modify any rectangle (collaborative editing)
- AI command count: read own, write only via atomic increment (no decrement)

#### Firebase Cloud Functions

**Location:** `/functions/src/`

**Main Function:** `processAICommand` (`/functions/src/index.ts`)
- **Type:** Callable HTTPS Cloud Function
- **Runtime:** Node.js 22
- **Trigger:** Client calls via Firebase SDK
- **Authentication:** Required (Firebase Auth)
- **Flow:**
  1. Validate authentication
  2. Check user quota (1000 commands max)
  3. Check canvas limits (1000 rectangles max)
  4. Build dynamic system prompt with context
  5. Call OpenAI GPT-4o with tool definitions (6-second timeout)
  6. Atomically increment user command counter
  7. Extract tool calls from AI response
  8. Return structured commands to client
- **Error Handling:**
  - `unauthenticated` - Not logged in
  - `resource-exhausted` - Quota exceeded
  - `failed-precondition` - Too many rectangles or missing API key
  - `deadline-exceeded` - OpenAI timeout
  - `internal` - Unexpected errors
- **Deployment:** `firebase deploy --only functions`

**Tool Definitions** (`/functions/src/tools.ts`)
- 6 tools using Vercel AI SDK `tool()` function
- Zod schema validation for parameters
- Tools:
  1. `createRectangle` - Single rectangle creation
  2. `changeColor` - Modify rectangle color (red/blue/green)
  3. `moveRectangle` - Update position
  4. `resizeRectangle` - Change dimensions
  5. `deleteRectangle` - Remove rectangle
  6. `createMultipleRectangles` - Batch creation (max 50, layout options)
- Constants-driven descriptions (no magic numbers)

**System Prompt Builder** (`/functions/src/utils/systemPrompt.ts`)
- Dynamic prompt with canvas context
- Includes: rectangle count, viewport center, selected shape
- Defines parameter ranges and validation rules
- Multi-step command rules (max 5 steps, only if first creates single rectangle)
- Color mapping (red/blue/green → hex codes)

**Rate Limiter** (`/functions/src/utils/rateLimiter.ts`)
- `checkCommandQuota()` - Verifies user hasn't exceeded 1000 commands
- `incrementCommandCount()` - Atomic Firebase transaction for counting
- Non-blocking increment (doesn't fail command if increment fails)

**Constants** (`/functions/src/constants.ts`)
- Canvas bounds (0-3000)
- Rectangle constraints (20-3000, default 100x80)
- Batch constraints (1-50 count, 10-100 offset)
- Parameter descriptions (self-documenting)

**Shared Types** (`/src/shared/types.ts`)
- Single source of truth for client and Cloud Functions
- TypeScript path mapping: `@shared/*` → `../src/shared/*`
- Prevents type drift between frontend and backend
- Includes:
  - `CanvasState`, `ViewportInfo`, `SelectedShape`
  - `ProcessAICommandRequest`, `ProcessAICommandResponse`
  - `AICommand`, `AICommandParameters` (union of all param types)
  - `VALID_RECTANGLE_COLORS` constant

**Configuration:**
```bash
# Set OpenAI API key
firebase functions:config:set openai.key="sk-..."

# View config
firebase functions:config:get
```

#### Firebase Auth

- **Method:** Anonymous Authentication
- **Username:** Stored in `/users/{userId}/username`
- **Session:** Persists across browser sessions
- **Limitation:** No password, no email (MVP only)

#### Firebase Hosting

- **Static site:** React SPA built with Vite
- **Deployment:** `firebase deploy --only hosting`
- **Custom domain:** Supported (configured in Firebase Console)

---

### AI Agent Architecture

#### Components

**1. AIChat Component** (`/src/components/ai/AIChat.tsx`)
- **UI States:**
  - Input form (text + submit button)
  - Loading (spinner + "Processing your command...")
  - Success (green checkmark + message + OK button)
  - Error (red X + message + Retry/OK based on retryability)
- **Features:**
  - Form submission with Enter key
  - Disabled state during processing
  - Auto-clear input after submission
  - Retry preserves original command
  - Focus management (auto-focus after clear)
- **Hints:** "Try: 'Create a blue rectangle' or 'Make it bigger'"
- **Position:** Fixed bottom-right (380px wide, responsive on mobile)

**2. useAIAgent Hook** (`/src/hooks/useAIAgent.ts`)
- **State:**
  - `isProcessing` - Boolean for loading state
  - `lastResult` - AIAgentResult (success/error/message)
- **Methods:**
  - `processCommand(userMessage)` - Execute AI command
  - `clearResult()` - Clear last result
- Memoizes AIAgent instance for performance
- Handles empty input validation

**3. AIAgent Service** (`/src/services/aiAgent.ts`)
- **Main Flow:**
  1. Capture immutable snapshot (canvas state, viewport, selection)
  2. Validate snapshot (viewport must be available)
  3. Lock selection (prevents user changes during processing)
  4. Call Cloud Function with snapshot
  5. Execute commands sequentially
  6. Handle auto-selection for single rectangle creation
  7. Unlock selection (in finally block)
  8. Return result with error classification
- **Key Methods:**
  - `processCommand(userMessage)` - Main entry point
  - `captureSnapshot()` - Creates immutable CommandSnapshot
  - `callCloudFunction()` - Calls Firebase httpsCallable
  - `executeCommands()` - Sequential execution with error handling
  - `executeCreateRectangleCommand()` - Special handling for first rectangle
- **Error Handling:** All errors mapped to user-friendly messages

**4. Canvas Command Executor** (`/src/services/canvasCommandExecutor.ts`)
- **Purpose:** Translates AI commands to canvas operations
- **Architecture:** Dependency injection with `CanvasContextMethods` interface
- **Critical Delegation Pattern:**
  - Executor ONLY calls CanvasContext methods
  - CanvasContext handles ALL Firebase writes
  - Prevents duplicate broadcasts and data inconsistencies
- **Context Gathering:**
  - `getCanvasState()` - Returns all rectangles
  - `getViewportInfo()` - Returns current viewport from CanvasContext ref
  - `getSelectedShape()` - Returns selected rectangle or null
- **Command Execution Methods:**
  - `executeCommand()` - Main dispatcher with switch statement
  - `executeCreateRectangle()` - Creates single rectangle
  - `executeChangeColor()` - Validates color, checks existence
  - `executeMoveRectangle()` - Clamps coordinates, checks existence
  - `executeResizeRectangle()` - Clamps dimensions, checks existence
  - `executeDeleteRectangle()` - Checks existence
  - `executeCreateMultipleRectangles()` - Batch creation with layout calculation
- **Hybrid Validation:**
  - Color validation: Strict check against VALID_AI_COLORS
  - Parameter clamping: x, y (0-3000), width, height (20-3000)
  - Rectangle existence: Checks before all modifications
- **Auto-Selection Support:**
  - Accepts optional `createdRectangleId` parameter
  - For multi-step commands: first creates rectangle, subsequent steps use that ID

#### Data Flow: AI Command Execution

```
1. User types natural language command in AIChat
   ↓
2. AIChat calls useAIAgent.processCommand()
   ↓
3. useAIAgent calls aiAgent.processCommand()
   ↓
4. aiAgent.captureSnapshot()
   - Gathers canvas state (all rectangles)
   - Gets viewport info (center, zoom, bounds) from CanvasContext ref
   - Gets selected shape (if any)
   - Creates immutable CommandSnapshot
   ↓
5. aiAgent locks selection (CanvasContext.setSelectionLocked(true))
   ↓
6. aiAgent.callCloudFunction()
   - Firebase httpsCallable("processAICommand")
   - Sends: userMessage, canvasState, viewportInfo, selectedShape
   ↓
7. Cloud Function: processAICommand
   - Validates authentication
   - Checks user quota (aiCommandCount < 1000)
   - Checks canvas limits (rectangles < 1000)
   - Validates API key
   - Builds dynamic system prompt with context
   - Calls OpenAI GPT-4o via Vercel AI SDK
   - 6-second timeout using Promise.race()
   ↓
8. OpenAI GPT-4o processes request
   - Receives system prompt + user message
   - Has access to 6 tool definitions
   - Determines which tools to use and parameters
   - Returns tool calls (function calling)
   ↓
9. Cloud Function extracts tool calls
   - Maps to structured AICommand[] format
   - Atomically increments user command counter
   - Returns ProcessAICommandResponse
   ↓
10. aiAgent.executeCommands()
    - Loops through commands sequentially
    - Special handling for first createRectangle (captures ID)
    - Subsequent commands use createdRectangleId if available
    ↓
11. For each command: canvasCommandExecutor.executeCommand()
    - Type assertion based on tool name
    - Calls specific execute method (executeCreateRectangle, etc.)
    - Each method validates parameters and calls CanvasContext
    ↓
12. CanvasContext method (e.g., createRectangle)
    - Performs operation
    - Writes to Firebase Realtime Database
    ↓
13. Firebase RTDB broadcasts change
    - All connected clients receive update via onValue() listeners
    - All users see the new/modified rectangle in real-time
    ↓
14. aiAgent unlocks selection (finally block)
    - CanvasContext.setSelectionLocked(false)
    - User can now change selection
    ↓
15. AIChat displays result
    - Success: green checkmark + optional AI message + OK button
    - Error: red X + error message + Retry (if retryable) or OK
```

#### Error Handling Flow

**Error Sources:**
1. Cloud Function errors (HttpsError codes)
2. Command executor errors (validation, existence)
3. Network errors
4. OpenAI API errors (timeout, rate limit)

**Error Mapping** (`/src/utils/aiErrors.ts`):
- `mapAIError()` - Converts errors to `{ message, retryable, originalError }`
- **Retryable errors:**
  - `deadline-exceeded` - OpenAI timeout
  - `unavailable` / `aborted` - Service unavailable
  - `internal` - Unexpected errors
  - Network errors
  - "Viewport not available"
- **Non-retryable errors:**
  - `unauthenticated` - Not logged in
  - `resource-exhausted` - Quota exceeded
  - `failed-precondition` - Too many rectangles
  - `invalid-argument` - Invalid request
  - Rectangle not found
  - Invalid color

**UI Response:**
- Retryable: "Retry" + "Cancel" buttons
- Non-retryable: "OK" button only

**Partial Success:**
- Multi-step commands report which step failed
- Format: "Completed N of M steps. Error: ..."
- Helps user understand what was accomplished

#### State Management

**AI Command State:**
- Local component state (isProcessing, lastResult)
- No persistent storage
- Cleared on component unmount or manual clear

**Canvas State:**
- Existing Firebase Realtime Database structure
- Real-time sync via onValue() listeners
- No separate state for AI-created vs. manually-created rectangles

**Usage Quota:**
- Stored at `/users/{userId}/aiCommandCount`
- Atomic increment via Firebase transaction
- Checked before each Cloud Function call
- Client doesn't track locally (server is source of truth)

**Selection Lock:**
- Boolean state in CanvasContext
- Prevents user selection changes during AI processing
- Always unlocked in finally block (even on errors)

**Viewport Tracking:**
- Stored in `useRef` in CanvasContext (no re-renders)
- Updated on: mount, wheel zoom, drag end, window resize
- Formula: `centerX = (width/2 - stageX) / scale`
- Read-only during AI command execution (immutable snapshot)

---

### External Integrations

#### OpenAI Integration

**Provider:** OpenAI  
**Model:** GPT-4o  
**SDK:** Vercel AI SDK v5 (`ai` package + `@ai-sdk/openai`)

**Configuration:**
```typescript
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const openai = createOpenAI({ apiKey: process.env.OPENAI_KEY })

const result = await generateText({
  model: openai('gpt-4o'),
  messages: [{ role: 'user', content: userMessage }],
  tools,
  system: systemPrompt
})
```

**Tool Calling:**
- Uses OpenAI's function calling API
- Tools defined with Zod schemas
- AI determines which tools to use and parameters
- Returns structured tool calls (not plain text)

**Timeout:** 6 seconds using Promise.race()

**Cost Management:**
- 1000 commands per user limit (client-side)
- No streaming (single request/response)
- System prompt ~500 tokens
- Average response ~100-200 tokens
- Estimated cost: $0.002-0.005 per command

---

### Key Architectural Patterns

#### 1. Delegation Pattern (Command Executor → CanvasContext)

**Problem:** Risk of duplicate Firebase writes and inconsistent state

**Solution:**
- Canvas Command Executor ONLY calls CanvasContext methods
- CanvasContext handles ALL Firebase writes (single source of truth)
- Prevents duplicate broadcasts

**Example:**
```typescript
// ✅ CORRECT (Executor)
await this.context.createRectangle(x, y)

// ❌ WRONG (Executor)
await canvasService.createRectangle(...)  // Bypasses CanvasContext!
```

#### 2. Immutable Snapshot Pattern (AI Agent)

**Problem:** User might change selection during AI processing

**Solution:**
- Capture canvas state, viewport, and selection at command submission time
- Lock selection to prevent changes
- All AI operations work with snapshot, not live state
- Unlock selection when done (finally block)

#### 3. Viewport via useRef (CanvasContext)

**Problem:** Viewport updates frequently (zoom, pan, resize) but rarely read

**Solution:**
- Store viewport info in `useRef` (no re-renders)
- Update on: mount, wheel, drag end, resize
- Expose getter/setter methods
- AI agent reads from ref during snapshot capture

#### 4. Shared Types via Path Mapping

**Problem:** 100 lines of duplicate type definitions between client and Cloud Functions

**Solution:**
- Single source of truth in `/src/shared/types.ts`
- TypeScript path mapping in `functions/tsconfig.json`
- Client imports: `from '../shared/types'`
- Functions imports: `from '@shared/types'`
- Compile-time guarantee of consistency

#### 5. Hybrid Validation (AI + Executor)

**Problem:** AI might generate out-of-range parameters despite system prompt

**Solution:**
- AI's system prompt guides it to refuse invalid values with explanations
- Command executor acts as safety net by clamping/validating
- Color validation: Strict check (throws error)
- Parameter clamping: Silent correction to valid ranges
- Existence checks: Throws error if rectangle not found

#### 6. Error Classification (Retryable vs. Non-Retryable)

**Problem:** Not all errors are user's fault

**Solution:**
- Map all errors to `{ message, retryable, originalError }`
- Retryable: Show "Retry" button (timeout, network, service unavailable)
- Non-retryable: Show "OK" button (auth, quota, invalid data)
- Helps user understand if they should try again

---

### Development & Testing

#### Local Development

**Frontend:**
```bash
npm run dev  # Vite dev server on http://localhost:5173
```

**Firebase Emulators:**
```bash
npm run emulators  # Starts Functions + Database emulators
```

**Connect React App to Emulators:**
```bash
VITE_USE_EMULATORS=true npm run dev
```

**Emulator URLs:**
- Functions: http://localhost:5001
- Database: http://localhost:9000
- Emulator UI: http://localhost:4000

#### Testing

**Unit Tests:**
```bash
npx vitest run  # Run all tests (151 tests)
```

**Test Coverage:**
- `tests/utils/aiErrors.test.ts` (20 tests) - Error handling
- `tests/services/canvasCommandExecutor.test.ts` (29 tests) - Command execution
- `tests/utils/batchLayoutCalculator.test.ts` (15 tests) - Layout calculations
- `tests/services/canvasService.test.ts` (30 tests) - Canvas operations
- `tests/services/cursorService.test.ts` (8 tests) - Cursor tracking
- `tests/hooks/useCursors.test.ts` (11 tests) - Cursor hook
- `tests/utils/canvasHelpers.test.ts` (26 tests) - Utility functions
- `tests/utils/rectangleColors.test.ts` (12 tests) - Color utilities

**Linting:**
```bash
npm run lint  # ESLint (0 errors, 0 warnings)
```

**Build:**
```bash
npm run build  # TypeScript + Vite production build
```

#### Deployment

**Full Deployment:**
```bash
firebase deploy  # Deploys hosting, functions, and database rules
```

**Selective Deployment:**
```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only database
```

**Environment Setup:**
```bash
# Set OpenAI API key
firebase functions:config:set openai.key="sk-..."

# View current config
firebase functions:config:get
```

---

### Performance Considerations

#### Optimizations Implemented

1. **Cursor Updates:** Throttled to 16ms (60fps)
2. **Viewport Info:** Stored in useRef (no re-renders)
3. **Stale Cursor Cleanup:** 30-second threshold
4. **AI Command Timeout:** 6 seconds (prevents long waits)
5. **Firebase Listeners:** Efficient onValue() with cleanup
6. **Code Splitting:** Considered but deferred (bundle < 1MB)

#### Known Limitations (MVP)

1. **Canvas Size:** 3000x3000 pixels (not infinite)
2. **Rectangle Limit:** 1000 rectangles per canvas
3. **AI Command Limit:** 1000 commands per user (lifetime)
4. **Batch Creation:** Max 50 rectangles at once
5. **Rectangle Colors:** 3 options only (red, blue, green)
6. **Authentication:** Anonymous only (no persistent accounts)
7. **Multi-step Commands:** Max 5 steps, only if first creates single rectangle
8. **Cold Start Latency:** Cloud Functions may have 2-5 second cold start

---

### Security

#### Authentication & Authorization

- Firebase Anonymous Auth (MVP)
- All database operations require authentication
- Users can modify any rectangle (collaborative editing)
- Selection is per-user and exclusive

#### Database Security Rules

- Authenticated users only
- Users can read all data
- Users can only write their own cursor
- AI command count protected (atomic increment only, no decrement)
- Rectangle creation requires `createdBy` field

#### API Key Protection

- OpenAI API key stored in Firebase Functions config
- Never exposed to client
- Cloud Function acts as proxy
- Rate limiting enforced server-side

#### Rate Limiting

- 1000 commands per user (lifetime)
- Checked before Cloud Function calls OpenAI
- Atomic increment prevents race conditions
- Client cannot reset counter

#### Input Validation

- Client-side: Basic validation (empty input)
- Cloud Function: Authentication, quota, canvas limits
- AI System Prompt: Parameter ranges, color validation
- Command Executor: Hybrid validation (clamping, strict color check, existence)

---

### Future Enhancements (Post-MVP)

**Documented Refactoring Opportunities:**
1. Extract coordinate transformation to `useCoordinateTransform` hook (Canvas.tsx)
2. Consider splitting Canvas.tsx concerns (currently 488 lines)
3. Replace console statements with proper logging service (41 instances)
4. Consider monorepo structure if project grows significantly

**Potential Features:**
1. Multi-select support (for AI and manual operations)
2. Undo/redo functionality
3. More shape types (circles, triangles, lines, text)
4. Persistent authentication (email/password)
5. Workspace/project management
6. Export to image/SVG
7. AI command history
8. More rectangle colors and custom colors
9. Infinite canvas (pagination/virtualization)
10. Collaborative text annotations

---

## Conclusion

Collab Canvas demonstrates a clean separation of concerns with:
- **Frontend:** React components, contexts, hooks, services
- **Backend:** Firebase RTDB for real-time sync, Cloud Functions for AI processing
- **AI Layer:** OpenAI integration with tool calling, command execution, error handling

The architecture prioritizes:
- **Real-time collaboration** - WebSocket sync via Firebase RTDB
- **Type safety** - Shared types prevent drift, zero `any` types in production
- **Maintainability** - Constants-driven, delegation patterns, clear boundaries
- **Testability** - 151 unit tests, dependency injection, pure functions
- **User experience** - Immediate feedback, loading states, retry logic, error messages

All AI-generated operations blend seamlessly with manual user actions, maintaining the collaborative canvas experience while adding natural language control capabilities.

