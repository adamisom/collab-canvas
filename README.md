# CollabCanvas MVP

A real-time collaborative canvas application where multiple users can simultaneously create, move, and manipulate rectangles while seeing each other's cursors and changes in real-time.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Canvas:** Konva.js (react-konva)
- **Backend:** Firebase Realtime Database + Firebase Auth
- **Testing:** Vitest + React Testing Library
- **Deployment:** Firebase Hosting

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

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

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Run tests:**
   ```bash
   npm test
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
├── services/        # Firebase service layer
├── contexts/        # React contexts (Auth, Canvas)
├── hooks/           # Custom React hooks
├── components/      # React components
│   ├── auth/        # Authentication components
│   ├── canvas/      # Canvas-related components
│   └── layout/      # Layout components
└── utils/           # Utility functions and constants
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Deployment

Will be deployed to Firebase Hosting. Instructions coming in a later phase.

## MVP Features

- ✅ Anonymous authentication with usernames
- ✅ Real-time cursor sharing
- ✅ Rectangle creation and movement
- ✅ Canvas pan and zoom
- ✅ State persistence
- ✅ Multi-user collaboration

## Contributing

This is an MVP project with a 24-hour development timeline. Focus on core functionality over perfect code quality.
