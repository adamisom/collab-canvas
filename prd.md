# CollabCanvas MVP - Product Requirements Document

## Project Overview
Build a real-time collaborative canvas application (Figma-like) where multiple users can simultaneously create, move, and manipulate simple shapes while seeing each other's cursors and changes in real-time.

**Timeline:** 24 hours to MVP checkpoint  
**Hard Requirements:** Must be deployed and support 2+ concurrent users with authentication

---

## User Stories

### Primary User: Designer/Collaborator
- As a user, I want to **create an account and log in** so that my identity is tracked in collaborative sessions
- As a user, I want to **see a large canvas workspace** so that I have room to design
- As a user, I want to **pan and zoom the canvas smoothly** so that I can navigate my workspace efficiently
- As a user, I want to **create rectangles** so that I can build designs
- As a user, I want to **move objects on the canvas** so that I can arrange my design
- As a user, I want to **see other users' cursors with their names** so that I know who's working where
- As a user, I want to **see changes other users make instantly** so that we can collaborate in real-time
- As a user, I want to **refresh my browser and see my work persisted** so that I don't lose progress

### Secondary User: Evaluator/Tester
- As an evaluator, I want to **open the app in 2+ browsers simultaneously** to verify real-time sync
- As an evaluator, I want to **see smooth performance with multiple shapes** to verify the technical quality
- As an evaluator, I want to **disconnect and reconnect** to verify state persistence

---

## Key Features Required for MVP

### 1. Authentication System
**Must Have:**
- Anonymous authentication with username
- Unique identifier for each user session
- Username displayed with cursor

**Implementation Notes:**
- No password management needed
- Users enter username and start collaborating immediately
- Session persists across page refreshes

### 2. Canvas Infrastructure
**Must Have:**
- Large workspace (minimum 3000x3000px virtual space)
- Smooth pan (click-drag to move viewport)
- Smooth zoom (mouse wheel or pinch gesture)

**Implementation Notes:**
- Canvas rendering performance should be reasonable
- Focus on functionality over perfect optimization

### 3. Shape Creation & Manipulation
**Must Have:**
- Rectangles only (single shape type for MVP)
- Click/drag to create new rectangles
- Click to select a rectangle
- Drag to move selected rectangles

**Out of Scope:**
- Multiple shape types (circles, text)
- Styling options (color picker)
- Resize and rotate

### 4. Real-Time Synchronization
**Must Have:**
- Multiplayer cursors showing position and username
- Object creation syncs to all users <100ms
- Object movement syncs to all users <100ms
- Cursor position syncs <50ms

**Critical Requirements:**
- Changes from one user appear immediately for others
- No race conditions or lost updates
- Handle simultaneous edits gracefully

### 5. Presence Awareness
**Must Have:**
- Show multiplayer cursors with usernames
- Associate cursor position with user identity

**Out of Scope for MVP:**
- Online users list/sidebar
- Join/leave notifications

### 6. State Persistence
**Must Have:**
- Canvas state saves automatically
- All users see same state when rejoining
- State persists even if all users disconnect

**Implementation Notes:**
- Save to backend on every change
- Load state on user join

### 7. Deployment
**Must Have:**
- Publicly accessible URL
- Supports 5+ concurrent users
- Works across different browsers/devices

---

## Confirmed Tech Stack

### Frontend
- **React + Vite** - Fast development and build tooling
- **Konva.js (react-konva)** - Canvas rendering and interactions
- **Firebase SDK** - Real-time sync and authentication

### Backend
- **Firebase Realtime Database** - Real-time synchronization
- **Firebase Auth** - User authentication
- **Firebase Hosting** - Deployment

### Testing
- **Vitest** - Unit test runner
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - DOM assertions

### Why This Stack?
- **Fastest path to MVP** - Real-time sync built-in, no backend code needed
- **Automatic syncing** - Firebase handles all the complexity
- **Simple deployment** - One command to production
- **Free tier sufficient** - Supports all MVP requirements
- **Proven pattern** - Many collaborative apps built this way

---

## Out of Scope for MVP

**Explicitly NOT building (save for post-MVP):**
- ❌ Online users list or presence sidebar
- ❌ Multiple shape types (circles, text, lines)
- ❌ Advanced selection (shift-click, drag-to-select box)
- ❌ Multi-object selection
- ❌ Resize and rotate transformations
- ❌ Layer management and z-ordering
- ❌ Delete and duplicate operations
- ❌ Color customization or styling options
- ❌ Undo/redo functionality
- ❌ Copy/paste
- ❌ Export functionality
- ❌ Advanced conflict resolution (last-write-wins is acceptable)
- ❌ Performance optimization beyond basic functionality
- ❌ 60 FPS rendering requirement
- ❌ Mobile responsiveness
- ❌ Keyboard shortcuts
- ❌ Any AI features (Phase 2)

**Focus:** Nail the multiplayer experience with rectangles only.

---

## Performance Targets

### Real-Time Sync
- Sync object changes across users in <100ms (as fast as possible)
- Cursor positions sync in <50ms (as fast as possible)
- Support 5+ concurrent users without degradation

Performance will be monitored but 60 FPS is not a hard requirement for MVP.

---

## Critical Success Factors

### The Hard Parts (Prioritize These)
1. **Real-time sync** - This is 70% of the difficulty
2. **State persistence** - Must not lose data
3. **Cursor broadcasting** - Must be smooth and fast
4. **Presence tracking** - Who's online/offline

### The Easy Parts (Don't Over-invest)
1. UI polish
2. Canvas features beyond basics
3. Advanced shape options
4. Visual design

### Development Strategy

**Phase 1: Core Infrastructure**
- Set up Firebase project and React app
- Implement authentication
- Basic canvas with pan/zoom

**Phase 2: Real-Time Foundation**
- Get cursor sync working between users
- Test with 2 browsers simultaneously
- Verify cursor position updates smoothly

**Phase 3: Shape System**
- Implement rectangle creation
- Sync rectangle creation to Firebase
- Test multi-user shape creation

**Phase 4: Movement & Interaction**
- Add rectangle selection
- Implement drag-to-move
- Sync movement across users

**Phase 5: Polish & Deploy**
- Test with multiple users
- Fix critical bugs
- Deploy to Firebase Hosting
- Final testing on production URL

---

## Key Technical Decisions (CONFIRMED)

1. **Backend:** Firebase Realtime Database ✓
2. **Canvas Library:** Konva.js (react-konva) ✓
3. **Shape Type:** Rectangles only ✓
4. **Auth Method:** Anonymous auth with username ✓
5. **Hosting:** Firebase Hosting ✓
6. **Frontend Framework:** React + Vite ✓

---

## Risk Mitigation

### Highest Risks:
1. **Real-time sync not working smoothly** → Start with cursor sync first, then add complexity
2. **State persistence breaking** → Test frequently with browser refresh
3. **Performance degradation** → Profile early, use canvas library efficiently
4. **Running out of time** → Cut features aggressively, keep it simple

### Mitigation Strategy:
- Test multi-user functionality in first 8 hours
- Deploy early and often
- Have a "nuclear option" backup plan (simplest possible implementation)
- Don't add features until core is rock solid

---

## Success Metrics for MVP

**Must Pass:**
- ✅ 2+ users can edit simultaneously
- ✅ All users see each other's cursors with names in real-time
- ✅ Rectangles sync across users <100ms (as fast as possible)
- ✅ Canvas state persists through page refresh
- ✅ Deployed and publicly accessible
- ✅ Smooth pan and zoom functionality

**Evaluation Will Test:**
- Opening 2+ browsers and editing simultaneously
- Refreshing mid-edit to check persistence
- Creating/moving multiple shapes rapidly
- Network quality under collaboration

---

## Next Steps

1. **Review this PRD** - Confirm approach and tech choices ✓
2. **Review Task List** - Understand all PRs and file structure ✓
3. **Review Architecture Diagrams** - Understand system design ✓
4. **Set up development environment** - Install dependencies
5. **Build authentication** - Get users logging in
6. **Implement cursor sync** - Prove real-time works
7. **Add shape creation/movement** - Build core functionality
8. **Test multiplayer extensively** - The critical requirement
9. **Deploy** - Make it publicly accessible
10. **Iterate on bugs** - Fix issues before deadline
