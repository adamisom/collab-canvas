# CollabCanvas MVP - Task List & File Structure

## Project File Structure

```
collabcanvas/
├── .gitignore
├── package.json
├── vite.config.js
├── index.html
├── README.md
├── .env.local (not committed)
├── .env.example
├── firebase.json
├── .firebaserc
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   │
│   ├── config/
│   │   └── firebase.ts
│   │
│   ├── services/
│   │   ├── firebaseService.ts
│   │   ├── canvasService.ts
│   │   └── cursorService.ts
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── CanvasContext.tsx
│   │
│   ├── hooks/
│   │   ├── useCanvas.ts
│   │   └── useCursors.ts
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── LoginForm.css
│   │   │
│   │   ├── canvas/
│   │   │   ├── Canvas.tsx
│   │   │   ├── Canvas.css
│   │   │   ├── Rectangle.tsx
│   │   │   └── Cursor.tsx
│   │   │
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Header.css
│   │
│   └── utils/
│       ├── canvasHelpers.ts
│       └── constants.ts
│
├── tests/
│   ├── setup.ts
│   ├── services/
│   │   ├── canvasService.test.ts
│   │   └── cursorService.test.ts
│   └── utils/
│       └── canvasHelpers.test.ts
│
└── public/
    └── (static assets if needed)
```

---

## Quick Start Guide

### Setting Up Your Development Environment

1. **Clone and Setup**
   ```bash
   git clone <your-repo-url>
   cd collabcanvas
   npm install
   ```

2. **Create Firebase Project**
   - Go to Firebase Console (https://console.firebase.google.com)
   - Create new project
   - Enable Realtime Database
   - Enable Authentication > Anonymous sign-in
   - Copy configuration to `.env.local`

3. **Start Development**
   ```bash
   npm run dev
   # Open http://localhost:5173
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

### Daily Workflow

**Starting a new PR:**
```bash
git checkout main
git pull origin main
git checkout -b <branch-name>
```

**While working:**
- Check off tasks in this document as you complete them
- Run `npm test` frequently if working on tested code
- Test in multiple browsers for real-time features
- Commit often with clear messages

**Before pushing:**
```bash
npm test              # Verify all tests pass
npm run dev          # Test in browser
# Open 2nd browser window for multi-user test
git add .
git commit -m "descriptive commit message"
git push origin <branch-name>
```

**Create PR on GitHub:**
- Review the success criteria for your PR
- Verify all tasks are checked off
- Create PR and merge to main

---

## Key Reminders

### Architecture Flow
```
User Action → Component → Hook → Context → Service → Firebase
                                    ↓
                                 Utilities
```

### Critical Success Factors

**Do This:**
- ✅ Start with cursor sync - proves real-time works
- ✅ Test with 2 browsers from the beginning
- ✅ Keep Firebase data structure simple
- ✅ Write unit tests for services as you build them
- ✅ Check Firebase Console to verify data structure
- ✅ Commit and push frequently

**Avoid This:**
- ❌ Building full UI before testing sync
- ❌ Skipping tests for "tested" PRs
- ❌ Testing only in one browser
- ❌ Complex data structures in Firebase
- ❌ Moving to next PR with bugs in current PR
- ❌ Leaving console.log statements in final code

### Firebase Data Structure

**Suggested structure:**
```
database/
  users/
    {userId}/
      username: "Alice"
      
  cursors/
    {userId}/
      x: 100
      y: 200
      username: "Alice"
      timestamp: 1234567890
      
  rectangles/
    {rectangleId}/
      id: "rect_123"
      x: 50
      y: 100
      width: 200
      height: 150
      createdBy: {userId}
      timestamp: 1234567890
```

### Debugging Tips

**If cursors don't sync:**
- Check Firebase Console - are cursor positions being written?
- Check browser console for errors
- Verify throttling isn't too aggressive
- Test in incognito window with different user

**If rectangles don't sync:**
- Check Firebase Console - are rectangles being written?
- Verify Firebase listeners are set up correctly
- Check that unique IDs are being generated
- Ensure context is properly wrapping components

**If tests fail:**
- Read error message carefully
- Run single test file: `npm test canvasService.test.js`
- Check if test expectations match actual implementation
- Verify mocks are set up correctly for Firebase

### Performance Considerations

**For MVP, good enough is:**
- Cursor updates feel smooth (no need to be perfect)
- Rectangle creation appears within 100ms
- Can pan/zoom without obvious lag
- Works with 5 concurrent users

**Don't spend time on:**
- Perfect 60 FPS rendering
- Optimistic UI updates
- Complex conflict resolution
- Advanced throttling/debouncing (basic is fine)

---

## Final Pre-Submission Checklist

Run through this before calling MVP complete:

### Code Quality
- [ ] No console.log or debug statements
- [ ] No commented-out code
- [ ] No TODO comments
- [ ] All unit tests passing
- [ ] Code is formatted consistently

### Functionality
- [ ] Can create account with username
- [ ] Can pan and zoom canvas smoothly
- [ ] Can create rectangles by clicking
- [ ] Can select and drag rectangles
- [ ] See other users' cursors in real-time
- [ ] All changes sync across users <100ms
- [ ] State persists through page refresh

### Multi-User Testing
- [ ] Tested with 2 browsers simultaneously
- [ ] Tested with 3+ browsers simultaneously
- [ ] Rapid rectangle creation works
- [ ] Concurrent dragging works
- [ ] Page refresh during activity works

### Deployment
- [ ] Deployed to Firebase Hosting
- [ ] Public URL accessible
- [ ] Works on production (not just localhost)
- [ ] Firebase rules configured correctly
- [ ] No CORS or connection errors

### Documentation
- [ ] README has setup instructions
- [ ] README has deployed URL
- [ ] Environment variables documented in .env.example
- [ ] Basic usage instructions included

**When all boxes are checked, you're ready to submit your MVP! 🚀**

## Pull Request Checklist

### PR #1: Project Setup & Configuration
**Branch:** `setup/initial-config`  
**Goal:** Initialize React + Vite project with Firebase configuration

**Tasks:**
- [ ] Remove existing files and start fresh with TypeScript setup
  - Removes: Existing src files, configs that conflict
- [ ] Create new Vite + React + TypeScript project structure
  - Creates: `package.json`, `vite.config.ts`, `index.html`
- [ ] Install dependencies (react, react-dom, vite, firebase, react-konva, konva, typescript)
  - Edits: `package.json`
- [ ] Install testing dependencies (vitest, @testing-library/react, @testing-library/jest-dom, @types/*)
  - Edits: `package.json`
- [ ] Configure Vitest for testing within existing vite.config.ts
  - Edits: `vite.config.ts`
  - Creates: `tests/setup.ts`
- [ ] Create Firebase project in Firebase Console (manual step for you)
  - Manual step: Create project, enable Realtime Database, enable Anonymous Auth
- [ ] Set up Firebase configuration and initialization
  - Creates: `src/config/firebase.ts`
  - Creates: `.env.example`
  - Creates: `.env.local` (local only, not committed)
  - Edits: `.gitignore`
- [ ] Create Firebase service layer with RTDB and Auth exports
  - Creates: `src/services/firebaseService.ts`
- [ ] Configure Firebase Realtime Database rules (manual step for you)
  - Manual step: Set rules to allow read/write for authenticated users
- [ ] Set up basic app structure with TypeScript
  - Creates: `src/App.tsx`, `src/App.css`, `src/main.tsx`
  - Creates: `src/utils/constants.ts`
- [ ] Create README with setup instructions
  - Creates: `README.md`
- [ ] Test Firebase connection and RTDB export
  - Edits: `src/App.tsx` (temporary test code)

**Files Created:**
- `package.json`
- `vite.config.ts`
- `tests/setup.ts`
- `index.html`
- `.gitignore`
- `.env.example`
- `src/main.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/config/firebase.ts`
- `src/services/firebaseService.ts`
- `src/utils/constants.ts`
- `README.md`

**Files Edited:**
- None (initial setup)

**Success Criteria:**
- ✅ `npm run dev` starts development server
- ✅ `npm test` runs test suite successfully
- ✅ Firebase initializes without errors
- ✅ Can see "Hello World" React app in browser

---

### PR #2: Anonymous Authentication
**Branch:** `feature/anonymous-auth`  
**Goal:** Implement anonymous authentication with username

**Tasks:**
- [ ] Create AuthContext for managing user state
  - Creates: `src/contexts/AuthContext.tsx`
- [ ] Create login form component
  - Creates: `src/components/auth/LoginForm.tsx`
  - Creates: `src/components/auth/LoginForm.css`
- [ ] Implement anonymous sign-in with Firebase Auth
  - Edits: `src/contexts/AuthContext.tsx`
- [ ] Store username in Firebase Realtime Database under users node
  - Edits: `src/contexts/AuthContext.tsx`
- [ ] Handle session persistence (user stays logged in on refresh)
  - Edits: `src/contexts/AuthContext.tsx`
- [ ] Add authentication wrapper to App
  - Edits: `src/App.tsx`
- [ ] Create simple header showing logged-in username
  - Creates: `src/components/layout/Header.tsx`
  - Creates: `src/components/layout/Header.css`
- [ ] Test login flow with multiple browser windows

**Files Created:**
- `src/contexts/AuthContext.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/LoginForm.css`
- `src/components/layout/Header.tsx`
- `src/components/layout/Header.css`

**Files Edited:**
- `src/App.tsx`
- `src/main.tsx`

**Success Criteria:**
- ✅ User can enter username and log in
- ✅ Username persists on page refresh
- ✅ Multiple users can log in with different usernames
- ✅ User info stored in Firebase Realtime Database

---

### PR #3: Canvas Context & Service Layer
**Branch:** `feature/canvas-context`  
**Goal:** Set up canvas state management and service layer

**Tasks:**
- [ ] Create Canvas service for Firebase operations
  - Creates: `src/services/canvasService.ts`
- [ ] Write unit tests for canvasService
  - Creates: `tests/services/canvasService.test.ts`
  - Tests: Rectangle ID generation, data structure format, CRUD operations
- [ ] Create CanvasContext for managing canvas state
  - Creates: `src/contexts/CanvasContext.tsx`
- [ ] Implement canvas state initialization
  - Edits: `src/contexts/CanvasContext.tsx`
- [ ] Create helper utilities for canvas operations
  - Creates: `src/utils/canvasHelpers.ts`
- [ ] Write unit tests for canvasHelpers
  - Creates: `tests/utils/canvasHelpers.test.ts`
  - Tests: Coordinate calculations, ID generation, bounds checking
- [ ] Add useCanvas hook for components to access canvas context
  - Creates: `src/hooks/useCanvas.ts`
- [ ] Set up canvas dimensions and constants
  - Edits: `src/utils/constants.ts`
- [ ] Wrap App with CanvasContext provider
  - Edits: `src/App.tsx`
- [ ] Run tests to verify service layer
  - Run: `npm test`

**Files Created:**
- `src/services/canvasService.ts`
- `tests/services/canvasService.test.ts`
- `src/contexts/CanvasContext.tsx`
- `src/hooks/useCanvas.ts`
- `src/utils/canvasHelpers.ts`
- `tests/utils/canvasHelpers.test.ts`

**Files Edited:**
- `src/App.tsx`
- `src/utils/constants.ts`

**Success Criteria:**
- ✅ All unit tests pass (`npm test`)
- ✅ CanvasContext provides state to components
- ✅ canvasService can interact with Firebase RTDB
- ✅ useCanvas hook returns canvas state and methods
- ✅ canvasHelpers utilities work correctly
- ✅ No console errors

**Test Coverage:**
- Unit tests for canvasService: Rectangle data structure, ID generation
- Unit tests for canvasHelpers: Coordinate math, boundary validation

---

### PR #4: Basic Canvas with Pan & Zoom
**Branch:** `feature/canvas-foundation`  
**Goal:** Create canvas workspace with pan and zoom functionality

**Tasks:**
- [ ] Install and configure react-konva (if not already added)
  - Edits: `package.json`
- [ ] Create Canvas component with Stage and Layer
  - Creates: `src/components/canvas/Canvas.tsx`
  - Creates: `src/components/canvas/Canvas.css`
- [ ] Implement pan functionality (click and drag background)
  - Edits: `src/components/canvas/Canvas.tsx`
- [ ] Implement zoom functionality (mouse wheel)
  - Edits: `src/components/canvas/Canvas.tsx`
- [ ] Connect Canvas component to CanvasContext
  - Edits: `src/components/canvas/Canvas.tsx`
- [ ] Integrate Canvas component into App
  - Edits: `src/App.tsx`
- [ ] Test pan and zoom in browser

**Files Created:**
- `src/components/canvas/Canvas.tsx`
- `src/components/canvas/Canvas.css`

**Files Edited:**
- `src/App.tsx`
- `package.json` (if dependencies added)

**Success Criteria:**
- ✅ Canvas renders in browser
- ✅ Can click and drag to pan around canvas
- ✅ Can scroll to zoom in and out
- ✅ Canvas feels smooth and responsive

---

### PR #5: Cursor Service & Synchronization
**Branch:** `feature/cursor-sync`  
**Goal:** Implement real-time cursor tracking for all users

### PR #5: Cursor Service & Synchronization
**Branch:** `feature/cursor-sync`  
**Goal:** Implement real-time cursor tracking for all users

**Tasks:**
- [ ] Create Cursor service for Firebase operations
  - Creates: `src/services/cursorService.ts`
- [ ] Write unit tests for cursorService
  - Creates: `tests/services/cursorService.test.ts`
  - Tests: Cursor data format, throttling logic, cleanup on disconnect
- [ ] Create Cursor component for rendering other users' cursors
  - Creates: `src/components/canvas/Cursor.tsx`
- [ ] Create useCursors hook for managing cursor data
  - Creates: `src/hooks/useCursors.ts`
- [ ] Implement cursor position broadcasting to Firebase
  - Edits: `src/services/cursorService.ts`
- [ ] Set up Firebase listener for cursor positions
  - Edits: `src/hooks/useCursors.ts`
- [ ] Broadcast current user's cursor position on mouse move
  - Edits: `src/components/canvas/Canvas.tsx`
- [ ] Render other users' cursors with usernames
  - Edits: `src/components/canvas/Canvas.tsx`
- [ ] Handle cursor cleanup on user disconnect
  - Edits: `src/services/cursorService.ts`
- [ ] Throttle cursor position updates for performance (16ms)
  - Edits: `src/hooks/useCursors.ts` or `src/utils/canvasHelpers.ts`
- [ ] Run tests to verify cursor service
  - Run: `npm test`
- [ ] Test with 2+ browser windows (manual integration test)

**Files Created:**
- `src/services/cursorService.ts`
- `tests/services/cursorService.test.ts`
- `src/components/canvas/Cursor.tsx`
- `src/hooks/useCursors.ts`

**Files Edited:**
- `src/components/canvas/Canvas.tsx`
- `src/utils/canvasHelpers.ts` (if adding throttle utility)

**Success Criteria:**
- ✅ All unit tests pass (`npm test`)
- ✅ Open 2 browser windows, see both cursors moving (manual test)
- ✅ Cursors show usernames
- ✅ Cursor positions update smoothly (<50ms)
- ✅ Cursors disappear when users close tab

**Test Coverage:**
- Unit tests for cursorService: Data formatting, throttle functionality
- Manual integration test: Multi-user cursor sync

---

### PR #6: Rectangle Creation & Sync
**Branch:** `feature/rectangle-creation`  
**Goal:** Enable users to create rectangles that sync across all users

### PR #6: Rectangle Creation & Sync
**Branch:** `feature/rectangle-creation`  
**Goal:** Enable users to create rectangles that sync across all users

**Tasks:**
- [ ] Create Rectangle component
  - Creates: `src/components/canvas/Rectangle.tsx`
- [ ] Implement click-to-create rectangle functionality in Canvas
  - Edits: `src/components/canvas/Canvas.tsx`
- [ ] Add rectangle creation methods to canvasService
  - Edits: `src/services/canvasService.ts`
- [ ] Update unit tests for new canvasService methods
  - Edits: `tests/services/canvasService.test.ts`
  - Tests: createRectangle(), rectangle validation
- [ ] Add rectangle state management to CanvasContext
  - Edits: `src/contexts/CanvasContext.tsx`
- [ ] Generate unique IDs for rectangles
  - Edits: `src/utils/canvasHelpers.ts`
- [ ] Store rectangles in Firebase Realtime Database
  - Edits: `src/services/canvasService.ts`
- [ ] Listen for rectangle changes from other users
  - Edits: `src/contexts/CanvasContext.tsx`
- [ ] Render all rectangles on canvas
  - Edits: `src/components/canvas/Canvas.tsx`
- [ ] Run tests to verify rectangle creation logic
  - Run: `npm test`
- [ ] Test rectangle creation across multiple users (manual integration test)

**Files Created:**
- `src/components/canvas/Rectangle.tsx`

**Files Edited:**
- `src/components/canvas/Canvas.tsx`
- `src/services/canvasService.ts`
- `tests/services/canvasService.test.ts`
- `src/contexts/CanvasContext.tsx`
- `src/utils/canvasHelpers.ts`

**Success Criteria:**
- ✅ All unit tests pass (`npm test`)
- ✅ Click on canvas creates a rectangle (manual test)
- ✅ Rectangles appear for all users instantly (manual test)
- ✅ New rectangles sync in <100ms
- ✅ Multiple users can create rectangles simultaneously

**Test Coverage:**
- Unit tests: Rectangle creation, ID uniqueness, data validation
- Manual integration test: Multi-user rectangle creation sync

---

### PR #7: Rectangle Selection & Movement
**Branch:** `feature/rectangle-movement`  
**Goal:** Allow users to select and drag rectangles

### PR #7: Rectangle Selection & Movement
**Branch:** `feature/rectangle-movement`  
**Goal:** Allow users to select and drag rectangles

**Tasks:**
- [ ] Implement rectangle selection (click to select)
  - Edits: `src/components/canvas/Canvas.tsx`
  - Edits: `src/components/canvas/Rectangle.tsx`
- [ ] Add selection state to CanvasContext
  - Edits: `src/contexts/CanvasContext.tsx`
- [ ] Add visual indicator for selected rectangle (shows to other users)
  - Edits: `src/components/canvas/Rectangle.tsx`
- [ ] Implement drag functionality for rectangles
  - Edits: `src/components/canvas/Rectangle.tsx`
- [ ] Add rectangle update methods to canvasService
  - Edits: `src/services/canvasService.ts`
- [ ] Update unit tests for rectangle update methods
  - Edits: `tests/services/canvasService.test.ts`
  - Tests: updateRectangle(), position validation
- [ ] Sync rectangle position changes to Firebase (optimistic updates)
  - Edits: `src/contexts/CanvasContext.tsx`
  - Edits: `src/components/canvas/Rectangle.tsx`
- [ ] Handle deselection (click on empty canvas)
  - Edits: `src/components/canvas/Canvas.tsx`
- [ ] Run tests to verify update logic
  - Run: `npm test`
- [ ] Test movement across multiple users (manual integration test)

**Files Created:**
- None

**Files Edited:**
- `src/components/canvas/Canvas.tsx`
- `src/components/canvas/Rectangle.tsx`
- `src/contexts/CanvasContext.tsx`
- `src/services/canvasService.ts`
- `tests/services/canvasService.test.ts`

**Success Criteria:**
- ✅ All unit tests pass (`npm test`)
- ✅ Can click to select a rectangle (manual test)
- ✅ Selected rectangle shows visual feedback
- ✅ Can drag selected rectangle
- ✅ Movement syncs to all users in <100ms (manual test)
- ✅ Other users see smooth movement

**Test Coverage:**
- Unit tests: Rectangle update, position bounds validation
- Manual integration test: Multi-user drag sync

---

### PR #8: State Persistence & Testing
**Branch:** `feature/state-persistence`  
**Goal:** Ensure canvas state persists and test all multiplayer features

### PR #8: State Persistence & Testing
**Branch:** `feature/state-persistence`  
**Goal:** Ensure canvas state persists and test all multiplayer features

**Tasks:**
- [ ] Verify rectangles persist in Firebase after all users leave
  - Test in Firebase Console
- [ ] Implement canvas state loading on user join
  - Edits: `src/contexts/CanvasContext.tsx`
  - Edits: `src/services/canvasService.ts`
- [ ] Test page refresh - ensure rectangles and state remain
  - Manual integration test
- [ ] Handle edge cases (rapid creation, concurrent edits)
  - Edits: `src/services/canvasService.ts`
  - Edits: `src/contexts/CanvasContext.tsx`
- [ ] Add error handling for Firebase operations
  - Edits: `src/services/canvasService.ts`
  - Edits: `src/services/cursorService.ts`
- [ ] Test with 3-5 concurrent users
  - Manual integration test
- [ ] Verify last-write-wins conflict resolution
  - Manual integration test
- [ ] Run full test suite
  - Run: `npm test`
- [ ] Clean up console logs and debug code
  - Edits: Multiple files
- [ ] Perform comprehensive manual integration tests
  - Manual test: Multi-user editing simultaneously
  - Manual test: Rapid rectangle creation and movement
  - Manual test: Page refresh persistence
  - Manual test: User disconnect/reconnect scenarios

**Files Created:**
- None

**Files Edited:**
- `src/contexts/CanvasContext.tsx`
- `src/services/canvasService.ts`
- `src/services/cursorService.ts`
- Any files with debug code

**Success Criteria:**
- ✅ All unit tests pass (`npm test`)
- ✅ All users leave, return, and see same rectangles (manual test)
- ✅ Page refresh maintains all state (manual test)
- ✅ 5 users can collaborate without issues (manual test)
- ✅ No console errors
- ✅ Graceful handling of edge cases

**Test Coverage:**
- All existing unit tests pass
- Comprehensive manual integration testing of all MVP features

---

### PR #9: Deployment & Production Setup
### PR #9: Deployment & Production Setup
**Branch:** `deploy/production`  
**Goal:** Deploy application to Firebase Hosting

**Tasks:**
- [ ] Install Firebase CLI
  - Run: `npm install -g firebase-tools`
- [ ] Initialize Firebase Hosting
  - Creates: `firebase.json`, `.firebaserc`
- [ ] Configure build settings for Vite
  - Edits: `firebase.json`
- [ ] Update Firebase Realtime Database rules for production
  - Manual step in Firebase Console
- [ ] Build production version
  - Run: `npm run build`
- [ ] Deploy to Firebase Hosting
  - Run: `firebase deploy`
- [ ] Test deployed application with multiple users
  - Manual testing on production URL
- [ ] Update README with deployed URL
  - Edits: `README.md`
- [ ] Verify all MVP requirements on production

**Files Created:**
- `firebase.json`
- `.firebaserc`

**Files Edited:**
- `README.md`

**Success Criteria:**
- ✅ Application accessible via public URL
- ✅ All features work on production
- ✅ Multiple users can access simultaneously
- ✅ No CORS or configuration issues

---

## Quick Reference: Files by Category

### Configuration Files
- `package.json` - Dependencies
- `vite.config.js` - Vite configuration
- `.env.local` - Environment variables (not committed)
- `.env.example` - Example environment variables
- `firebase.json` - Firebase hosting config
- `.firebaserc` - Firebase project config
- `.gitignore` - Git ignore rules

### Core Application
- `src/main.jsx` - App entry point
- `src/App.jsx` - Main app component
- `src/App.css` - Global styles

### Firebase
- `src/config/firebase.ts` - Firebase initialization
- `src/services/firebaseService.ts` - RTDB and Auth exports
- `src/services/canvasService.ts` - Canvas Firebase operations
- `src/services/cursorService.ts` - Cursor Firebase operations

### Authentication
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/components/auth/LoginForm.tsx` - Login UI
- `src/components/auth/LoginForm.css` - Login styles

### Canvas State Management
- `src/contexts/CanvasContext.tsx` - Canvas state management

### Canvas Components
- `src/components/canvas/Canvas.tsx` - Main canvas container
- `src/components/canvas/Canvas.css` - Canvas styles
- `src/components/canvas/Rectangle.tsx` - Rectangle shape
- `src/components/canvas/Cursor.tsx` - Multiplayer cursor

### Hooks (Custom React Hooks)
- `src/hooks/useCanvas.ts` - Access canvas context
- `src/hooks/useCursors.ts` - Cursor syncing

### Utilities
- `src/utils/canvasHelpers.ts` - Canvas helper functions
- `src/utils/constants.ts` - App constants

### Layout
- `src/components/layout/Header.tsx` - App header
- `src/components/layout/Header.css` - Header styles

### Tests
- `vite.config.ts` - Includes test configuration
- `tests/setup.ts` - Test environment setup
- `tests/services/canvasService.test.ts` - Canvas service unit tests
- `tests/services/cursorService.test.ts` - Cursor service unit tests
- `tests/utils/canvasHelpers.test.ts` - Canvas helpers unit tests

---

## Testing Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test canvasService.test.js
```

---

## Development Workflow

1. Create a new branch for each PR: `git checkout -b <branch-name>`
2. Complete all tasks in the PR checklist
3. Test thoroughly in multiple browsers
4. Commit changes: `git commit -m "descriptive message"`
5. Push to GitHub: `git push origin <branch-name>`
6. Create Pull Request on GitHub
7. Merge to main after review
8. Move to next PR

---

## Testing Strategy

### Unit Tests (Automated)
Run with: `npm test`

**What We're Testing:**
1. **Service Layer** (PR #3, #5, #6, #7)
   - `canvasService.js`: Rectangle CRUD operations, data formatting, ID generation
   - `cursorService.js`: Cursor data structure, throttling logic, cleanup
   
2. **Utilities** (PR #3)
   - `canvasHelpers.js`: Coordinate calculations, bounds checking, ID generation

**Why These?**
- Services are the core business logic - must be reliable
- Utilities have pure functions - easy to test, high value
- These tests catch bugs before they reach the UI

### Good Unit Test Characteristics
When writing or reviewing tests, ensure they:

1. **Test behavior, not implementation**
   - ✅ Good: "createRectangle returns object with id, x, y, width, height"
   - ❌ Bad: "createRectangle calls generateId function"

2. **Have clear test names**
   - ✅ Good: "generateId returns unique IDs for multiple calls"
   - ❌ Bad: "test1"

3. **Test one thing at a time**
   - Each test should verify one specific behavior
   - Multiple assertions are OK if testing same behavior

4. **Are independent**
   - Tests should not depend on execution order
   - Each test sets up its own data

5. **Mock Firebase when needed**
   - Don't hit real Firebase in unit tests
   - Use mocks for database operations

**Example Test Structure:**
```javascript
describe('canvasService', () => {
  describe('createRectangle', () => {
    it('returns rectangle with required properties', () => {
      const rect = createRectangle(10, 20, 100, 50);
      expect(rect).toHaveProperty('id');
      expect(rect.x).toBe(10);
      expect(rect.y).toBe(20);
    });

    it('generates unique IDs for different rectangles', () => {
      const rect1 = createRectangle(0, 0, 10, 10);
      const rect2 = createRectangle(0, 0, 10, 10);
      expect(rect1.id).not.toBe(rect2.id);
    });
  });
});
```

### Integration Tests (Manual)
**What We're Testing:**
1. **Multi-user Sync** (PR #5, #6, #7, #8)
   - Open 2+ browsers
   - Verify cursor positions sync
   - Verify rectangle creation syncs
   - Verify rectangle movement syncs
   
2. **State Persistence** (PR #8)
   - Create rectangles
   - Refresh page
   - Verify rectangles remain
   
3. **Concurrent Operations** (PR #8)
   - 3-5 users editing simultaneously
   - Rapid creation/movement
   - Verify no data loss or conflicts

**Why Manual?**
- Real-time Firebase sync requires actual Firebase connection
- Multi-browser testing is hard to automate for MVP timeline
- Manual testing catches UX issues automated tests miss

### When Tests Fail
If your coding agent generates code that fails tests:

1. **Read the error message carefully**
   - What assertion failed?
   - What was expected vs actual?

2. **Check the service implementation**
   - Is the function returning correct data structure?
   - Are all required properties present?

3. **Verify test is correct**
   - Sometimes tests need updating when requirements change
   - But most often, the implementation has the bug

4. **Run single test in isolation**
   - `npm test -- canvasService.test.js`
   - Easier to debug one test at a time

### Testing Checklist (Run Before Each PR)
- [ ] `npm test` passes (if tests exist for that PR)
- [ ] Open in 2+ browser windows
- [ ] Test all new functionality works
- [ ] Check Firebase Console for data structure
- [ ] No console errors
- [ ] Changes sync between users
- [ ] Page refresh maintains state

---

## MVP Completion Checklist

Before submitting MVP, verify:

### Automated Tests
- [ ] All unit tests pass (`npm test`)
- [ ] No failing or skipped tests
- [ ] Test coverage for services and utilities

### Manual Integration Tests
- [ ] 2+ users can edit simultaneously ✓
- [ ] All users see each other's cursors with names ✓
- [ ] Rectangles sync <100ms ✓
- [ ] State persists through refresh ✓
- [ ] Deployed and publicly accessible ✓
- [ ] Smooth pan and zoom ✓

### Multi-User Scenarios
- [ ] Open 3+ browser windows simultaneously
- [ ] Create rectangles from different users
- [ ] Move rectangles while others are creating
- [ ] Refresh one browser mid-edit
- [ ] Close/reopen browsers - state remains

### Edge Cases
- [ ] Rapid clicking to create many rectangles
- [ ] Dragging rectangles very quickly
- [ ] Two users dragging same rectangle (last-write-wins)
- [ ] Page refresh during rectangle creation
- [ ] Network throttling (test in DevTools)

### Production Readiness
- [ ] No console errors
- [ ] No debug logs in production build
- [ ] Firebase rules properly configured
- [ ] Environment variables properly set
- [ ] README has setup and deployment instructions
