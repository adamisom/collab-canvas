# CollabCanvas MVP

A real-time collaborative canvas application where multiple users can simultaneously create, move, and manipulate rectangles while seeing each other's cursors and changes in real-time.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Canvas:** Konva.js (react-konva)
- **Backend:** Firebase Realtime Database + Firebase Auth + Cloud Functions
- **AI:** OpenAI GPT-4o via Vercel AI SDK
- **Testing:** Vitest + React Testing Library
- **Deployment:** Firebase Hosting

## Development Setup

### Prerequisites

- Node.js (v22 or higher)
- npm or yarn
- Firebase account
- OpenAI API account (for AI commands)
- Java Runtime Environment (for Firebase Emulators)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd collab-canvas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Firebase Setup:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable **Realtime Database** (start in test mode)
   - Enable **Authentication** > **Anonymous** sign-in method
   - Go to Project Settings > General > Your apps
   - Add a web app and copy the configuration

4. **Environment Configuration:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your_actual_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **Install Cloud Functions dependencies:**
   ```bash
   cd functions
   npm install
   cd ..
   ```

6. **Set up OpenAI API key (required for AI commands):**
   - Get API key from [platform.openai.com](https://platform.openai.com/api-keys)
   - Configure Firebase Functions:
     ```bash
     firebase functions:config:set openai.key="sk-your-actual-api-key-here"
     ```

7. **Deploy Firebase Cloud Functions:**
   ```bash
   firebase deploy --only functions
   ```

8. **Start development server:**
   ```bash
   npm run dev
   ```

9. **Run tests:**
   ```bash
   npx vitest run
   ```

### Multi-User Testing

To test real-time collaboration:

1. Start the development server (`npm run dev`)
2. Open `http://localhost:5173` in multiple browser windows
3. Use different usernames in each window
4. Test cursor movement and rectangle creation/movement

### Firebase Database Rules

For development, use these rules in Firebase Console:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

## Project Structure

```
src/
├── config/          # Firebase configuration
├── services/        # Firebase service layer (canvas, cursor, AI agent)
├── contexts/        # React contexts (Auth, Canvas)
├── hooks/           # Custom React hooks (useCanvas, useCursors, useAIAgent)
├── components/      # React components
│   ├── auth/        # Authentication components
│   ├── canvas/      # Canvas-related components (Canvas, Rectangle, etc.)
│   ├── ai/          # AI Chat interface
│   ├── layout/      # Layout components
│   └── ui/          # UI components (Toast)
├── shared/          # Shared types (client + Cloud Functions)
└── utils/           # Utility functions and constants

functions/
├── src/
│   ├── index.ts           # Main Cloud Function (processAICommand)
│   ├── tools.ts           # AI tool definitions (6 tools)
│   ├── constants.ts       # Cloud Function constants
│   └── utils/
│       ├── systemPrompt.ts   # Dynamic AI prompt builder
│       └── rateLimiter.ts    # Quota management
└── package.json       # Cloud Functions dependencies

docs/
├── phase1/            # Phase 1 documentation (collaborative canvas)
└── phase2/            # Phase 2 documentation (AI agent)
    ├── ai-agent-mvp-prd.md    # Product requirements
    ├── tasks.md               # Task breakdown by PR
    ├── architecture.md        # System architecture
    ├── setup-guide.md         # Setup instructions
    ├── user-guide.md          # End-user documentation
    ├── testing-plan.md        # Testing strategy
    └── ai-development-log.md  # Development journal
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run emulators` - Start Firebase emulators (Functions + Database)
- `npm run functions:serve` - Serve Cloud Functions locally
- `npm run functions:deploy` - Deploy Cloud Functions only
- `npm run functions:logs` - View Cloud Functions logs

## Firebase Emulators (Local Testing)

The Firebase Emulators allow you to test Cloud Functions and Database Rules locally before deploying.

### Prerequisites

- Java Runtime Environment (JRE) installed
  ```bash
  # Install via Homebrew (macOS)
  brew install openjdk@17
  sudo ln -sfn $(brew --prefix)/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
  ```

### Starting the Emulators

```bash
# Start Functions and Database emulators
npm run emulators
```

The emulators will start on:
- **Functions:** `http://localhost:5001`
- **Database:** `http://localhost:9000`
- **Emulator UI:** `http://localhost:4000` (open this in your browser to see all emulators)

### Testing Cloud Functions

Regardless of how you test, you'll probably want to open the **Emulator UI** (`http://localhost:4000`) to view function logs.

**Option 1: Run test script**
```bash
node test-function.js
```

**Option 2: Test from your React app**

To connect your local React app to the emulators, set the environment variable:

```bash
# In your .env.local file
VITE_USE_EMULATORS=true
```

The app is already configured to connect to emulators when `VITE_USE_EMULATORS=true` is set in development mode.

Then:
1. Start the emulators: `npm run emulators`
2. In a separate terminal, start your React app: `npm run dev`
3. Open `http://localhost:5173` and test AI commands
4. The app will use local emulators instead of production Firebase
5. Remove or set `VITE_USE_EMULATORS=false` to use production

**Option 3: Emulator UI**

Open `http://localhost:4000` to:
- View function logs in real-time
- Inspect database data
- Manually trigger functions
- Monitor performance

## Deployment

### Production URL
🚀 **Live App:** `https://collab-canvas.web.app` *(will be available after deployment)*

### Deploy to Firebase Hosting

**Prerequisites:**
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project created and configured (see setup above)

**Deployment Steps:**

1. **Login to Firebase:**
   ```bash
   firebase login
   ```

2. **Initialize Firebase Hosting (if not done):**
   ```bash
   firebase init hosting
   # Select existing project
   # Public directory: dist
   # Single-page app: Yes
   # Overwrite index.html: No
   ```

3. **Build and Deploy:**
   ```bash
   # Build production version
   npm run build
   
   # Deploy to Firebase Hosting
   firebase deploy --only hosting
   ```

   **Alternative: GitHub Actions Deployment**
   
   The repository includes GitHub Action workflows that automatically deploy to Firebase on push to main. You can also deploy manually using a CI token:
   ```bash
   firebase login:ci  # Generate a CI token
   firebase deploy --token "$FIREBASE_TOKEN"
   ```

4. **Update Firebase Database Rules for Production:**
   
   Go to Firebase Console > Realtime Database > Rules and ensure the rules allow authenticated users to read and write data for the rectangles, cursors, and users nodes.

5. **Test Production Deployment:**
   - Open the deployed URL
   - Test with multiple browser tabs/devices
   - Verify real-time collaboration works
   - Check browser console for errors

**Deployment Configuration Files:**
- `firebase.json` - Firebase hosting configuration
- `.firebaserc` - Firebase project configuration  
- Both files are already configured and ready for deployment

## MVP Features

### Core Features
- ✅ Anonymous authentication with usernames
- ✅ Real-time cursor sharing with user names (24px font size)
- ✅ Rectangle creation and movement
- ✅ Rectangle selection and deselection (click to toggle)
- ✅ Canvas pan and zoom (trackpad/mouse wheel with intuitive direction)
- ✅ State persistence across page refreshes
- ✅ Multi-user real-time collaboration

### Advanced Features
- ✅ Rectangle resizing with 8-point handles
- ✅ Rectangle deletion (Delete/Backspace keys)
- ✅ Rectangle color customization (3 color options in header)
- ✅ Dynamic rectangle borders (darker shades of fill color)
- ✅ Exclusive selection logic (prevents conflicts between users)
- ✅ Active users list (shows all online collaborators)
- ✅ Toast notifications for selection conflicts
- ✅ Race condition protection for concurrent edits
- ✅ Selection state cleanup on user sign-out
- ✅ Admin override for rectangle management
- ✅ Professional UX with smooth interactions

### AI Agent Features (Phase 2)
- 🤖 Natural language canvas control via OpenAI GPT-4o
- 🎨 6 AI tools: create, change color, move, resize, delete, batch create
- 🔄 Multi-step commands (create + modify in one command)
- 🎯 Context-aware (understands viewport, selection state)
- 🛡️ Hybrid validation (AI + safety net)
- 📊 Rate limiting (1000 commands per user)
- ⚡ Real-time execution with instant sync
- 💬 User-friendly error messages with retry logic
- 🔒 Selection locking during AI processing
- 📦 Batch creation (up to 50 rectangles, 3 layouts)

## Using AI Commands

The AI Canvas Agent (bottom-right corner) allows you to control the canvas with natural language. Simply type a command and press Enter.

### Example Commands

**Create rectangles:**
```
"Create a blue rectangle"
"Add 5 red rectangles in a row"
"Make 10 green rectangles in a grid"
```

**Modify selected rectangle:**
```
"Make it bigger"
"Change color to red"
"Move it to the center"
"Resize it to 200 by 150"
"Delete it"
```

**Multi-step commands:**
```
"Create a blue rectangle and make it bigger"
"Add a red square in the center and move it up"
```

### Requirements

- **OpenAI API key** must be configured in Firebase Functions
- **Selection context** required for color, move, resize, delete commands
- **Command quota:** 1000 commands per user (lifetime)
- **Canvas limit:** AI commands stop working if canvas has >1000 rectangles

### Documentation

For detailed setup and usage:
- **Setup Guide:** `/docs/phase2/setup-guide.md`
- **User Guide:** `/docs/phase2/user-guide.md`
- **Architecture:** `/docs/phase2/architecture.md`
- **Testing Plan:** `/docs/phase2/testing-plan.md`

## Contributing

This is an MVP project with a 24-hour development timeline. Focus on core functionality over perfect code quality.
