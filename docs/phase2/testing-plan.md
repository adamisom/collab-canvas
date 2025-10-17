# AI Agent Testing Plan

## Overview
This document identifies critical tests for the AI Canvas Agent MVP to ensure reliability before production deployment.

---

## Priority 1: Critical Business Logic (Must Have)

### 1. **Canvas Command Executor Tests** (`tests/services/canvasCommandExecutor.test.ts`)

**Why Critical:** This is the core execution engine. Bugs here affect ALL AI commands.

```typescript
describe('CanvasCommandExecutor', () => {
  describe('Parameter Validation & Clamping', () => {
    it('should clamp x coordinate to canvas bounds (0-3000)')
    it('should clamp y coordinate to canvas bounds (0-3000)')
    it('should clamp width to valid range (20-3000)')
    it('should clamp height to valid range (20-3000)')
    it('should throw error for invalid colors (not in VALID_AI_COLORS)')
    it('should accept valid colors (#ef4444, #3b82f6, #22c55e)')
  })

  describe('Rectangle Existence Checks', () => {
    it('should throw error when modifying non-existent rectangle')
    it('should throw error when resizing deleted rectangle')
    it('should throw error when moving deleted rectangle')
    it('should allow operations on existing rectangles')
  })

  describe('Batch Creation Layouts', () => {
    it('should calculate correct positions for row layout (5 rectangles)')
    it('should calculate correct positions for column layout (5 rectangles)')
    it('should calculate correct positions for grid layout (9 rectangles)')
    it('should respect offsetPixels parameter (10-100 range)')
    it('should enforce maximum batch count (50)')
  })

  describe('Context Delegation', () => {
    it('should call CanvasContext.createRectangle (never Firebase directly)')
    it('should call CanvasContext.updateRectangle (never Firebase directly)')
    it('should call CanvasContext.deleteRectangle (never Firebase directly)')
  })

  describe('Auto-Selection Support', () => {
    it('should use createdRectangleId for subsequent modifications')
    it('should throw error if createdRectangleId becomes invalid')
  })
})
```

**Risk if Not Tested:**
- Out-of-bounds rectangles created (crashes Konva or hidden off-canvas)
- Invalid colors crash Firebase writes
- Deleted rectangles cause errors when AI tries to modify them
- Batch layouts miscalculated (overlapping or off-screen)

---

### 2. **AI Error Mapping Tests** (`tests/utils/aiErrors.test.ts`)

**Why Critical:** Wrong error classification = wrong UI buttons = broken UX.

```typescript
describe('mapAIError', () => {
  describe('Firebase HttpsError Codes', () => {
    it('should map "unauthenticated" to non-retryable with correct message')
    it('should map "resource-exhausted" to non-retryable (quota exceeded)')
    it('should map "deadline-exceeded" to retryable (timeout)')
    it('should map "failed-precondition" to non-retryable (too many rectangles)')
    it('should map "internal" to retryable')
    it('should map "unavailable" to retryable')
  })

  describe('Executor Errors', () => {
    it('should map "not found" errors to non-retryable')
    it('should map "invalid color" errors to non-retryable')
    it('should map "viewport info not available" to retryable')
  })

  describe('Network Errors', () => {
    it('should map NetworkError to retryable')
    it('should map generic network errors to retryable')
  })

  describe('Unknown Errors', () => {
    it('should default unknown errors to retryable (safety)')
  })
})

describe('formatPartialSuccessMessage', () => {
  it('should show success count (e.g. "Completed 3 of 5 steps")')
  it('should show just error if no steps succeeded')
  it('should include error message in partial success')
})
```

**Risk if Not Tested:**
- Retryable errors show "OK" button (user can't retry)
- Non-retryable errors show "Retry" button (retrying won't help)
- Confusing error messages shown to users

---

### 3. **AI Agent Service Tests** (`tests/services/aiAgent.test.ts`)

**Why Critical:** Orchestrates entire flow. Bugs affect all AI functionality.

```typescript
describe('AIAgent', () => {
  describe('Snapshot Capture', () => {
    it('should capture canvas state at submission time (not live)')
    it('should capture viewport info at submission time')
    it('should capture selected shape ID at submission time')
    it('should return error if viewport info is null')
  })

  describe('Selection Locking', () => {
    it('should lock selection before Cloud Function call')
    it('should unlock selection after successful execution')
    it('should unlock selection after error (finally block)')
    it('should unlock selection even if Cloud Function throws')
  })

  describe('Command Execution Flow', () => {
    it('should execute commands sequentially (not parallel)')
    it('should stop at first error (partial execution)')
    it('should report partial success (e.g. 3/5 succeeded)')
    it('should preserve original selection during execution')
  })

  describe('First Command Auto-Selection', () => {
    it('should auto-select if first command is createRectangle')
    it('should use created ID for subsequent modifications')
    it('should not auto-select for createMultipleRectangles')
    it('should handle created rectangle being deleted mid-execution')
  })

  describe('Error Handling', () => {
    it('should catch Cloud Function errors and map them')
    it('should catch executor errors and map them')
    it('should always return AIAgentResult (never throw)')
  })
})
```

**Risk if Not Tested:**
- Race conditions when user changes selection during AI processing
- Selection never unlocks (UI permanently disabled)
- Multi-step commands fail silently
- Memory leaks from uncaught errors

---

## Priority 2: User-Facing Logic (Should Have)

### 4. **useAIAgent Hook Tests** (`tests/hooks/useAIAgent.test.ts`)

**Why Important:** React hook state management is error-prone.

```typescript
describe('useAIAgent', () => {
  it('should set isProcessing=true during execution')
  it('should set isProcessing=false after completion')
  it('should set isProcessing=false after error')
  it('should update lastResult with success')
  it('should update lastResult with error')
  it('should clear lastResult on clearResult()')
  it('should reject empty input with validation error')
  it('should memoize AIAgent instance (not recreate on every render)')
})
```

**Risk if Not Tested:**
- Loading spinner never stops
- Multiple AI agent instances created (memory leak)
- Empty commands sent to backend (wasted API calls)

---

### 5. **AIChat Component Tests** (`tests/components/ai/AIChat.test.tsx`)

**Why Important:** User interface directly visible to users.

```typescript
describe('AIChat', () => {
  describe('Rendering States', () => {
    it('should render input form with hint text')
    it('should show loading state during processing')
    it('should show success message with OK button')
    it('should show error message with Retry+Cancel for retryable')
    it('should show error message with OK only for non-retryable')
  })

  describe('User Interactions', () => {
    it('should disable input and submit during processing')
    it('should clear input after submission')
    it('should preserve last command for retry')
    it('should call processCommand on form submit')
    it('should call processCommand again on retry')
    it('should clear result on OK/Cancel click')
  })

  describe('Focus Management', () => {
    it('should auto-focus input on mount')
    it('should auto-focus input after clearing result')
  })

  describe('Validation', () => {
    it('should disable submit button for empty input')
    it('should disable submit button during processing')
  })
})
```

**Risk if Not Tested:**
- Buttons don't work (user stuck)
- Input never clears (confusing UX)
- Focus lost (poor keyboard navigation)

---

## Priority 3: Integration Tests (Highly Recommended)

### 6. **End-to-End AI Flow Tests** (`tests/integration/aiAgent.integration.test.ts`)

**Why Important:** Unit tests miss interaction bugs.

```typescript
describe('AI Agent Integration', () => {
  describe('Single Rectangle Creation', () => {
    it('should create rectangle at viewport center')
    it('should auto-select created rectangle')
    it('should update viewport info before execution')
  })

  describe('Multi-Step Commands', () => {
    it('should create + resize rectangle in one command')
    it('should create + change color in one command')
    it('should auto-select first created rectangle for modifications')
    it('should fail gracefully if rectangle deleted mid-execution')
  })

  describe('Selection Context', () => {
    it('should fail if modifying without selection')
    it('should modify selected rectangle')
    it('should preserve selection during execution')
    it('should not allow selection changes while locked')
  })

  describe('Batch Creation', () => {
    it('should create 5 rectangles in a row')
    it('should create 10 rectangles in a grid')
    it('should not auto-select multiple created rectangles')
  })

  describe('Error Scenarios', () => {
    it('should handle viewport not ready error')
    it('should handle canvas limit (1000 rectangles)')
    it('should handle quota exceeded (1000 commands)')
    it('should handle invalid color gracefully')
    it('should handle network timeout')
  })
})
```

**Risk if Not Tested:**
- Features work in isolation but fail when combined
- Race conditions only appear in real usage
- Performance issues under load

---

## Testing Infrastructure Needs

### Mock Requirements

1. **Firebase Functions Mock**
   ```typescript
   vi.mock('firebase/functions', () => ({
     getFunctions: vi.fn(),
     httpsCallable: vi.fn(() => async (data) => ({ data: mockResponse }))
   }))
   ```

2. **CanvasContext Mock**
   ```typescript
   const mockCanvasContext = {
     rectangles: [],
     selectedRectangleId: null,
     getViewportInfo: vi.fn(() => mockViewport),
     createRectangle: vi.fn(),
     updateRectangle: vi.fn(),
     setSelectionLocked: vi.fn()
   }
   ```

3. **Timer Mocks** (for retry/debounce tests)
   ```typescript
   vi.useFakeTimers()
   ```

---

## Test Data Fixtures

Create `tests/fixtures/aiAgent.fixtures.ts`:

```typescript
export const mockCanvasState = {
  rectangles: [
    { id: 'rect1', x: 100, y: 100, width: 100, height: 80, color: '#3b82f6' }
  ]
}

export const mockViewportInfo = {
  centerX: 500,
  centerY: 400,
  zoom: 1,
  visibleBounds: { left: 0, top: 0, right: 1000, bottom: 800 }
}

export const mockCloudFunctionResponse = {
  commands: [
    { tool: 'createRectangle', parameters: { x: 500, y: 400, width: 100, height: 80, color: '#3b82f6' } }
  ]
}

export const mockErrors = {
  timeout: { code: 'deadline-exceeded', message: 'Timeout' },
  quota: { code: 'resource-exhausted', message: 'Quota exceeded' },
  auth: { code: 'unauthenticated', message: 'Not logged in' }
}
```

---

## Coverage Targets

**Minimum Acceptable Coverage:**
- `canvasCommandExecutor.ts`: **90%+** (critical business logic)
- `aiErrors.ts`: **95%+** (simple but critical)
- `aiAgent.ts`: **85%+** (complex orchestration)
- `useAIAgent.ts`: **80%+** (React hooks can be tricky)
- `AIChat.tsx`: **70%+** (UI components, focus on interactions)

**Overall Target:** **80%+ coverage** for all AI agent code

---

## Recommended Testing Order

1. **Start with `aiErrors.test.ts`** (simple, high ROI)
2. **Then `canvasCommandExecutor.test.ts`** (core logic, many edge cases)
3. **Then `aiAgent.test.ts`** (orchestration, depends on above)
4. **Then `useAIAgent.test.ts`** (React hook integration)
5. **Then `AIChat.test.tsx`** (UI, least likely to break silently)
6. **Finally integration tests** (catch interaction bugs)

---

## What NOT to Test (Low Priority)

1. ❌ Firebase Cloud Function itself (tested via manual testing + logs)
2. ❌ OpenAI API responses (can't control, test with mocks)
3. ❌ CSS styling (visual regression testing out of scope)
4. ❌ Firebase Realtime Database (already tested in Phase 1)
5. ❌ Konva.js library (third-party, assume it works)

---

## Quick Wins (Write These First)

These tests are **easy to write** and **catch the most bugs**:

1. ✅ Color validation (5 test cases, 5 minutes to write)
2. ✅ Parameter clamping (8 test cases, 10 minutes to write)
3. ✅ Error code mapping (10 test cases, 15 minutes to write)
4. ✅ Rectangle existence checks (4 test cases, 10 minutes to write)
5. ✅ Batch layout calculations (3 test cases, 20 minutes to write)

**Total: ~1 hour** for 30 high-value tests!

---

## Risks if Tests Not Added

### High Risk (Likely to Break in Production)
1. **Parameter validation** - Invalid values crash Firebase or Konva
2. **Error classification** - Users see wrong UI buttons
3. **Selection locking** - Race conditions cause data corruption
4. **Batch layouts** - Rectangles created off-screen or overlapping

### Medium Risk (Annoying but Not Critical)
1. **Focus management** - Poor keyboard UX
2. **Loading states** - Spinner never stops
3. **Retry functionality** - Retry button doesn't work

### Low Risk (Edge Cases)
1. **Empty input validation** - Wasted API calls
2. **Partial success messages** - Confusing wording
3. **Dark mode rendering** - Visual issues only

---

## Summary & Recommendation

**Before moving to production, implement at minimum:**

1. ✅ **`aiErrors.test.ts`** - 15 tests (~20 min)
2. ✅ **`canvasCommandExecutor.test.ts`** - 25 tests (~1 hour)
3. ✅ **`aiAgent.test.ts`** - 20 tests (~1.5 hours)
