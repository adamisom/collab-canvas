# AI Canvas Agent - Implementation Task List

This document breaks down the AI Canvas Agent MVP implementation into Pull Requests, with detailed file changes for each PR.

---

## PR #1: Firebase Cloud Functions Setup & Infrastructure

**Goal**: Set up Firebase Cloud Functions infrastructure and OpenAI integration without any client-side changes.

### Dependencies to Install
```bash
# In /functions directory
npm install ai @ai-sdk/openai zod firebase-functions firebase-admin
```

### Files to Create
- `/functions/package.json` - Node.js dependencies for Cloud Functions
- `/functions/tsconfig.json` - TypeScript config for Cloud Functions
- `/functions/src/index.ts` - Main Cloud Function with `processAICommand`
- `/functions/src/types.ts` - TypeScript interfaces for AI commands
- `/functions/src/tools.ts` - Zod schemas and tool definitions
- `/functions/src/utils/rateLimiter.ts` - Usage quota checking logic
- `/functions/src/utils/systemPrompt.ts` - System prompt builder for OpenAI
- `/functions/.gitignore` - Ignore node_modules, compiled files

### Files to Update
- `/firebase.json` - Add functions configuration
- `/package.json` - Add functions scripts (deploy, serve)
- `/.gitignore` - Ignore functions config and secrets

### Configuration Steps
1. Run `firebase init functions` (TypeScript, ESLint)
2. Set OpenAI API key: `firebase functions:config:set openai.key="sk-..."`
3. Upgrade Firebase project to Blaze plan
4. Test locally: `firebase emulators:start --only functions`
5. Deploy: `firebase deploy --only functions`

### Implementation Details

#### `/functions/src/index.ts`
- Export `processAICommand` callable function
- Enforce authentication check
- Check user command quota at `/users/{userId}/aiCommandCount` (read atomically)
- Check canvas rectangle limit (1000 max)
- Call OpenAI GPT-4o via Vercel AI SDK with **6 second timeout**
- If OpenAI unreachable/timeout: Return error "AI service temporarily unavailable. Please try again."
- Increment command counter using **Firebase atomic increment** (prevents race conditions)
- Return structured response: `{ commands: AICommand[], message?: string }`
- Commands array contains tool calls, optional message for AI explanations/errors
- Handle errors with proper HttpsError codes
- **IMPORTANT**: Use atomic increment to avoid race conditions between multiple tabs/users

#### `/functions/src/tools.ts`
Define 6 Zod tool schemas:
1. `createRectangle` - x, y, width, height, color (default size: 100x80)
2. `changeColor` - shapeId, color
3. `moveRectangle` - shapeId, x, y
4. `resizeRectangle` - shapeId, width, height
5. `deleteRectangle` - shapeId
6. `createMultipleRectangles` - count, color, layout, offsetPixels (default offset: 25px)

**Color Validation**: Only accept exact hex codes: `#ef4444`, `#3b82f6`, `#22c55e`

#### `/functions/src/utils/systemPrompt.ts`
Build comprehensive system prompt:

```typescript
export const buildSystemPrompt = (canvasState, viewportInfo, selectedShape) => `
You are a canvas manipulation assistant. You can create and modify rectangles through natural language.

AVAILABLE COLORS (use exact hex codes):
- red: #ef4444
- blue: #3b82f6  
- green: #22c55e

DEFAULT RECTANGLE SIZE: 100 x 80 pixels
VIEWPORT CENTER: (${viewportInfo.centerX}, ${viewportInfo.centerY})

PARAMETER RANGES (validate user requests):
- Rectangle dimensions: 20-3000 pixels (width and height)
- Canvas positions: 0-3000 for x and y coordinates
- Batch creation: maximum 50 rectangles at once
- Offset spacing: 10-100 pixels (for batch layouts)

If user requests values outside these ranges, respond with:
"That value is outside the valid range. [Explain the valid range]"

RULES FOR MULTI-STEP COMMANDS:
- You can execute multiple actions in sequence (max 5 steps)
- Multi-step is ONLY allowed if the FIRST action creates exactly ONE rectangle
- After creating one rectangle, it will be auto-selected for subsequent modifications
- Examples of valid multi-step:
  * "Create a blue rectangle and resize it to 200x200"
  * "Create a red rectangle at 100,100 and make it 150 pixels wide"
- Invalid multi-step patterns (REFUSE these):
  * "Create 5 rectangles and make them all bigger" (cannot modify multiple)
  * "Make it bigger and change color" without creating first (unless already selected)

SELECTION CONTEXT:
${selectedShape ? `- User has selected: ${selectedShape.color} rectangle at (${selectedShape.x}, ${selectedShape.y})` : '- No rectangle currently selected'}
${!selectedShape ? '- Modification commands (resize, move, change color, delete) require selection' : ''}

CANVAS STATE:
- Total rectangles: ${canvasState.rectangles.length}
- Canvas limit: 1000 rectangles max

IMPORTANT CONSTRAINTS:
- If user requests invalid color (not red/blue/green), respond: "Invalid color. Available colors: red, blue, green"
- If modification requested without selection, respond: "Please select a rectangle first"
- If impossible multi-step pattern, explain: "I can only modify rectangles when creating one at a time"
- If command is ambiguous, ask for clarification
- Always use exact hex codes for colors in tool calls

When user says "in the center", use viewport center coordinates shown above.
`;
```

#### `/functions/src/utils/rateLimiter.ts`
Implement atomic command counter:

```typescript
import { getDatabase, ref, get, update, increment } from 'firebase-admin/database';

export async function checkAndIncrementCommandCount(userId: string): Promise<void> {
  const db = getDatabase();
  const userRef = ref(db, `users/${userId}`);
  
  // Read current count
  const snapshot = await get(userRef);
  const currentCount = snapshot.val()?.aiCommandCount || 0;
  
  if (currentCount >= 1000) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'AI command limit reached (1000 commands per user)'
    );
  }
  
  // Atomic increment (prevents race conditions)
  await update(userRef, {
    aiCommandCount: increment(1)
  });
}
```

#### `/functions/src/types.ts`
```typescript
export interface CanvasState {
  rectangles: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
  }>;
}

export interface ViewportInfo {
  centerX: number;
  centerY: number;
  zoom: number;
  visibleBounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

export interface SelectedShape {
  id: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessAICommandRequest {
  userMessage: string;
  canvasState: CanvasState;
  viewportInfo: ViewportInfo;
  selectedShape: SelectedShape | null;
}

export interface ProcessAICommandResponse {
  commands: AICommand[];
  message?: string;  // Optional AI explanation or error message
}

export interface AICommand {
  tool: string;
  parameters: Record<string, any>;
}
```

### Firebase Security Rules

Add to `/firebase.json` or update via Firebase Console:

```json
{
  "database": {
    "rules": "database.rules.json"
  }
}
```

Create `/database.rules.json`:

```json
{
  "rules": {
    "users": {
      "$userId": {
        "aiCommandCount": {
          ".read": "auth.uid === $userId",
          ".write": "auth.uid === $userId && (
            !data.exists() || 
            newData.val() > data.val()
          )"
        }
      }
    },
    "rectangles": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "cursors": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

**Security Rule Explanation**:
- `aiCommandCount` can only increase (prevents users from resetting their quota)
- Users can only read/write their own command count
- Rectangles and cursors require authentication (existing rules)

### Testing Checklist
- [ ] Cloud Function deploys successfully
- [ ] Function enforces authentication
- [ ] Function checks command quota (blocks at 1000)
- [ ] Function uses atomic increment (test with concurrent requests)
- [ ] Function checks canvas limits (blocks at 1000 rectangles)
- [ ] Function calls OpenAI with 6 second timeout
- [ ] Timeout error returns user-friendly message
- [ ] Function returns commands + optional message
- [ ] System prompt includes color hex codes
- [ ] System prompt includes multi-step rules
- [ ] AI refuses invalid colors with error message
- [ ] AI refuses impossible multi-step patterns
- [ ] Firebase security rules prevent quota manipulation
- [ ] Error handling works (auth, quota, limits, timeout)

---

## PR #2: Canvas Command Executor Service

**Goal**: Create client-side service to execute canvas commands and provide context to AI.

### Files to Create
- `/src/services/canvasCommandExecutor.ts` - All canvas command execution logic
- `/src/types/ai.ts` - TypeScript interfaces for AI commands

### Files to Update
- `/src/services/canvasService.ts` - May need minor updates for new operations
- `/src/contexts/CanvasContext.tsx` - **CRITICAL Updates:**
  - Add viewport info management with useRef (no re-renders)
  - Add `setSelectionLocked()` method for locking selection during AI processing
  - Modify `selectRectangle()` to check `selectionLocked` state
- `/src/components/canvas/Canvas.tsx` - Update viewport info on pan/zoom/resize/mount
- `/src/utils/constants.ts` - Verify DEFAULT_RECT values (should be 100x80)

### Implementation Details

#### `/src/services/canvasCommandExecutor.ts`
Create service class with methods:

**Context Gathering Methods:**
- `getCanvasState(): CanvasState`
  - Returns all rectangles from CanvasContext
  - Maps to simplified format for AI (id, x, y, width, height, color only)
  - Omits metadata like createdBy, timestamps, selectedBy
  - Returns all rectangles (up to 1000) for full canvas context
  
- `getViewportInfo(): ViewportInfo`
  - **IMPORTANT**: Gets viewport info from CanvasContext (NOT directly from stage ref)
  - CanvasContext maintains viewport info via useRef (updated by Canvas component)
  - Returns: centerX, centerY, zoom, visibleBounds
  - This info is recalculated immediately before AI command execution
  
- `getSelectedShape(): SelectedShape | null`
  - Returns currently selected rectangle from CanvasContext
  - Returns null if no selection
  - Used to pass selection context to AI

**Command Execution Methods:**

**CRITICAL DELEGATION PATTERN**: 
- Command executor **ONLY** calls CanvasContext methods
- CanvasContext handles **ALL** Firebase writes
- Command executor is purely orchestration layer
- **NEVER** write directly to Firebase from command executor

- `createRectangle(x: number, y: number, width: number, height: number, color: string): Promise<string>`
  - Call CanvasContext.createRectangle()
  - Use default width/height if not specified (100x80 from DEFAULT_RECT constants)
  - Validate color against RECTANGLE_COLORS (#ef4444, #3b82f6, #22c55e)
  - Return created rectangle ID
  - **Note**: This method does NOT auto-select (that's handled by aiAgent layer)
  
- `changeColor(shapeId: string, color: string): Promise<void>`
  - **CRITICAL**: Validate rectangle exists before modifying
  - `if (!rectangles.find(r => r.id === shapeId)) throw new Error('Rectangle not found - it may have been deleted')`
  - Validate color against RECTANGLE_COLORS
  - Call CanvasContext.changeRectangleColor()
  - Handles concurrent deletion by other users
  
- `moveRectangle(shapeId: string, x: number, y: number): Promise<void>`
  - **CRITICAL**: Validate rectangle exists before modifying
  - `if (!rectangles.find(r => r.id === shapeId)) throw new Error('Rectangle not found - it may have been deleted')`
  - Clamp position to canvas bounds (0-3000 for x and y)
  - Call CanvasContext.updateRectangle() with new position
  
- `resizeRectangle(shapeId: string, width: number, height: number): Promise<void>`
  - **CRITICAL**: Validate rectangle exists before modifying
  - `if (!rectangles.find(r => r.id === shapeId)) throw new Error('Rectangle not found - it may have been deleted')`
  - Clamp dimensions: MIN (20px) to MAX (3000px) for width and height
  - Call CanvasContext.resizeRectangle()
  - Safety net for AI values outside valid range
  
- `deleteRectangle(shapeId: string): Promise<void>`
  - **CRITICAL**: Validate rectangle exists before deleting
  - `if (!rectangles.find(r => r.id === shapeId)) throw new Error('Rectangle not found - it may have been deleted')`
  - Call CanvasContext.deleteRectangle()
  - Handles case where rectangle already deleted by another user
  
- `createMultipleRectangles(count: number, color: string, layout?: 'row' | 'column' | 'grid', offsetPixels: number = 25): Promise<string[]>`
  - Validate count: clamp to 1-50 (prevent canvas flooding)
  - Validate offsetPixels: clamp to 10-100 (prevent extreme values)
  - Get viewport center
  - Loop and create rectangles with offsets
  - For 'row': increment X by (width + offsetPixels)
  - For 'column': increment Y by (height + offsetPixels)
  - For 'grid' or default: diagonal offset
  - Return array of created IDs

**Error Handling Strategy:**

The command executor uses **hybrid validation**:

1. **Existence Validation** (Runtime):
   - Check if target rectangle exists before all modification operations
   - Throws descriptive error if not found: `"Rectangle not found - it may have been deleted"`
   - aiAgent catches this and reports to user

2. **Parameter Clamping** (Safety Net):
   - Dimensions: Clamp to 20-3000px (AI should respect these, executor enforces)
   - Positions: Clamp to canvas bounds 0-3000 (AI should calculate correctly, executor clamps edge cases)
   - Count: Clamp batch creation to 1-50 rectangles
   - Offsets: Clamp to 10-100px

3. **Color Validation** (Strict):
   - Only accept: `#ef4444`, `#3b82f6`, `#22c55e`
   - Throw error for invalid colors (AI should prevent this, executor validates)

**Why Hybrid?**
- AI prevents most issues via system prompt (user-friendly explanations)
- Executor enforces as safety net (prevents edge cases)
- Clamping instead of throwing for numeric ranges (more forgiving)
- Throws errors for logical issues (missing rectangle, invalid color)

#### `/src/types/ai.ts`
```typescript
export interface CanvasState {
  rectangles: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
  }>;
}

export interface ViewportInfo {
  centerX: number;
  centerY: number;
  zoom: number;
  visibleBounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

export interface SelectedShape {
  id: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AICommand {
  tool: string;
  parameters: Record<string, any>;
}
```

### Updates to Existing Files

#### `/src/contexts/CanvasContext.tsx` - **CRITICAL VIEWPORT INFO IMPLEMENTATION**

Add viewport info management with useRef pattern:

```typescript
// Add to CanvasContext interface
interface CanvasContextType {
  // ... existing methods
  getViewportInfo: () => ViewportInfo;
  updateViewportInfo: (stage: Konva.Stage, width: number, height: number) => void;
  setSelectionLocked: (locked: boolean) => void;  // NEW: Lock selection during AI processing
}

// In CanvasProvider component
const viewportInfoRef = useRef<ViewportInfo>({
  centerX: 0,
  centerY: 0,
  zoom: 1,
  visibleBounds: { left: 0, top: 0, right: 1200, bottom: 800 }
});

const [selectionLocked, setSelectionLocked] = useState(false);

// Getter method (no re-renders)
const getViewportInfo = useCallback(() => {
  return { ...viewportInfoRef.current };
}, []);

// Update method (called by Canvas component)
const updateViewportInfo = useCallback((stage: Konva.Stage, width: number, height: number) => {
  if (!stage) return;
  
  const scale = stage.scaleX();
  const stageX = stage.x();
  const stageY = stage.y();
  
  // Konva viewport center calculation formula
  viewportInfoRef.current = {
    centerX: -stageX / scale + (width / 2) / scale,
    centerY: -stageY / scale + (height / 2) / scale,
    zoom: scale,
    visibleBounds: {
      left: -stageX / scale,
      top: -stageY / scale,
      right: (-stageX + width) / scale,
      bottom: (-stageY + height) / scale
    }
  };
}, []);
```

**Why useRef?**
- No re-renders on viewport changes (performance)
- Always current when accessed
- Clean separation from Canvas component

**Selection Locking Implementation:**
```typescript
// In selectRectangle method
const selectRectangle = useCallback(async (rectangleId: string | null) => {
  // Prevent selection changes while AI is processing
  if (selectionLocked) {
    console.log('Selection locked during AI processing');
    return;
  }
  
  // ... existing selection logic
}, [selectionLocked, /* other deps */]);
```

This prevents users from clicking on different rectangles while AI commands are executing, avoiding race conditions where the AI is working on one rectangle but the user selects another mid-execution.

#### `/src/components/canvas/Canvas.tsx`

Add viewport update calls:

```typescript
const { updateViewportInfo } = useCanvas();

// Update on mount
useEffect(() => {
  if (stageRef.current) {
    updateViewportInfo(stageRef.current, width, height);
  }
}, [updateViewportInfo, width, height]);

// Update on drag end (not drag move - performance)
const handleDragEnd = useCallback(() => {
  setIsDragging(false);
  if (stageRef.current) {
    updateViewportInfo(stageRef.current, width, height);
  }
}, [updateViewportInfo, width, height]);

// Update on wheel (zoom)
const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
  // ... existing zoom logic ...
  
  // After zoom calculation
  if (stageRef.current) {
    updateViewportInfo(stageRef.current, width, height);
  }
}, [updateViewportInfo, width, height]);

// Update on window resize
useEffect(() => {
  const handleResize = () => {
    if (stageRef.current) {
      updateViewportInfo(stageRef.current, window.innerWidth, window.innerHeight);
    }
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [updateViewportInfo]);
```

**Update Triggers**:
- Component mount (initial state)
- Drag end (after pan)
- Wheel (after zoom)
- Window resize (viewport size changes)
- **Also updated immediately before AI command execution** (in aiAgent.ts)

### Testing Checklist
- [ ] `getCanvasState()` returns all rectangles
- [ ] `getViewportInfo()` calculates viewport center correctly
- [ ] `getSelectedShape()` returns current selection or null
- [ ] `createRectangle()` creates at specified position
- [ ] `createRectangle()` uses viewport center when position not specified
- [ ] `changeColor()` updates color correctly
- [ ] `moveRectangle()` moves to new position
- [ ] `resizeRectangle()` resizes correctly
- [ ] `deleteRectangle()` removes rectangle
- [ ] `createMultipleRectangles()` creates with offsets
- [ ] All commands sync to Firebase RTDB
- [ ] All commands validate inputs

---

## PR #3: AI Service Client & Cloud Function Integration

**Goal**: Create client-side wrapper for calling Cloud Function and executing commands.

### Files to Create
- `/src/services/aiAgent.ts` - AI service client
- `/src/hooks/useAIAgent.ts` - React hook for AI agent
- `/src/utils/aiErrors.ts` - Error message mapping

### Files to Update
- `/src/config/firebase.ts` - Export `functions` instance
- `/package.json` - Ensure `firebase` package supports callable functions

### Implementation Details

#### `/src/services/aiAgent.ts`
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { canvasCommandExecutor } from './canvasCommandExecutor';
import { mapAIError } from '../utils/aiErrors';
import { useCanvas } from '../contexts/CanvasContext';

export class AIAgent {
  private functions: Functions;
  private isProcessing: boolean = false;
  
  constructor() {
    this.functions = getFunctions();
  }
  
  async processCommand(userMessage: string): Promise<{
    success: boolean;
    message: string;
    commandsExecuted: number;
    commandsFailed?: number;
  }> {
    // Prevent concurrent command execution
    if (this.isProcessing) {
      return {
        success: false,
        message: 'Please wait for current command to complete',
        commandsExecuted: 0
      };
    }
    
    this.isProcessing = true;
    
    try {
      // Ensure viewport info is fresh before gathering context
      const canvas = document.querySelector('.canvas-wrapper');
      if (canvas && stageRef) {
        updateViewportInfo(stageRef.current, canvas.clientWidth, canvas.clientHeight);
      }
      
      // CRITICAL: Capture immutable snapshot at command submission
      const commandSnapshot = {
        selectedShapeId: canvasContext.selectedRectangleId,  // Lock this!
        canvasState: canvasCommandExecutor.getCanvasState(),
        viewportInfo: canvasCommandExecutor.getViewportInfo(),
        selectedShape: canvasCommandExecutor.getSelectedShape(),
        timestamp: Date.now()
      };
      
      // Lock user selection during processing (prevents race conditions)
      const selectionLocked = true;
      canvasContext.setSelectionLocked?.(true);
      
      // Gather context from snapshot
      const { canvasState, viewportInfo, selectedShape } = commandSnapshot;
      
      // Call Cloud Function
      const processAICommand = httpsCallable(this.functions, 'processAICommand');
      const result = await processAICommand({
        userMessage,
        canvasState,
        viewportInfo,
        selectedShape
      });
      
      const { commands, message } = result.data as { commands: AICommand[], message?: string };
      
      // If AI returned message without commands, return it
      if (!commands || commands.length === 0) {
        return {
          success: message ? true : false,
          message: message || 'No commands to execute',
          commandsExecuted: 0
        };
      }
      
      // Execute commands with auto-selection logic and error handling
      let executedCount = 0;
      let failedCount = 0;
      let autoSelectedId: string | null = null;
      const commandNames = {
        createRectangle: 'create rectangle',
        changeColor: 'change color',
        moveRectangle: 'move rectangle',
        resizeRectangle: 'resize rectangle',
        deleteRectangle: 'delete rectangle',
        createMultipleRectangles: 'create multiple rectangles'
      };
      
      try {
        for (let i = 0; i < commands.length; i++) {
          const command = commands[i];
          
          try {
            // FIRST command: check for single rectangle creation
            if (i === 0 && command.tool === 'createRectangle') {
              const rectangleId = await this.executeSingleCommand(command, commandSnapshot);
              autoSelectedId = rectangleId;
              
              // Auto-select for subsequent modifications
              await canvasContext.selectRectangle(rectangleId);
              executedCount++;
            } 
            // Subsequent commands or non-create first command
            else {
              await this.executeSingleCommand(command, commandSnapshot);
              executedCount++;
            }
          } catch (error: any) {
            failedCount++;
            
            // If first command fails, total failure
            if (i === 0) {
              throw error;
            }
            
            // Subsequent command failed - partial success
            const failedAction = commandNames[command.tool] || command.tool;
            return {
              success: false,
              message: `${this.describeSuccess(executedCount, commands)} but could not ${failedAction}: ${error.message}`,
              commandsExecuted: executedCount,
              commandsFailed: failedCount
            };
          }
        }
        
        const resultMessage = message || this.describeSuccess(executedCount, commands);
        
        return {
          success: true,
          message: resultMessage,
          commandsExecuted: executedCount,
          commandsFailed: 0
        };
        
      } finally {
        // Always unlock selection when done
        this.isProcessing = false;
        canvasContext.setSelectionLocked?.(false);
      }
      
    } catch (error: any) {
      this.isProcessing = false;
      canvasContext.setSelectionLocked?.(false);
      
      return {
        success: false,
        message: mapAIError(error),
        commandsExecuted: 0,
        commandsFailed: commands?.length || 1
      };
    }
  }
  
  // Helper to describe what succeeded
  private describeSuccess(count: number, commands: AICommand[]): string {
    if (count === 1 && commands[0].tool === 'createRectangle') {
      return 'Created rectangle';
    } else if (count === 1) {
      return 'Command executed successfully';
    } else if (count === commands.length) {
      return `Successfully executed all ${count} commands`;
    } else {
      return `Successfully executed ${count} of ${commands.length} commands`;
    }
  }
  
  private async executeSingleCommand(
    command: AICommand, 
    snapshot: CommandSnapshot
  ): Promise<string | null> {
    const { tool, parameters } = command;
    
    switch (tool) {
      case 'createRectangle':
        // Returns rectangle ID for auto-selection
        // Uses viewport info from snapshot
        return await canvasCommandExecutor.createRectangle(
          parameters.x,
          parameters.y,
          parameters.width,
          parameters.height,
          parameters.color
        );
        
      case 'changeColor':
        // Validates rectangle still exists before modifying
        await canvasCommandExecutor.changeColor(
          parameters.shapeId,
          parameters.color
        );
        return null;
        
      case 'moveRectangle':
        // Validates rectangle still exists before modifying
        await canvasCommandExecutor.moveRectangle(
          parameters.shapeId,
          parameters.x,
          parameters.y
        );
        return null;
        
      case 'resizeRectangle':
        // Validates rectangle still exists before modifying
        await canvasCommandExecutor.resizeRectangle(
          parameters.shapeId,
          parameters.width,
          parameters.height
        );
        return null;
        
      case 'deleteRectangle':
        // Validates rectangle still exists before deleting
        await canvasCommandExecutor.deleteRectangle(parameters.shapeId);
        return null;
        
      case 'createMultipleRectangles':
        // Multiple rectangles - no auto-selection
        // Uses viewport info from snapshot
        await canvasCommandExecutor.createMultipleRectangles(
          parameters.count,
          parameters.color,
          parameters.layout,
          parameters.offsetPixels
        );
        return null;
        
      default:
        throw new Error(`Unknown command: ${tool}`);
    }
  }
}

interface CommandSnapshot {
  selectedShapeId: string | null;
  canvasState: CanvasState;
  viewportInfo: ViewportInfo;
  selectedShape: SelectedShape | null;
  timestamp: number;
}

export const aiAgent = new AIAgent();
```

**Key Implementation Details:**

**Selection Locking During Execution:**
- When AI command starts, user selection is locked (prevents concurrent modification)
- User cannot select different rectangles while AI is processing
- Prevents race condition where user selects different rectangle mid-execution
- Selection unlocked in `finally` block (always runs, even on error)

**Immutable Snapshot Strategy:**
- Full context captured at command submission time
- Selected shape ID locked in snapshot
- Viewport info from snapshot used for positioning
- If target rectangle deleted during execution, command fails with clear error

**Partial Failure Handling:**
- Multi-step: If step 1 succeeds but step 2 fails, keep step 1 results
- Error message format: "Created rectangle but could not resize rectangle: Rectangle not found - it may have been deleted"
- Returns detailed counts: `commandsExecuted` and `commandsFailed`

**Key Auto-Selection Logic:**
- If first command is `createRectangle` → auto-select the created rectangle
- If first command is `createMultipleRectangles` → no auto-selection (user must select manually)
- Subsequent commands in multi-step sequence use the auto-selected rectangle
- Max 5 commands per sequence (enforced by system prompt)
- Partial success acceptable: if step 2 fails, step 1 rectangle still exists

#### `/src/hooks/useAIAgent.ts`
```typescript
import { useState } from 'react';
import { aiAgent } from '../services/aiAgent';

export const useAIAgent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const processCommand = async (userMessage: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const result = await aiAgent.processCommand(userMessage);
      
      if (result.success) {
        setSuccessMessage(result.message);
      } else {
        setError(result.message);
      }
      
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'An unexpected error occurred';
      setError(errorMsg);
      return { success: false, message: errorMsg, commandsExecuted: 0 };
    } finally {
      setLoading(false);
    }
  };
  
  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };
  
  return {
    processCommand,
    loading,
    error,
    successMessage,
    clearMessages
  };
};
```

#### `/src/utils/aiErrors.ts`
```typescript
export interface MappedError {
  message: string;
  retryable: boolean;  // Can user retry this error?
}

export const mapAIError = (error: any): MappedError => {
  // Firebase Functions error codes
  if (error.code) {
    switch (error.code) {
      case 'unauthenticated':
        return {
          message: 'You must be logged in to use AI commands',
          retryable: false  // Need to log in first
        };
      case 'resource-exhausted':
        return {
          message: 'AI command limit reached (1000 commands per user)',
          retryable: false  // Hit quota limit
        };
      case 'failed-precondition':
        if (error.message.includes('rectangles')) {
          return {
            message: 'Canvas has too many rectangles (limit: 1000)',
            retryable: false  // Canvas full
          };
        }
        return {
          message: error.message,
          retryable: false
        };
      case 'deadline-exceeded':
        return {
          message: 'AI service temporarily unavailable. Please try again.',
          retryable: true  // Timeout - can retry
        };
      case 'unavailable':
        return {
          message: 'Service unavailable. Please try again.',
          retryable: true  // Network/service issue - can retry
        };
      case 'invalid-argument':
        return {
          message: `Invalid command: ${error.message}`,
          retryable: false  // Bad request
        };
      default:
        return {
          message: error.message || 'An error occurred',
          retryable: false
        };
    }
  }
  
  // Network errors (retryable)
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return {
      message: 'Network error. Please check your connection.',
      retryable: true
    };
  }
  
  // Rectangle not found (from command executor)
  if (error.message?.includes('not found')) {
    return {
      message: error.message,
      retryable: false  // Rectangle was deleted
    };
  }
  
  // Default
  return {
    message: error.message || 'An unexpected error occurred',
    retryable: false
  };
};
```

**Error Classification:**

**Retryable Errors** (show "Retry" button):
- Network timeouts
- Service unavailable
- OpenAI timeout (deadline-exceeded)
- Temporary Firebase issues

**Non-Retryable Errors** (show "OK" button only):
- Authentication errors (need to log in)
- Quota exceeded (hit 1000 limit)
- Canvas full (1000 rectangles)
- Rectangle not found (was deleted)
- Invalid parameters (AI/validation error)

**Error Flow Diagram:**
```
Layer 1: Cloud Function
├─ Auth check → HttpsError('unauthenticated') → Non-retryable
├─ Quota check → HttpsError('resource-exhausted') → Non-retryable  
├─ Canvas limit → HttpsError('failed-precondition') → Non-retryable
├─ OpenAI timeout → HttpsError('deadline-exceeded') → Retryable
└─ OpenAI error → HttpsError(code) → Varies

Layer 2: AI (via system prompt)
├─ Invalid color → Returns message only → Non-retryable (user education)
├─ Impossible pattern → Returns message only → Non-retryable (user education)
└─ Out of range → Returns message only → Non-retryable (user education)

Layer 3: Command Executor
├─ Rectangle not found → Throws Error → Non-retryable (concurrent deletion)
├─ Invalid color → Throws Error → Non-retryable (validation)
└─ Parameter clamping → Silent (no error, just clamps)

Layer 4: AI Agent (orchestrates)
├─ Catches all errors from executor
├─ For multi-step: Partial failure → Detailed message
├─ Maps via aiErrors.ts
└─ Returns: { success, message, retryable, commandsExecuted, commandsFailed }

Layer 5: UI
├─ Success: Green message, auto-clear after 3s
├─ Partial success: Yellow message with details
├─ Error (retryable): Red message with "Retry" button
└─ Error (non-retryable): Red message with "OK" button only
```


#### `/src/config/firebase.ts`
```typescript
// Add exports for Cloud Functions
import { getFunctions } from 'firebase/functions';

export const functions = getFunctions(app);
```

### Testing Checklist
- [ ] `aiAgent.processCommand()` calls Cloud Function
- [ ] Viewport info refreshed before gathering context
- [ ] Command context gathering works (canvas state, viewport, selection)
- [ ] All 6 command types execute correctly
- [ ] Single rectangle creation auto-selects the rectangle
- [ ] Multiple rectangle creation does NOT auto-select
- [ ] Multi-step commands work (create + modify)
- [ ] Multi-step: "create rectangle and resize" succeeds
- [ ] Multi-step: "create 5 and resize" fails appropriately (no selection)
- [ ] AI message-only responses display correctly (no commands)
- [ ] Error handling works for all error types
- [ ] Error messages are user-friendly
- [ ] Loading states work
- [ ] Success messages display
- [ ] Partial failure handling (step 1 succeeds, step 2 fails)
- [ ] TypeScript interfaces match Cloud Function types exactly

---

## PR #4: AI Chat Interface Component

**Goal**: Create UI component for users to interact with the AI agent.

### Files to Create
- `/src/components/ai/AIChat.tsx` - Main AI chat component
- `/src/components/ai/AIChat.css` - Styles for chat interface
- `/src/components/ai/CommandSuggestions.tsx` - Example commands helper (optional)

### Files to Update
- `/src/App.tsx` - Import and render AIChat component
- `/src/index.css` - Global styles if needed

### Implementation Details

#### `/src/components/ai/AIChat.tsx`
```typescript
import React, { useState, useRef } from 'react';
import { useAIAgent } from '../../hooks/useAIAgent';
import './AIChat.css';

const AIChat: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [lastCommand, setLastCommand] = useState<string>('');
  const [isRetryable, setIsRetryable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { processCommand, loading, error, successMessage, clearMessages } = useAIAgent();
  
  const handleSubmit = async (e: React.FormEvent, isRetry: boolean = false) => {
    e.preventDefault();
    
    if (loading) return;
    
    let command: string;
    if (isRetry && lastCommand) {
      command = lastCommand;
    } else {
      if (!inputValue.trim()) return;
      command = inputValue.trim();
      setLastCommand(command);  // Save for potential retry
      setInputValue(''); // Clear immediately for better UX
    }
    
    const result = await processCommand(command);
    
    // Track if error is retryable
    if (!result.success && error) {
      // Check if error indicates retryability
      const retryable = error.includes('temporarily unavailable') || 
                        error.includes('try again') ||
                        error.includes('Network error');
      setIsRetryable(retryable);
    }
    
    // Auto-clear success messages after 3 seconds
    if (result.success && successMessage) {
      setTimeout(clearMessages, 3000);
    }
  };
  
  const handleRetry = (e: React.MouseEvent) => {
    handleSubmit(e as any, true);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };
  
  return (
    <div className="ai-chat">
      <div className="ai-chat-header">
        <h3>AI Assistant</h3>
      </div>
      
      <div className="ai-chat-messages">
        {loading && (
          <div className="ai-message ai-loading">
            <span className="ai-spinner"></span>
            Processing your command...
          </div>
        )}
        
        {error && (
          <div className="ai-message ai-error">
            <strong>Error:</strong> {error}
            <div className="ai-error-actions">
              {isRetryable ? (
                <button 
                  onClick={handleRetry}
                  className="ai-error-button ai-retry-button"
                  disabled={loading}
                >
                  Retry
                </button>
              ) : (
                <button 
                  onClick={clearMessages}
                  className="ai-error-button ai-ok-button"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="ai-message ai-success">
            {successMessage}
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="ai-chat-input-form">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell the AI what to do... (e.g., 'Create a blue rectangle')"
          disabled={loading}
          className="ai-chat-input"
        />
        <button 
          type="submit" 
          disabled={!inputValue.trim() || loading}
          className="ai-chat-submit"
        >
          Send
        </button>
      </form>
      
      <div className="ai-chat-examples">
        <small>Examples:</small>
        <ul>
          <li>"Create a blue rectangle in the center"</li>
          <li>"Make it red" (with selection)</li>
          <li>"Move it to 200, 300"</li>
          <li>"Create 5 green rectangles"</li>
        </ul>
      </div>
    </div>
  );
};

export default AIChat;
```

#### `/src/components/ai/AIChat.css`
```css
.ai-chat {
  position: fixed;
  right: 20px;
  top: 80px;
  width: 350px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  max-height: 500px;
}

.ai-chat-header {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.ai-chat-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.ai-chat-messages {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  min-height: 60px;
  max-height: 200px;
}

.ai-message {
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 14px;
}

.ai-loading {
  background: #e3f2fd;
  color: #1976d2;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #1976d2;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-error {
  background: #ffebee;
  color: #c62828;
}

.ai-error-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.ai-error-button {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.ai-retry-button {
  background: #1976d2;
  color: white;
}

.ai-retry-button:hover:not(:disabled) {
  background: #1565c0;
}

.ai-retry-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.ai-ok-button {
  background: #666;
  color: white;
}

.ai-ok-button:hover {
  background: #555;
}

.ai-success {
  background: #e8f5e9;
  color: #2e7d32;
}

.ai-chat-input-form {
  display: flex;
  padding: 12px;
  border-top: 1px solid #eee;
  gap: 8px;
}

.ai-chat-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.ai-chat-input:focus {
  outline: none;
  border-color: #1976d2;
}

.ai-chat-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.ai-chat-submit {
  padding: 8px 16px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.ai-chat-submit:hover:not(:disabled) {
  background: #1565c0;
}

.ai-chat-submit:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.ai-chat-examples {
  padding: 12px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
  border-radius: 0 0 8px 8px;
  font-size: 12px;
  color: #666;
}

.ai-chat-examples ul {
  margin: 4px 0 0 0;
  padding-left: 20px;
}

.ai-chat-examples li {
  margin: 2px 0;
}
```

#### `/src/App.tsx`
```typescript
// Add import
import AIChat from './components/ai/AIChat';

// Add in return statement (position after canvas, as floating panel)
<AIChat />
```

### UI/UX Considerations
- **Position**: Fixed right sidebar (floats over canvas)
- **Responsive**: Consider mobile view (bottom panel?)
- **Z-index**: Ensure it's above canvas but below modals
- **Auto-clear**: Success messages clear after 3 seconds
- **Focus**: Input stays focused for quick commands
- **Keyboard**: Enter to submit, Shift+Enter for new line (if textarea)

### Testing Checklist
- [ ] Component renders correctly
- [ ] Input field works
- [ ] Submit button works
- [ ] Enter key submits command
- [ ] Loading state shows spinner
- [ ] Error messages display correctly
- [ ] Success messages display and auto-clear
- [ ] Examples section helpful
- [ ] Component positioned correctly
- [ ] Styles match existing app design

---

## PR #5: Integration, E2E Testing & Bug Fixes

**Goal**: Integrate all components, test end-to-end, fix bugs, ensure real-time sync works.

### Files to Update
- Any files with bugs discovered during integration
- `/docs/phase2/ai-development-log.md` - Development log (required for submission)
- This file, under each scenario, log notes (such as bug fixes) from manual testing

### Files to Create
- `/docs/phase2/testing-plan.md` - Testing plan

### Integration Testing Scenarios

#### Scenario 1: Create Rectangle
- User types "Create a blue rectangle in the center"
- AI calls `createRectangle` with viewport center coordinates
- Rectangle appears on canvas for all users
- Verify real-time sync

**Manual Testing Notes:**
- Notes: Works. I did make the default position left of center though. For "Create a blue rectangle".
- Bugs found & fixes applied: N/A

---

#### Scenario 2: Modify Selected Rectangle
- User selects a rectangle (red border)
- User types "Make it green"
- AI calls `changeColor` with selected rectangle ID
- Color changes for all users
- Verify real-time sync

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 3: No Selection Error
- User has no rectangle selected
- User types "Make it bigger"
- AI returns error "Please select a rectangle first"
- Error message displays in UI

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 4: Invalid Color Error
- User types "Create a yellow rectangle"
- AI returns error "Invalid color. Available colors: red, blue, green"
- Error message displays in UI
- No rectangle created

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 5: Move Rectangle
- User selects a rectangle
- User types "Move it to 400, 300"
- AI calls `moveRectangle` with coordinates
- Rectangle moves for all users

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 6: Resize Rectangle
- User selects a rectangle
- User types "Make it 200 by 150"
- AI calls `resizeRectangle` with dimensions
- Rectangle resizes for all users

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 7: Delete Rectangle
- User selects a rectangle
- User types "Delete it"
- AI calls `deleteRectangle`
- Rectangle removed for all users

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 8: Batch Creation
- User types "Create 5 green rectangles"
- AI calls `createMultipleRectangles` with count=5, color=#22c55e
- 5 rectangles appear with offsets at viewport center
- None are auto-selected
- All rectangles sync to other users

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 9: Rate Limit
- User reaches 1000 commands
- User tries another command
- Cloud Function blocks request
- Error message displays: "AI command limit reached"

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 10: Canvas Limit
- Canvas has 1000+ rectangles
- User tries AI command
- Cloud Function blocks request
- Error message displays: "Canvas has too many rectangles"

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 11: Multi-User Concurrent Commands
- User A types "Create a red rectangle"
- User B types "Create a blue rectangle" (simultaneously)
- Both rectangles created
- Both sync to all users

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 12: Viewport Center Accuracy
- User pans canvas to position (1000, 1000)
- User zooms to 2x
- User types "Create a rectangle"
- Rectangle appears at visible viewport center (not 0,0)

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 13: Auto-Selection (Single Rectangle)
- User types "Create a blue rectangle"
- AI creates rectangle
- Rectangle is automatically selected (red border)
- User types "Make it bigger" (no manual selection needed)
- Rectangle resizes successfully

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 14: No Auto-Selection (Multiple Rectangles)
- User types "Create 3 red rectangles"
- AI creates 3 rectangles
- None are selected
- User types "Make it bigger"
- AI returns error "Please select a rectangle first"

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 15: Multi-Step Command (Create + Modify)
- User types "Create a blue rectangle and resize it to 200x200"
- AI returns 2 commands: [createRectangle, resizeRectangle]
- Executor: Creates rectangle → Auto-selects → Resizes
- Final result: 200x200 blue rectangle, selected
- Syncs to all users

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 16: Multi-Step Command (Create + Multiple Modifications)
- User types "Create a red rectangle, move it to 500,500, and make it 150 pixels wide"
- AI returns 3 commands: [createRectangle, moveRectangle, resizeRectangle]
- Executor: Creates → Auto-selects → Moves → Resizes
- All modifications apply to the created rectangle
- Syncs to all users

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 17: Multi-Step Impossible Pattern
- User types "Create 5 rectangles and make them all green"
- AI detects impossible pattern (can't modify multiple)
- AI returns message: "I can only modify rectangles when creating one at a time"
- No commands executed

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 18: Partial Failure (Network Drop)
- User types "Create rectangle and resize to 300x300"
- Rectangle created successfully
- Network drops before resize
- Result: Rectangle exists but not resized (acceptable)
- User can retry resize command

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 19: OpenAI Timeout
- OpenAI API unresponsive or slow
- After 6 seconds, timeout occurs
- Error message: "AI service temporarily unavailable. Please try again."
- User can retry command

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

#### Scenario 20: Atomic Counter Race Condition
- Open 2 browser tabs as same user
- Tab 1: Issue AI command
- Tab 2: Issue AI command simultaneously
- Both succeed, counter increments to 2 (not 1)
- Atomic increment prevents race condition

**Manual Testing Notes:**
- Notes: 
- Bugs found & fixes applied: 

---

### Performance Testing
- [ ] Measure Cloud Function cold start latency
- [ ] Measure Cloud Function warm latency
- [ ] Measure end-to-end command execution time
- [ ] Verify <2 second target for simple commands
- [ ] Test with slow network (throttling)

### Multi-User Testing
- [ ] Test with 2 browsers/users
- [ ] Test with 5+ browsers/users
- [ ] Verify all users see AI changes
- [ ] Verify no conflicts with selections

### Edge Case Testing
- [ ] Invalid colors (e.g., "neon sparkle", "yellow", "purple")
- [ ] Extreme positions (negative, very large numbers)
- [ ] Extreme sizes (0x0, 10000x10000)
- [ ] Empty commands ("")
- [ ] Very long commands (>500 characters)
- [ ] Ambiguous commands (e.g., "do something", "fix it")
- [ ] Commands with typos (e.g., "crete a rectingle")
- [ ] Commands in different languages (should fail gracefully)
- [ ] More than 5 steps in multi-step command
- [ ] Modification without prior creation or selection
- [ ] Delete while another user is editing (race condition)
- [ ] Canvas exactly at 1000 rectangles (boundary test)
- [ ] User exactly at 1000 commands (boundary test)

### Bug Fix Areas to Watch
- Viewport center calculation with pan/zoom (using useRef pattern)
- Viewport info staleness during AI processing
- Firebase RTDB sync timing
- Error message propagation from Cloud Function to UI
- Loading state timing and cancellation
- Command counter atomic increment
- Auto-selection timing (ensure selection happens before next command)
- Multi-step command partial failure handling
- TypeScript interface drift between Cloud Function and client

### Testing Checklist
- [ ] All 6 command types work end-to-end
- [ ] Single rectangle creation auto-selects
- [ ] Multiple rectangle creation does NOT auto-select
- [ ] Multi-step commands work (create + modify)
- [ ] Multi-step impossible patterns rejected gracefully
- [ ] Max 5 steps enforced
- [ ] Partial failure handling works (step 1 succeeds, step 2 fails)
- [ ] Real-time sync verified for all commands
- [ ] Error handling works for all scenarios (20+ scenarios)
- [ ] Rate limiting enforced correctly with atomic increment
- [ ] Canvas limits enforced correctly (1000 rectangle max)
- [ ] Invalid color validation works
- [ ] Color hex codes correct in AI responses
- [ ] Multi-user scenarios work without conflicts
- [ ] Performance targets met (<2s for warm functions, accept cold starts)
- [ ] OpenAI timeout (6 seconds) works correctly
- [ ] Viewport center positioning accurate with pan/zoom
- [ ] Viewport info refresh before AI command
- [ ] Selection context enforced
- [ ] Firebase security rules prevent quota manipulation
- [ ] TypeScript interfaces match between client and Cloud Function
- [ ] UI/UX polished and intuitive
- [ ] All 20 integration scenarios pass

---

## PR #6: Documentation & Cleanup

**Goal**: Document setup, usage, and architecture. Clean up code and prepare for submission.

### Files to Create
- `/docs/phase2/ai-development-log.md` - Complete development log
- `/docs/phase2/setup-guide.md` - Setup instructions for developers
- `/docs/phase2/user-guide.md` - User guide for AI commands
- `/docs/phase2/architecture-diagram.md` - ASCII or text diagram of architecture

### Files to Update
- `/README.md` - Add AI agent section
- `/docs/phase2/ai-agent-mvp-prd.md` - Mark tasks complete
- `/package.json` - Ensure all scripts documented

### Documentation Requirements

#### `/docs/phase2/ai-development-log.md`
Required for submission. Should include:
- **Date entries** for each development session
- **Decisions made** (architectural choices)
- **Problems encountered** (bugs, challenges)
- **Solutions implemented** (how bugs were fixed)
- **Performance metrics** (latency measurements)
- **Testing results** (what worked, what didn't)
- **Lessons learned** (what would you do differently)

#### `/docs/phase2/setup-guide.md`
Step-by-step instructions:
1. Clone repository
2. Install dependencies (`npm install`)
3. Firebase setup
4. Initialize Cloud Functions
5. Install Functions dependencies
6. Set OpenAI API key
7. Deploy Cloud Functions
8. Run locally
9. Test AI commands

#### `/docs/phase2/user-guide.md`
For end users:
- What is the AI agent?
- How to use it (UI walkthrough)
- Example commands for each type
- Selection requirements for modifications
- Common errors and solutions
- Tips and tricks
- Limitations (1000 command limit, etc.)

#### `/README.md` Updates
Add new section:
```markdown
## AI Canvas Agent

This application includes an AI agent that can manipulate the canvas through natural language commands.

### Features
- Create rectangles with specified colors and positions
- Modify selected rectangles (color, size, position)
- Delete rectangles
- Batch creation of multiple rectangles
- Real-time sync across all users

### Usage
1. Open the AI Assistant panel (right side of screen)
2. Type natural language commands
3. Press Enter or click Send

### Example Commands
- "Create a blue rectangle in the center"
- "Make it red" (with selection)
- "Move it to 200, 300"
- "Resize to 150 by 200"
- "Create 5 green rectangles"
- "Delete it"

### Requirements
- Must be logged in (anonymous auth)
- Limit: 1000 commands per user
- Canvas limit: 1000 rectangles max

### Setup (Developers)
See `/docs/phase2/setup-guide.md` for detailed setup instructions.
```

### Code Cleanup
- [ ] Remove console.logs (except intentional ones)
- [ ] Add JSDoc comments to public methods
- [ ] Ensure consistent formatting (Prettier/ESLint)
- [ ] Remove unused imports
- [ ] Remove commented-out code
- [ ] Add TODO comments for post-MVP improvements

### Final Testing
- [ ] Fresh install test (clone, install, run)
- [ ] Deploy to Firebase Hosting
- [ ] Test production deployment
- [ ] Verify all features work in production
- [ ] Check Firebase costs/usage

### Submission Checklist
- [ ] All PRs merged to main
- [ ] All tests passing
- [ ] Documentation complete
- [ ] AI Development Log complete
- [ ] README updated
- [ ] Code cleaned up
- [ ] Production deployment successful
- [ ] Demo video/screenshots (if required)

---

## Summary by PR

| PR # | Title | Files Created | Files Updated | Est. Time |
|------|-------|---------------|---------------|-----------|
| 1 | Firebase Cloud Functions Setup | 9 | 3 | 4-6 hours |
| 2 | Canvas Command Executor Service | 2 | 4 | 6-8 hours |
| 3 | AI Service Client Integration | 3 | 1-2 | 4-6 hours |
| 4 | AI Chat Interface Component | 2-3 | 1-2 | 4-6 hours |
| 5 | Integration & E2E Testing | 2 | 5+ | 8-12 hours |
| 6 | Documentation & Cleanup | 3 | 4 | 4-6 hours |
| **Total** | **6 PRs** | **21-22 files** | **19-20 files** | **30-44 hours** |

---

## Dependencies Between PRs

```
PR #1 (Cloud Functions) ← Foundation
    ↓
PR #2 (Command Executor) ← Can develop in parallel with PR #1
    ↓
PR #3 (AI Service Client) ← Requires PR #1 deployed, PR #2 complete
    ↓
PR #4 (UI Component) ← Requires PR #3
    ↓
PR #5 (Integration Testing) ← Requires all above
    ↓
PR #6 (Documentation) ← Requires PR #5 complete
```

**Note**: PR #1 and PR #2 can be developed in parallel as they don't depend on each other.

---

## Environment Variables & Secrets

### Required Secrets
- `OPENAI_API_KEY` - Set via `firebase functions:config:set openai.key="sk-..."`

### Firebase Configuration
- Project must be on **Blaze plan** (pay-as-you-go)
- Cloud Functions enabled
- Realtime Database enabled (already configured)
- Firebase Hosting enabled (already configured)

### Local Development
```bash
# Start Firebase emulators
firebase emulators:start --only functions,database

# Run Vite dev server
npm run dev
```

---

## Post-Implementation Considerations

After MVP is complete, consider these improvements (from PRD Post-MVP Roadmap):

1. **Upgraded Authentication** - Replace anonymous auth
2. **Enhanced Selection** - Multi-select support
3. **AI Voice Commands** - Speech-to-text
4. **Advanced Commands** - Arrange in grid, align, duplicate
5. **Conversation Context** - Multi-turn conversations
6. **Command History & Undo** - Track and reverse AI actions
7. **Usage Analytics** - Track most-used commands
8. **Smart Defaults** - Learn user preferences

---

*Last Updated: [Date]*
*Branch: ai-spike*
*Status: Planning Phase*


