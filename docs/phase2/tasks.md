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
- Check user command quota at `/users/{userId}/aiCommandCount`
- Check canvas rectangle limit (1000 max)
- Call OpenAI GPT-4o via Vercel AI SDK
- Increment command counter
- Return structured tool calls to client
- Handle errors with proper HttpsError codes

#### `/functions/src/tools.ts`
Define 6 Zod tool schemas:
1. `createRectangle` - x, y, width, height, color
2. `changeColor` - shapeId, color
3. `moveRectangle` - shapeId, x, y
4. `resizeRectangle` - shapeId, width, height
5. `deleteRectangle` - shapeId
6. `createMultipleRectangles` - count, color, layout, offsetPixels

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
```

### Testing Checklist
- [ ] Cloud Function deploys successfully
- [ ] Function enforces authentication
- [ ] Function checks command quota (blocks at 1000)
- [ ] Function checks canvas limits (blocks at 1000 rectangles)
- [ ] Function calls OpenAI and returns tool calls
- [ ] Function increments command counter
- [ ] Error handling works (auth, quota, limits)

---

## PR #2: Canvas Command Executor Service

**Goal**: Create client-side service to execute canvas commands and provide context to AI.

### Files to Create
- `/src/services/canvasCommandExecutor.ts` - All canvas command execution logic
- `/src/types/ai.ts` - TypeScript interfaces for AI commands

### Files to Update
- `/src/services/canvasService.ts` - May need minor updates for new operations
- `/src/contexts/CanvasContext.tsx` - Expose additional helper methods
- `/src/components/canvas/Canvas.tsx` - Expose viewport info methods

### Implementation Details

#### `/src/services/canvasCommandExecutor.ts`
Create service class with methods:

**Context Gathering Methods:**
- `getCanvasState(): CanvasState`
  - Returns all rectangles from CanvasContext
  - Maps to simplified format for AI
  
- `getViewportInfo(): ViewportInfo`
  - Access Canvas component's stage ref
  - Calculate viewport center from stage position and zoom
  - Return zoom level and visible bounds
  - Formula: centerX = -stageX / zoom + viewportWidth / (2 * zoom)
  
- `getSelectedShape(): SelectedShape | null`
  - Returns currently selected rectangle from CanvasContext
  - Returns null if no selection

**Command Execution Methods:**
- `createRectangle(x: number, y: number, width: number, height: number, color: string): Promise<string>`
  - Call CanvasContext.createRectangle()
  - Use default width/height if not specified (100x100)
  - Validate color against RECTANGLE_COLORS
  - Return created rectangle ID
  
- `changeColor(shapeId: string, color: string): Promise<void>`
  - Validate shapeId exists
  - Call CanvasContext.changeRectangleColor()
  - Validate color
  
- `moveRectangle(shapeId: string, x: number, y: number): Promise<void>`
  - Call CanvasContext.updateRectangle() with new position
  - Keep within canvas bounds
  
- `resizeRectangle(shapeId: string, width: number, height: number): Promise<void>`
  - Call CanvasContext.resizeRectangle()
  - Apply min/max constraints
  
- `deleteRectangle(shapeId: string): Promise<void>`
  - Call CanvasContext.deleteRectangle()
  
- `createMultipleRectangles(count: number, color: string, layout?: 'row' | 'column' | 'grid', offsetPixels: number = 25): Promise<string[]>`
  - Get viewport center
  - Loop and create rectangles with offsets
  - For 'row': increment X by (width + offsetPixels)
  - For 'column': increment Y by (height + offsetPixels)
  - For 'grid' or default: diagonal offset
  - Return array of created IDs

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

#### `/src/contexts/CanvasContext.tsx`
- Add `getAllRectangles(): Rectangle[]` method to context
- Ensure it's accessible to command executor

#### `/src/components/canvas/Canvas.tsx`
- Create `getViewportInfo()` method that accesses stage ref
- Export or make accessible to command executor
- Consider using React ref forwarding or context

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

export class AIAgent {
  private functions: Functions;
  
  constructor() {
    this.functions = getFunctions();
  }
  
  async processCommand(userMessage: string): Promise<{
    success: boolean;
    message: string;
    commandsExecuted: number;
  }> {
    try {
      // Gather context
      const canvasState = canvasCommandExecutor.getCanvasState();
      const viewportInfo = canvasCommandExecutor.getViewportInfo();
      const selectedShape = canvasCommandExecutor.getSelectedShape();
      
      // Call Cloud Function
      const processAICommand = httpsCallable(this.functions, 'processAICommand');
      const result = await processAICommand({
        userMessage,
        canvasState,
        viewportInfo,
        selectedShape
      });
      
      const { commands } = result.data as { commands: AICommand[] };
      
      // Execute commands
      let executedCount = 0;
      for (const command of commands) {
        await this.executeCommand(command);
        executedCount++;
      }
      
      return {
        success: true,
        message: `Successfully executed ${executedCount} command(s)`,
        commandsExecuted: executedCount
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: mapAIError(error),
        commandsExecuted: 0
      };
    }
  }
  
  private async executeCommand(command: AICommand): Promise<void> {
    const { tool, parameters } = command;
    
    switch (tool) {
      case 'createRectangle':
        await canvasCommandExecutor.createRectangle(
          parameters.x,
          parameters.y,
          parameters.width,
          parameters.height,
          parameters.color
        );
        break;
      case 'changeColor':
        await canvasCommandExecutor.changeColor(
          parameters.shapeId,
          parameters.color
        );
        break;
      case 'moveRectangle':
        await canvasCommandExecutor.moveRectangle(
          parameters.shapeId,
          parameters.x,
          parameters.y
        );
        break;
      case 'resizeRectangle':
        await canvasCommandExecutor.resizeRectangle(
          parameters.shapeId,
          parameters.width,
          parameters.height
        );
        break;
      case 'deleteRectangle':
        await canvasCommandExecutor.deleteRectangle(parameters.shapeId);
        break;
      case 'createMultipleRectangles':
        await canvasCommandExecutor.createMultipleRectangles(
          parameters.count,
          parameters.color,
          parameters.layout,
          parameters.offsetPixels
        );
        break;
      default:
        throw new Error(`Unknown command: ${tool}`);
    }
  }
}

export const aiAgent = new AIAgent();
```

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
export const mapAIError = (error: any): string => {
  // Firebase Functions error codes
  if (error.code) {
    switch (error.code) {
      case 'unauthenticated':
        return 'You must be logged in to use AI commands';
      case 'resource-exhausted':
        return 'AI command limit reached (1000 commands per user)';
      case 'failed-precondition':
        if (error.message.includes('rectangles')) {
          return 'Canvas has too many rectangles (limit: 1000)';
        }
        return error.message;
      case 'invalid-argument':
        return `Invalid command: ${error.message}`;
      default:
        return error.message || 'An error occurred';
    }
  }
  
  // Network errors
  if (error.message?.includes('network')) {
    return 'Network error. Please check your connection.';
  }
  
  return error.message || 'An unexpected error occurred';
};
```

#### `/src/config/firebase.ts`
```typescript
// Add exports for Cloud Functions
import { getFunctions } from 'firebase/functions';

export const functions = getFunctions(app);
```

### Testing Checklist
- [ ] `aiAgent.processCommand()` calls Cloud Function
- [ ] Command context gathering works
- [ ] All 6 command types execute correctly
- [ ] Error handling works for all error types
- [ ] Error messages are user-friendly
- [ ] Loading states work
- [ ] Success messages display
- [ ] Multiple commands execute in sequence

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
  const inputRef = useRef<HTMLInputElement>(null);
  const { processCommand, loading, error, successMessage, clearMessages } = useAIAgent();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || loading) return;
    
    const command = inputValue.trim();
    setInputValue(''); // Clear immediately for better UX
    
    await processCommand(command);
    
    // Auto-clear success messages after 3 seconds
    if (successMessage) {
      setTimeout(clearMessages, 3000);
    }
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
- `/src/services/canvasCommandExecutor.ts` - Bug fixes
- `/src/services/aiAgent.ts` - Bug fixes
- `/src/components/ai/AIChat.tsx` - UX improvements
- `/functions/src/index.ts` - Function improvements

### Files to Create
- `/docs/phase2/ai-development-log.md` - Development log (required for submission)
- `/docs/phase2/testing-notes.md` - Testing results and findings

### Integration Testing Scenarios

#### Scenario 1: Create Rectangle
- User types "Create a blue rectangle in the center"
- AI calls `createRectangle` with viewport center coordinates
- Rectangle appears on canvas for all users
- Verify real-time sync

#### Scenario 2: Modify Selected Rectangle
- User selects a rectangle (red border)
- User types "Make it green"
- AI calls `changeColor` with selected rectangle ID
- Color changes for all users
- Verify real-time sync

#### Scenario 3: No Selection Error
- User has no rectangle selected
- User types "Make it bigger"
- AI returns error "Please select a rectangle first"
- Error message displays in UI

#### Scenario 4: Color Mismatch Error
- User selects a red rectangle
- User types "Change the blue rectangle to green"
- AI returns error "You have a red rectangle selected, not a blue one"
- Error message displays in UI

#### Scenario 5: Batch Creation
- User types "Create 5 yellow rectangles"
- AI calls `createMultipleRectangles` with count=5, color=yellow
- 5 rectangles appear with offsets at viewport center
- All rectangles sync to other users

#### Scenario 6: Move Rectangle
- User selects a rectangle
- User types "Move it to 400, 300"
- AI calls `moveRectangle` with coordinates
- Rectangle moves for all users

#### Scenario 7: Resize Rectangle
- User selects a rectangle
- User types "Make it 200 by 150"
- AI calls `resizeRectangle` with dimensions
- Rectangle resizes for all users

#### Scenario 8: Delete Rectangle
- User selects a rectangle
- User types "Delete it"
- AI calls `deleteRectangle`
- Rectangle removed for all users

#### Scenario 9: Rate Limit
- User reaches 1000 commands
- User tries another command
- Cloud Function blocks request
- Error message displays: "AI command limit reached"

#### Scenario 10: Canvas Limit
- Canvas has 1000+ rectangles
- User tries AI command
- Cloud Function blocks request
- Error message displays: "Canvas has too many rectangles"

#### Scenario 11: Multi-User Concurrent Commands
- User A types "Create a red rectangle"
- User B types "Create a blue rectangle" (simultaneously)
- Both rectangles created
- Both sync to all users

#### Scenario 12: Viewport Center Accuracy
- User pans canvas to position (1000, 1000)
- User zooms to 2x
- User types "Create a rectangle"
- Rectangle appears at visible viewport center (not 0,0)

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
- [ ] Invalid colors (e.g., "neon sparkle")
- [ ] Extreme positions (negative, very large)
- [ ] Extreme sizes (0x0, 10000x10000)
- [ ] Empty commands
- [ ] Very long commands (>500 characters)
- [ ] Ambiguous commands (e.g., "do something")
- [ ] Commands with typos

### Bug Fix Areas to Watch
- Viewport center calculation with pan/zoom
- Command executor accessing Canvas stage ref
- Firebase RTDB sync timing
- Error message propagation
- Loading state timing
- Command counter race conditions

### Testing Checklist
- [ ] All 6 command types work end-to-end
- [ ] Real-time sync verified for all commands
- [ ] Error handling works for all scenarios
- [ ] Rate limiting enforced correctly
- [ ] Canvas limits enforced correctly
- [ ] Multi-user scenarios work
- [ ] Performance targets met (<2s)
- [ ] Viewport center positioning accurate
- [ ] Selection context enforced
- [ ] UI/UX polished and intuitive

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
| 1 | Firebase Cloud Functions Setup | 8 | 3 | 4-6 hours |
| 2 | Canvas Command Executor Service | 2 | 3 | 6-8 hours |
| 3 | AI Service Client Integration | 3 | 2 | 4-6 hours |
| 4 | AI Chat Interface Component | 2 | 2 | 4-6 hours |
| 5 | Integration & E2E Testing | 1-2 | 5+ | 8-12 hours |
| 6 | Documentation & Cleanup | 4 | 3 | 4-6 hours |
| **Total** | **6 PRs** | **20+ files** | **18+ files** | **30-44 hours** |

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

