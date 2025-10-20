# CollabCanvas

A real-time collaborative canvas application where multiple users can simultaneously create, edit, and manipulate shapes (rectangles, circles, lines, text) with AI-powered natural language control, comments, and advanced features like rotation, alignment, and lasso selection.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Canvas:** Konva.js (react-konva)
- **Backend:** Firebase Realtime Database + Firebase Auth + Cloud Functions
- **AI:** OpenAI GPT-4o via Vercel AI SDK
- **Testing:** Vitest + React Testing Library
- **Deployment:** Firebase Hosting

## Quick Start

> **📚 For detailed setup instructions, troubleshooting, and best practices, see [Setup Guide](docs/setup-guide.md)**
> 
> **🏗️ For system architecture, design patterns, and technical details, see [Architecture Documentation](docs/architecture.md)**

### Prerequisites

- Node.js (v22 or higher)
- Firebase account with Blaze (pay-as-you-go) plan
- OpenAI API account (for AI commands)

### Quick Installation

```bash
# 1. Clone and install
git clone <your-repo-url>
cd collab-canvas
npm install
cd functions && npm install && cd ..

# 2. Set up Firebase project (see Setup Guide for details)
# - Create Firebase project with Blaze plan
# - Enable Google Authentication
# - Enable Realtime Database
# - Get Firebase config and create .env.local

# 3. Configure OpenAI API key
firebase functions:config:set openai.key="sk-your-key-here"

# 4. Deploy security rules and functions
firebase deploy --only database,functions

# 5. Start development
npm run dev
```

**⚠️ Important:** This is a simplified quick start. See the [Setup Guide](docs/setup-guide.md) for:
- Detailed Firebase project configuration
- Environment variable setup
- Google Authentication configuration
- Local emulator setup (optional)
- Troubleshooting common issues

### Testing

```bash
# Run tests
npx vitest run

# Multi-user testing: open multiple browser windows
npm run dev  # then open http://localhost:5173 in multiple tabs
```

## Project Structure

```
src/
├── components/      # React components
│   ├── auth/        # Google Auth (SignInModal, UserProfileDropdown)
│   ├── canvas/      # All shape types (Rectangle, Circle, Line, Text, etc.)
│   ├── comments/    # Comments system (Panel, Bubble)
│   ├── ai/          # AI Chat interface
│   ├── layout/      # Header
│   └── ui/          # Reusable UI (Toast, ColorPicker, KeyboardShortcuts)
├── contexts/        # React contexts (Auth, Canvas, Comments, UserProfiles)
├── services/        # Firebase layer (canvas, cursor, comments, AI agent)
├── hooks/           # Custom hooks (useCanvas, useCursors, useAIAgent, useComments)
├── types/           # TypeScript definitions
├── utils/           # Helpers and constants
└── config/          # Firebase configuration

functions/src/       # Cloud Functions (AI agent + Auth triggers)
tests/               # Unit & integration tests (Vitest)
docs/                # Documentation
├── architecture.md  # System architecture (detailed)
├── setup-guide.md   # Setup instructions (detailed)
└── phase1-3/        # Phase-specific planning docs
```

> **See [Architecture Documentation](docs/architecture.md) for detailed component hierarchy, data flow, and design patterns.**

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npx vitest run` - Run tests (one-time)
- `npm run lint` - Run ESLint
- `npm run emulators` - Start Firebase emulators (optional, see Setup Guide)
- `firebase deploy` - Deploy everything (hosting + functions + rules)

## Features

### Phase 1: Collaborative Canvas
- ✅ Google Authentication with user profiles
- ✅ Real-time cursor sharing with names
- ✅ Multiple shape types: rectangles, circles, lines, text
- ✅ Shape manipulation: drag, resize, rotate, delete
- ✅ Canvas pan and zoom
- ✅ Multi-user real-time synchronization
- ✅ Exclusive selection (prevents edit conflicts)
- ✅ Active users list

### Phase 2: AI Agent
- 🤖 Natural language canvas control (OpenAI GPT-4o)
- 🎨 AI tools for all shape types
- 🔄 Multi-step commands
- 🎯 Context-aware (viewport, selection)
- 📊 Rate limiting (1000 commands per user)
- 💬 User-friendly error messages

### Phase 3: Advanced Features
- ✨ **Shapes:** Circles, lines, text (with formatting)
- 🎨 **Styling:** Color picker, text formatting (bold, italic, font size)
- 📐 **Alignment:** Align/distribute shapes (left, center, right, top, middle, bottom)
- 🔄 **Rotation:** Rotate all shape types with dropdown selector
- 🎯 **Lasso Selection:** Freehand multi-select
- 💬 **Comments:** Attach comments to shapes with unread indicators
- 🔐 **Security:** Production-grade database rules with field validation
- 👤 **Auth:** Google sign-in, user profiles, auth triggers

## Using AI Commands

The AI Canvas Agent (bottom-right corner) allows natural language canvas control:

**Example Commands:**
```
"Create a blue rectangle"
"Add 3 red circles in a row"
"Draw a line from the top left to bottom right"
"Add text that says Hello World"
"Make the selected shape bigger"
"Rotate it 45 degrees"
"Change color to red"
"Align all selected shapes to the left"
"Delete the selected shapes"
```

The AI understands:
- All shape types (rectangles, circles, lines, text)
- Multi-select operations
- Rotation, alignment, styling
- Viewport-relative positioning

**Quota:** 1000 commands per user (lifetime)

## Deployment

```bash
# Build and deploy everything
npm run build
firebase deploy

# Or deploy selectively
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only database
```

> **See [Setup Guide](docs/setup-guide.md) for detailed deployment instructions, monitoring, and troubleshooting.**

## Documentation

- **[Setup Guide](docs/setup-guide.md)** - Detailed installation, Firebase configuration, emulators, troubleshooting
- **[Architecture](docs/architecture.md)** - System design, data flow, component hierarchy, design patterns
- **[Phase Docs](docs/)** - Phase-specific planning, PRDs, and development logs

## Contributing

This project evolved from an MVP to a feature-rich collaborative canvas. See `docs/phase*/` for development history and design decisions.
