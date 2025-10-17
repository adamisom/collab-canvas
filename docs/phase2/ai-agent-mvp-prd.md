# AI Canvas Agent - MVP PRD

## Executive Summary

This document outlines the MVP for an AI agent that manipulates a collaborative canvas through natural language commands. Key architectural decisions:

- **AI Provider**: OpenAI GPT-4o via Vercel AI SDK
- **Security**: Firebase Cloud Functions proxy (no client-side API keys)
- **Rate Limiting**: 1000 commands per user (tracked in Firebase RTDB)
- **Canvas Limit**: Maximum 1000 rectangles (prevents context overflow)
- **Positioning**: Viewport center for all created shapes (user sees results immediately)
- **Selection Model**: Modifications require selected rectangle (prevents ambiguity)
- **Real-time Sync**: All AI actions broadcast via existing Firebase RTDB
- **Authentication**: Anonymous auth for MVP (upgrade to proper auth post-MVP)
- **UX**: No special indicators for AI actions (blend with manual operations)

## Existing Application Context

The current application is a real-time collaborative canvas with the following features:

- **Shape Management**: Create rectangles by clicking, change color via color picker, resize at corners/edges, move by dragging
- **Canvas Controls**: Pan and zoom with displayed zoom percentage and position coordinates (format: "0, 0")
- **Collaboration**: Real-time multiplayer cursors with name labels, online user list
- **Technical Stack**:
  - Frontend: Vite.js + React + TypeScript
  - Canvas Library: Konva.js
  - Backend: Firebase (Realtime Database + Anonymous Authentication)
  - Deployment: Firebase Hosting

## MVP AI Agent Requirements

### Core Functionality
The AI agent must manipulate the canvas through natural language using function calling. When a user types a command like "Create a blue rectangle in the center," the AI calls canvas API functions and the results appear on everyone's canvas via real-time sync.

### Required Command Types (6 total)
1. **Create Rectangle**: "Create a blue rectangle in the center"
2. **Change Color**: "Make it red" (requires selection) or "Change the color to green"
3. **Move**: "Move the rectangle to position 200, 300" (requires selection)
4. **Resize**: "Make it 150x200" or "Resize to 100 pixels wide" (requires selection)
5. **Delete**: "Delete the rectangle" or "Remove it" (requires selection)
6. **Batch Create**: "Create 5 red rectangles" or "Make a row of 3 blue rectangles"

### Selection Context Rules
- **Modification commands** (change color, move, resize, delete) require a rectangle to be selected
- Users select rectangles by **clicking** on them (only one at a time)
- **Visual indicators**: Red borders for current user's selection, dashed yellow borders for other users' selections
- AI commands work only with the user's currently selected rectangle
- Multiple users can issue AI commands simultaneously without conflicts (each works with their own selection)

### Error Handling
- **No selection + modification command**: Return error "Please select a rectangle first"
- **Color mismatch**: If user says "change the blue rectangle to red" but has a red rectangle selected, return error "You have a red rectangle selected, not a blue one"
- **Canvas limits**: If canvas has >1000 rectangles, AI commands will fail with error message
- **Partial failures**: For batch operations (e.g., "create 10 rectangles"), partial success is acceptable - keep rectangles that were successfully created

### Shared AI State Requirements
- All users must see the same AI-generated results
- If one user issues an AI command, everyone sees the result
- Multiple users should be able to use the AI simultaneously without conflict

### Performance Targets
- **Latency**: Responses under 2 seconds for single-step commands (including Firebase Cloud Function cold starts)
- **Breadth**: Handles 3+ command types minimum (MVP: 6 command types)
- **Reliability**: Consistent and accurate execution
- **UX**: Natural interaction with visible, immediate feedback

### Cost & Rate Limiting
- **Usage quota**: 1000 AI commands per user (tracked in Firebase RTDB)
- Command count increments with each AI request, regardless of success/failure
- Count tracked at `/users/{userId}/aiCommandCount` in Firebase Realtime Database
- When user reaches 1000 commands, return error and block further AI requests
- *Note*: Authentication will need to be upgraded to properly enforce command rate limiting

### Coordinate System & Positioning
- **Viewport center**: The center of what the user currently sees on screen (changes with pan/zoom)
- **Canvas center**: Fixed point at (0, 0) in canvas coordinate system (may be off-screen)
- **Default positioning**: All new rectangles created at **viewport center** unless position specified
- **"Create in center" commands**: Use viewport center (ensures user sees result immediately)
- **Batch create positioning**: Stack at viewport center with slight offsets to prevent perfect overlap
  - Example: "Create 5 rectangles" → place at viewport center with 20-30px offsets each
- Use `getViewportInfo()` to retrieve current viewport coordinates for positioning calculations

### User Experience Requirements
- **No special visual indicators** for AI-created shapes - they should look identical to manually created shapes
- AI actions should blend seamlessly with manual canvas operations
- Loading states during AI processing (spinner/text)
- Clear, actionable error messages
- No command history UI in MVP (can be added post-MVP)

## Technical Implementation

### API Security & Backend Architecture

**Firebase Cloud Functions as AI Proxy:**
- OpenAI API calls **must not** happen client-side (prevents API key exposure)
- Create Firebase Cloud Function to proxy all AI requests
- Client → Firebase Cloud Function → OpenAI API → Return structured commands → Client executes

**API Key Management:**
- Store OpenAI API key in Firebase Functions environment configuration
- Set via Firebase CLI: `firebase functions:config:set openai.key="sk-..."`
- Access in code: `functions.config().openai.key`
- Alternative: Use Google Cloud Secret Manager for enhanced security

**Cloud Function Implementation:**
```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const processAICommand = functions.https.onCall(async (data, context) => {
  // Enforce authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  // Check usage quota
  const userId = context.auth.uid;
  const commandCount = await checkCommandCount(userId);
  if (commandCount >= 1000) {
    throw new functions.https.HttpsError('resource-exhausted', 'AI command limit reached');
  }
  
  // Check canvas limits
  const { canvasState } = data;
  if (canvasState.rectangles.length >= 1000) {
    throw new functions.https.HttpsError('failed-precondition', 'Canvas has too many rectangles');
  }
  
  // Call OpenAI with tool definitions
  const result = await generateText({
    model: openai('gpt-4o'),
    messages: [{ role: 'user', content: data.userMessage }],
    tools: toolDefinitions,
    system: buildSystemPrompt(data.canvasState, data.viewportInfo, data.selectedShape)
  });
  
  // Increment command count
  await incrementCommandCount(userId);
  
  // Return structured commands for client execution
  return { commands: result.toolCalls };
});
```

**Client Integration:**
```typescript
// Client calls function
const callable = httpsCallable(functions, 'processAICommand');
const result = await callable({
  userMessage: "Create a blue rectangle",
  canvasState: getCanvasState(),
  viewportInfo: getViewportInfo(),
  selectedShape: getCurrentSelection()
});

// Client executes returned commands
executeCommands(result.data.commands);
```

**Requirements:**
- Firebase project must be on **Blaze (pay-as-you-go) plan** for Cloud Functions
- Cold start latency: ~1-2 seconds on first invocation
- Subsequent calls: <500ms function overhead

### AI Model Selection

**Provider**: OpenAI  
**Model**: GPT-4o (optimized for function calling, lower latency than GPT-4)  
**Reasoning**: 
- Best-in-class function calling reliability
- <1 second response time for simple commands
- Works seamlessly with Vercel AI SDK
- Lower cost than GPT-4 Turbo

### Tool Schema Definition
The AI agent will call these canvas API functions:
```typescript
// Core shape operations
createRectangle(x: number, y: number, width: number, height: number, color: string): string // returns shapeId

changeColor(shapeId: string, color: string): void

moveRectangle(shapeId: string, x: number, y: number): void

resizeRectangle(shapeId: string, width: number, height: number): void

deleteRectangle(shapeId: string): void

// Batch operations
createMultipleRectangles(count: number, color: string, layout?: 'row' | 'column' | 'grid', offsetPixels?: number): string[] 
// returns array of shapeIds
// offsetPixels: spacing between rectangles (default: 25px)

// Context retrieval
getCanvasState(): CanvasState // returns current rectangles with their properties (id, x, y, width, height, color)

getViewportInfo(): ViewportInfo // returns viewport center coordinates, zoom level, and visible bounds

getSelectedShape(): SelectedShape | null // returns currently selected shape or null
```

### AI Agent Architecture

**Components:**

1. **Firebase Cloud Function** (`/functions/src/index.ts`)
   - **Callable function**: `processAICommand`
   - Receives user message, canvas state, viewport info, selected shape
   - Validates authentication and enforces rate limits
   - Calls OpenAI via Vercel AI SDK with tool definitions
   - Returns structured tool calls (commands) to client
   - Increments user command counter in Firebase RTDB
   - Does NOT execute canvas operations (client handles that)

2. **AI Service Client** (`/src/services/aiAgent.ts`)
   - Client-side wrapper for Cloud Function calls
   - Gathers context (canvas state, viewport, selection)
   - Calls `processAICommand` Cloud Function
   - Handles function errors and user feedback
   - Passes returned commands to Canvas Command Executor

3. **Canvas Command Executor** (`/src/services/canvasCommandExecutor.ts`)
   - Receives structured commands from AI Service Client
   - Translates commands to Konva.js operations
   - Broadcasts changes to Firebase Realtime Database
   - Handles error states and validation
   - Provides helper functions: `getCanvasState()`, `getViewportInfo()`, `getSelectedShape()`

4. **AI Chat Interface Component** (`/src/components/ai/AIChat.tsx`)
   - Text input for user commands
   - Displays AI responses and execution status
   - Shows loading states during processing (Cloud Function + command execution)
   - Error message display with retry option
   - No special visual indicators for AI-created shapes (blend with manual actions)

5. **Firebase Integration**
   - AI commands broadcast through existing Firebase Realtime Database structure
   - Command results sync to all connected clients via existing real-time listeners
   - Usage quota tracked at `/users/{userId}/aiCommandCount`
   - No command queue needed (existing selection context prevents conflicts)

**Data Flow:**
```
User Input (natural language)
    ↓
AI Chat Component (gather context)
    ↓
AI Service Client (prepare request)
    ↓
Firebase Cloud Function (processAICommand)
    ↓
OpenAI API (via Vercel AI SDK + GPT-4o)
    ↓
Function Calling (AI determines which tools to use)
    ↓
Return Structured Commands (back to client)
    ↓
Canvas Command Executor (executes Konva.js operations)
    ↓
Firebase Realtime Database (broadcast changes)
    ↓
All Connected Clients (receive updates via listeners)
    ↓
Konva.js Canvas (render updates)
```

**State Management:**
- AI command processing state: Local component state (loading, error, success)
- Canvas state: Existing Firebase Realtime Database structure
- Usage quota: Firebase RTDB at `/users/{userId}/aiCommandCount`
- No command queue needed: Selection context prevents conflicts

## AI SDK Options Analysis

### Option 1: Vercel AI SDK

**Pros:**
- **TypeScript-first design** - Perfect fit for your React + TypeScript stack
- **Streaming support** - Can show progressive responses for better UX
- **Framework agnostic** - Works seamlessly with Vite + React
- **Tool calling built-in** - Native support for function calling pattern
- **Provider flexibility** - Can use OpenAI, Anthropic, or other providers
- **Active development** - Regularly updated with latest AI features
- **Excellent documentation** - Clear examples for React integration
- **Lightweight** - Minimal bundle size impact

**Cons:**
- Less mature than OpenAI SDK for pure function calling use cases
- Smaller community compared to OpenAI SDK
- May require learning Vercel-specific patterns

**Best for:** Modern React apps wanting streaming, flexibility, and TypeScript-first experience

---

### Option 2: OpenAI Agent SDK (GPT-4 with Function Calling)

**Pros:**
- **Battle-tested** - Most mature and widely used
- **Excellent function calling** - Robust and reliable tool use
- **Strong documentation** - Extensive examples and community resources
- **Direct API control** - Full control over model parameters
- **Large community** - Easy to find help and examples
- **Proven at scale** - Used in production by thousands of apps

**Cons:**
- **Vendor lock-in** - Tied specifically to OpenAI
- **No streaming tool calls** - Function calling happens in single response
- **More verbose setup** - Requires more boilerplate than Vercel AI SDK
- **Bundle size** - Larger than minimal implementations
- **Cost considerations** - Direct billing, need to manage API keys client-side or proxy

**Best for:** Production apps needing reliability and extensive function calling

---

### Option 3: LangChain

**Pros:**
- **Tool abstraction layer** - Easy to define and manage multiple tools
- **Provider agnostic** - Switch between OpenAI, Anthropic, etc.
- **Structured output** - Built-in parsing and validation
- **Chain composition** - Can build complex multi-step workflows
- **Memory management** - Built-in conversation history handling

**Cons:**
- **Heavy framework** - Significant bundle size overhead
- **Over-engineered for MVP** - Many features you won't use
- **Steeper learning curve** - More concepts to understand
- **TypeScript support** - Less polished than Vercel AI SDK
- **Frequent breaking changes** - Fast-moving API can cause issues
- **Performance overhead** - Additional abstraction layers

**Best for:** Complex multi-agent systems with workflow orchestration needs

---

## Recommendation: **Vercel AI SDK**

**Rationale:**

Given your MVP requirements and existing stack, the Vercel AI SDK is the best choice because:

1. **Perfect Stack Alignment**: Built for Vite + React + TypeScript, integrates naturally with your existing setup
2. **MVP-Appropriate**: Provides exactly what you need without framework overhead
3. **Quick Implementation**: Can get function calling working in under an hour
4. **Future Flexibility**: Easy to switch AI providers (OpenAI, Anthropic, etc.) without rewriting code
5. **Better UX**: Streaming responses allow you to show "AI is thinking..." states naturally
6. **TypeScript Experience**: Type-safe tool definitions and excellent IDE support
7. **Bundle Size**: Won't bloat your Vite build
8. **Modern Patterns**: Uses React hooks and modern async patterns you're already using

**For Your Use Case Specifically:**
- Your 6 command types map cleanly to tool definitions
- Real-time sync works perfectly with streaming updates
- Can easily handle multi-user scenarios with proper queueing
- Straightforward integration with Firebase for command broadcasting

**Sample Implementation Snippet:**
```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const tools = {
  createRectangle: tool({
    description: 'Create a rectangle on the canvas',
    parameters: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      color: z.string()
    }),
    execute: async ({ x, y, width, height, color }) => {
      return canvasCommandExecutor.createRectangle(x, y, width, height, color);
    }
  })
  // ... other tools
};
```

LangChain is overkill for your MVP. OpenAI SDK is solid but gives you less flexibility and worse TypeScript experience. Vercel AI SDK hits the sweet spot.

## Implementation Plan

For detailed task breakdown organized by Pull Requests with specific file changes, see **[tasks.md](./tasks.md)**.

The implementation is organized into 6 PRs:
1. **Firebase Cloud Functions Setup** - Infrastructure and OpenAI integration
2. **Canvas Command Executor Service** - Client-side command execution
3. **AI Service Client Integration** - Cloud Function wrapper and command orchestration
4. **AI Chat Interface Component** - User interface for AI commands
5. **Integration & E2E Testing** - Full integration testing and bug fixes
6. **Documentation & Cleanup** - Complete documentation and code cleanup

## Success Criteria

**Functional:**
- ✅ All 6 command types work reliably
- ✅ AI-created shapes sync to all users in real-time
- ✅ Multiple users can use AI simultaneously
- ✅ Natural language parsing handles varied phrasings

**Performance:**
- ✅ Single-step commands execute in <2 seconds
- ✅ No noticeable lag in real-time sync
- ✅ UI remains responsive during AI processing

**User Experience:**
- ✅ Clear feedback during command processing
- ✅ Error messages are helpful and actionable
- ✅ Commands feel natural and intuitive
- ✅ AI correctly interprets user intent

**Security & Limits:**
- ✅ API keys secure (not exposed client-side)
- ✅ Rate limiting enforced (1000 commands per user)
- ✅ Canvas limits enforced (max 1000 rectangles)

## Post-MVP Roadmap

The following enhancements should be considered after MVP completion, in this order:

1. **Upgraded Authentication**
   - Replace anonymous auth with email/Google/GitHub login
   - Prevents rate limit bypass via cookie clearing
   - Enables per-account usage tracking and billing
   - Required for widespread use

2. **Enhanced Selection**
   - Multi-select support for batch modifications
   - "Select all blue rectangles" AI command
   - Visual AI selection indicators
   
3. **AI Voice Commands**
   - Speech-to-text input
   - Hands-free canvas manipulation

4. **Advanced Commands**
   - "Arrange rectangles in a grid"
   - "Align all selected rectangles"
   - "Duplicate the rectangle 3 times"
   - "Change all blue rectangles to red"

5. **Conversation Context**
   - Multi-turn conversations with AI
   - "Make it bigger" followed by "now move it right"
   - Remember previous commands in session

6. **Command History & Undo**
   - Store AI command history in Firebase
   - Allow users to review past commands
   - Implement undo/redo for AI actions
   - Show "AI created this" timestamps

7. **Usage Analytics**
   - Track most-used commands
   - Monitor AI accuracy and errors
   - Cost tracking per user

8. **Smart Defaults**
   - Learn user preferences (default colors, sizes)
   - Context-aware suggestions
   - "Create another one" (duplicates last creation)