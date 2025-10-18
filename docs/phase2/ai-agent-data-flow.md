# AI Agent Data Flow - Integration Testing Reference

## Overview
This document provides a comprehensive reference for debugging and testing the AI agent feature. It traces the complete data flow from user input to canvas updates.

---

## Architecture Components

### 1. **Client-Side Components**
- **`AIChat.tsx`**: UI component for user input
- **`useAIAgent.ts`**: React hook wrapping `AIAgent` service
- **`aiAgent.ts`**: Main orchestration service
- **`canvasCommandExecutor.ts`**: Command execution and validation
- **`aiErrors.ts`**: Error mapping and classification

### 2. **Server-Side Components**
- **`functions/src/index.ts`**: Cloud Function entry point
- **`functions/src/tools.ts`**: Zod schemas for 6 AI tools
- **`functions/src/utils/systemPrompt.ts`**: Context builder for OpenAI
- **`functions/src/utils/rateLimiter.ts`**: Usage quota enforcement

### 3. **Shared Types**
- **`src/shared/types.ts`**: Type definitions used by both client and server
- Ensures type safety across the network boundary

---

## Complete Data Flow

### Phase 1: User Input → Cloud Function Call

```
User types message in AIChat
    ↓
AIChat.handleSubmit() 
    ↓
useAIAgent.processCommand()
    ↓
AIAgent.processCommand()
    ↓
1. captureSnapshot() - Creates immutable snapshot:
   - canvasState: All rectangles (id, x, y, width, height, color)
   - viewportInfo: Center, zoom, visible bounds
   - selectedShapeId: Currently selected rectangle ID (or null)
    ↓
2. setSelectionLocked(true) - Prevents user interaction during processing
    ↓
3. callCloudFunction() - Sends to Firebase:
   {
     userMessage: "create a blue rectangle",
     canvasState: { rectangles: [...] },
     viewportInfo: { centerX, centerY, zoom, visibleBounds },
     selectedShape: { id, color, x, y, width, height } | null
   }
```

### Phase 2: Cloud Function Processing

```
processAICommand Cloud Function receives request
    ↓
1. Authentication check (request.auth.uid)
    ↓
2. Rate limiting check (checkCommandQuota)
    ↓
3. Canvas limit check (max 1000 rectangles)
    ↓
4. buildSystemPrompt() - Constructs prompt with:
   - Available colors (hex codes)
   - Viewport center coordinates
   - Selected shape context (if any)
   - Tool parameter requirements
   - Multi-step command rules
    ↓
5. Call OpenAI API (generateText):
   - Model: gpt-4o
   - Tools: 6 canvas manipulation tools
   - System prompt: Context + rules
   - User message: Natural language command
   - Timeout: 6 seconds
    ↓
6. OpenAI returns tool calls:
   [
     {
       toolName: "createRectangle",
       args: { x: 100, y: 100, width: 150, height: 150, color: "#3b82f6" }
       // OR input: {...} for invalid/dynamic calls
     }
   ]
    ↓
7. Extract parameters (check both 'args' and 'input' properties)
    ↓
8. Increment usage counter (incrementCommandCount)
    ↓
9. Return to client:
   {
     commands: [
       { tool: "createRectangle", parameters: {...} }
     ],
     message: "Created a blue rectangle" (optional)
   }
```

### Phase 3: Client-Side Command Execution

```
AIAgent receives ProcessAICommandResponse
    ↓
executeCommands() - Sequential execution:
    ↓
For each command:
    ↓
1. Log command: "🔧 Executing command 1/2: createRectangle {...}"
    ↓
2. Route to executor method based on tool name:
   - createRectangle → executeCreateRectangle()
   - changeColor → executeChangeColor()
   - moveRectangle → executeMoveRectangle()
   - resizeRectangle → executeResizeRectangle()
   - deleteRectangle → executeDeleteRectangle()
   - createMultipleRectangles → executeCreateMultipleRectangles()
    ↓
3. Executor validates parameters:
   - Color validation (must be #ef4444, #3b82f6, or #22c55e)
   - Dimension clamping (20-3000 pixels)
   - Position clamping (0-3000 coordinates)
   - Rectangle existence (for modification commands)
    ↓
4. Executor delegates to CanvasContext methods:
   - createRectangle(x, y)
   - updateRectangle(id, updates)
   - resizeRectangle(id, width, height)
   - deleteRectangle(id)
   - changeRectangleColor(id, color)
   - selectRectangle(id)
    ↓
5. CanvasContext calls CanvasService (Firebase writes)
    ↓
6. Firebase Realtime Database updates
    ↓
7. Firebase listeners trigger re-render
    ↓
8. Canvas updates visually
```

### Phase 4: Cleanup & Error Handling

```
After all commands execute (or error occurs):
    ↓
1. setSelectionLocked(false) - Re-enable user interaction
    ↓
2. Return result to UI:
   - Success: { success: true, message: "..." }
   - Error: { success: false, error: { message, retryable } }
    ↓
3. AIChat displays result (success message or error toast)
```

---

## Critical Data Structures

### CommandSnapshot (Immutable)
```typescript
{
  canvasState: {
    rectangles: [
      { id: "-ABC123", x: 100, y: 100, width: 150, height: 100, color: "#3b82f6" }
    ]
  },
  viewportInfo: {
    centerX: 400,
    centerY: 300,
    zoom: 1.0,
    visibleBounds: { left: 0, top: 0, right: 800, bottom: 600 }
  },
  selectedShapeId: "-ABC123" | null
}
```

### AICommand
```typescript
{
  tool: "createRectangle" | "changeColor" | "moveRectangle" | "resizeRectangle" | "deleteRectangle" | "createMultipleRectangles",
  parameters: {
    // Varies by tool - see shared/types.ts for each tool's params
  }
}
```

---

## Multi-Step Command Flow

### Example: "Create a green rectangle and make it 300 pixels wide"

```
1. OpenAI returns 2 tool calls:
   [
     { tool: "createRectangle", parameters: { color: "#22c55e" } },
     { tool: "resizeRectangle", parameters: { width: 300 } }
   ]

2. executeCommands() processes sequentially:
   
   Step 1: executeCreateRectangle()
     → Creates rectangle at viewport center
     → Returns createdRectangleId: "-XYZ789"
     → Auto-selected by CanvasContext.createRectangle()
   
   Step 2: executeResizeRectangle(params, createdRectangleId)
     → Uses createdRectangleId instead of selectedRectangleId
     → Skips rectangleExists() check (avoids race condition)
     → Resizes to width: 300, height: (current or default)
     → Updates via CanvasContext.resizeRectangle()

3. Success message: "Command executed successfully"
```

### Why `createdRectangleId` is Critical
- **Problem**: Firebase updates are asynchronous. After creating a rectangle, it may not yet exist in `context.rectangles` array when the next command executes.
- **Solution**: Pass `createdRectangleId` to subsequent commands, which:
  1. Use it instead of `selectedRectangleId`
  2. Skip the `rectangleExists()` validation check
  3. Proceed directly to Firebase update

---

## Error Handling Strategy

### Error Classification
1. **Retryable Errors** (`retryable: true`):
   - Network errors
   - Timeout errors (deadline-exceeded)
   - Service unavailable (unavailable, aborted, internal)
   - Viewport not ready

2. **Non-Retryable Errors** (`retryable: false`):
   - Authentication errors
   - Rate limit exceeded
   - Canvas limit exceeded (1000 rectangles)
   - Invalid color
   - Rectangle not found
   - Invalid parameters

### Partial Success Handling
```typescript
// If command 3 of 5 fails:
"Completed 2 of 5 steps. Error: Invalid color: #ffffff"

// If command 1 fails:
"Invalid color: #ffffff" (no partial success message)
```

---

## Common Integration Testing Scenarios

### 1. **Single Rectangle Creation**
- **Input**: "Create a blue rectangle"
- **Expected Flow**:
  - 1 tool call: `createRectangle`
  - Parameters: `{ color: "#3b82f6" }`
  - Defaults: x/y = viewport center, width = 100, height = 80
  - Auto-selected after creation

### 2. **Multi-Step Command**
- **Input**: "Create a red rectangle and make it 200 pixels wide"
- **Expected Flow**:
  - 2 tool calls: `createRectangle`, `resizeRectangle`
  - `createdRectangleId` passed to second command
  - No race condition errors

### 3. **Modification Without Selection**
- **Input**: "Make it bigger" (no rectangle selected)
- **Expected Response**: "Please select a rectangle first"
- **No tool calls executed**

### 4. **Invalid Color**
- **Input**: "Create a purple rectangle"
- **Expected Response**: "Invalid color. Available colors: red, blue, green"
- **No tool calls executed**

### 5. **Batch Creation**
- **Input**: "Create 5 green rectangles in a row"
- **Expected Flow**:
  - 1 tool call: `createMultipleRectangles`
  - Parameters: `{ count: 5, color: "#22c55e", layout: "row" }`
  - 5 rectangles created with automatic spacing

### 6. **Modification of Selected Rectangle**
- **Input**: "Change it to red" (rectangle already selected)
- **Expected Flow**:
  - 1 tool call: `changeColor`
  - Parameters: `{ shapeId: "<selected-id>", color: "#ef4444" }`
  - System prompt includes selected rectangle context

---

## Key Debugging Points

### Client-Side Logs
```javascript
// In aiAgent.ts:
console.log('🤖 AI Commands received:', JSON.stringify(commands, null, 2))
console.log(`🔧 Executing command ${i + 1}/${commands.length}:`, command.tool, command.parameters)

// Look for:
// - Empty parameters: {} (indicates parameter extraction failure)
// - Missing color in createRectangle
// - Missing shapeId in modification commands
```

### Server-Side Logs (Cloud Functions)
```javascript
// In functions/src/index.ts:
console.log('🔍 OpenAI returned tool calls:', JSON.stringify(toolCalls, null, 2))
console.log(`📦 Extracting params for ${call.toolName}:`, JSON.stringify(params))
console.log('📤 Sending to client:', JSON.stringify(response, null, 2))

// Look for:
// - 'args' vs 'input' property usage
// - 'invalid: true' in tool calls (Zod validation failure)
// - Missing required parameters
```

### Debugging Tips for Integration Testing

**When debugging any issue:**
1. Check client logs first: Look for `🤖 AI Commands received` and `🔧 Executing command` in browser console
2. Check server logs: Look for `🔍 OpenAI returned tool calls` and `📦 Extracting params` in Cloud Functions logs
3. Verify parameters aren't empty `{}`
4. Check if error is retryable (network/timeout) vs non-retryable (validation/auth)

**For creation issues (Scenarios 1, 8, 13, 14, 15, 16):**
- Verify `color` parameter is hex code, not color name
- Check if `x`/`y` default to viewport center when not provided
- Confirm auto-selection only happens for single rectangle creation (not batch)

**For modification issues (Scenarios 2, 5, 6, 7):**
- Verify `selectedShape` context is in system prompt with correct `shapeId`
- Check if `shapeId` is being extracted from parameters (both `args` and `input`)
- Confirm fallback to `selectedRectangleId` works when `shapeId` not provided

**For multi-step issues (Scenarios 15, 16):**
- Verify `createdRectangleId` is passed to subsequent commands
- Check that `rectangleExists()` validation is skipped when using `createdRectangleId`
- Confirm commands execute sequentially, not in parallel

**For error handling (Scenarios 3, 4, 9, 10, 17, 18, 19):**
- Check if AI returns explanation message instead of tool calls
- Verify error classification (retryable vs non-retryable) is correct
- Confirm partial success messages show correct step count

**For real-time sync (Scenarios 1, 2, 5, 6, 7, 8, 11):**
- Verify Firebase listeners are active
- Check if updates appear in all connected clients
- Confirm no race conditions with concurrent commands

**For viewport/selection (Scenarios 12, 13):**
- Check `getViewportInfo()` returns correct center based on pan/zoom
- Verify selection state is captured in snapshot before Cloud Function call
- Confirm selection lock prevents user interaction during processing

---

## File Reference Map

### Types & Interfaces
- `src/shared/types.ts` - All shared types

### Client Services
- `src/services/aiAgent.ts` - Main orchestration (159 lines)
- `src/services/canvasCommandExecutor.ts` - Command execution (360 lines)
- `src/utils/aiErrors.ts` - Error handling (170 lines)

### Server Functions
- `functions/src/index.ts` - Cloud Function entry (167 lines)
- `functions/src/tools.ts` - Tool definitions (99 lines)
- `functions/src/utils/systemPrompt.ts` - Prompt builder (75 lines)

### React Components
- `src/components/canvas/AIChat.tsx` - UI
- `src/hooks/useAIAgent.ts` - React hook

### Tests
- `tests/utils/aiErrors.test.ts` - Error mapping tests
- `tests/services/canvasCommandExecutor.test.ts` - Executor tests
- `tests/services/aiAgent.test.ts` - Agent tests
- `tests/fixtures/aiAgent.fixtures.ts` - Test data

---

## Ready for Integration Testing! 🚀

This document should help you quickly identify where issues are occurring in the data flow and what to check at each stage.

