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

## Contributing

This is an MVP project with a 24-hour development timeline. Focus on core functionality over perfect code quality.
