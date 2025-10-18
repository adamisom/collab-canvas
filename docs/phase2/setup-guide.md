# Collab Canvas Setup Guide - AI Agent MVP

## Overview

This guide will walk you through setting up the Collab Canvas application with AI Agent capabilities, from initial installation to deployment.

---

## Prerequisites

### Required Software

1. **Node.js** (v22 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify installation: `git --version`

4. **Java Runtime Environment** (for Firebase Emulators)
   - **macOS (Homebrew):**
     ```bash
     brew install openjdk@17
     sudo ln -sfn $(brew --prefix)/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
     ```
   - **Windows/Linux:** Download from [Oracle](https://www.oracle.com/java/technologies/downloads/)

5. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version
   ```

### Required Accounts

1. **Firebase Account**
   - Sign up at [firebase.google.com](https://firebase.google.com/)
   - Free tier is sufficient for development

2. **OpenAI Account**
   - Sign up at [platform.openai.com](https://platform.openai.com/)
   - Required for AI agent functionality
   - Estimated cost: $0.002-0.005 per command

---

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd collab-canvas
```

### 2. Install Dependencies

**Install root dependencies:**
```bash
npm install
```

**Install Cloud Functions dependencies:**
```bash
cd functions
npm install
cd ..
```

### 3. Firebase Project Setup

#### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name (e.g., "collab-canvas")
4. Disable Google Analytics (optional for MVP)
5. Click "Create project"

#### Enable Firebase Services

**Authentication:**
1. Navigate to **Authentication** in the Firebase Console
2. Click "Get started"
3. Select **Anonymous** under "Sign-in method"
4. Toggle "Enable" and click "Save"

**Realtime Database:**
1. Navigate to **Realtime Database**
2. Click "Create database"
3. Select location (choose closest to your users)
4. Start in **Test mode** (we'll update rules later)
5. Click "Enable"

**Cloud Functions:**
1. Navigate to **Functions** in the Firebase Console
2. Click "Get started" (this enables the service)

#### Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Enter app nickname (e.g., "Collab Canvas Web")
5. Check "Also set up Firebase Hosting"
6. Click "Register app"
7. Copy the configuration object (you'll need these values)

### 4. Environment Configuration

**Create environment file:**
```bash
cp .env.example .env.local
```

**Edit `.env.local`** with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**For local emulator testing (optional):**
```env
VITE_USE_EMULATORS=true
```

### 5. OpenAI API Key Setup

**Get OpenAI API Key:**
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key (you won't be able to see it again!)

**Configure Firebase Functions:**
```bash
firebase functions:config:set openai.key="sk-your-actual-api-key-here"
```

**Verify configuration:**
```bash
firebase functions:config:get
```

You should see:
```json
{
  "openai": {
    "key": "sk-..."
  }
}
```

### 6. Firebase Initialization

**Login to Firebase:**
```bash
firebase login
```

**Initialize Firebase project (if not already done):**
```bash
firebase init
```

Select:
- ✅ Hosting
- ✅ Functions
- ✅ Database (Realtime Database)

Configuration:
- **Use existing project:** Select your project
- **Functions language:** TypeScript
- **Public directory:** `dist`
- **Single-page app:** Yes
- **Database rules:** `database.rules.json`

### 7. Deploy Database Security Rules

The project includes production-ready security rules in `database.rules.json`.

**Deploy rules:**
```bash
firebase deploy --only database
```

**Key rules:**
- Only authenticated users can read/write
- Users can only modify their own cursor
- AI command count is protected (atomic increment only)
- Collaborative editing allowed for rectangles

### 8. Deploy Cloud Functions

**Build and deploy:**
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

**Expected output:**
```
✔  functions: Finished running predeploy script.
✔  functions[processAICommand(us-central1)]: Successful create operation.
✔  Deploy complete!
```

**Important:** The first deployment may take 2-3 minutes.

---

## Verification

### 1. Verify Local Setup

**Start development server:**
```bash
npm run dev
```

**Expected output:**
```
  VITE v7.1.10  ready in 450 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Open browser:**
- Navigate to `http://localhost:5173`
- You should see the canvas application
- Enter a username and start creating rectangles

### 2. Test Firebase Connection

**Check browser console:**
- Open Developer Tools (F12)
- Console tab should show: "Firebase initialized successfully"
- No red errors about Firebase connection

**Test authentication:**
- Enter a username
- Check Firebase Console > Authentication > Users
- You should see an anonymous user

**Test database:**
- Create a rectangle on the canvas
- Go to Firebase Console > Realtime Database
- Navigate to `/rectangles`
- You should see your rectangle data

### 3. Test Cloud Functions

**Important:** Cloud Functions require deployment to work (emulators optional).

**Option A: Test with emulators (local):**
```bash
# Terminal 1: Start emulators
npm run emulators

# Terminal 2: Start dev server with emulator flag
VITE_USE_EMULATORS=true npm run dev
```

**Option B: Test with production (deployed):**
```bash
# Make sure functions are deployed
firebase deploy --only functions

# Start dev server normally
npm run dev
```

**Test AI command:**
1. Open the application
2. Find the "AI Canvas Agent" chat box (bottom-right)
3. Type: "Create a blue rectangle"
4. Click Submit or press Enter
5. You should see:
   - Loading spinner
   - Success message with green checkmark
   - Blue rectangle appears on canvas

**If AI command fails:**
- Check browser console for errors
- Check Firebase Console > Functions > Logs
- Verify OpenAI API key is configured: `firebase functions:config:get`
- Check your OpenAI account has available credits

---

## Local Development Workflow

### Daily Development

**1. Start development server:**
```bash
npm run dev
```

**2. Run tests (optional):**
```bash
npx vitest run
```

**3. Lint code (optional):**
```bash
npm run lint
```

### Testing Cloud Functions Locally

**1. Start emulators:**
```bash
npm run emulators
```

**2. In separate terminal, start dev server with emulator flag:**
```bash
VITE_USE_EMULATORS=true npm run dev
```

**3. Open Emulator UI:**
- Navigate to `http://localhost:4000`
- View function logs in real-time
- Inspect database data

**4. Test function:**
```bash
node test-function.js
```

**Emulator URLs:**
- Functions: `http://localhost:5001`
- Database: `http://localhost:9000`
- Emulator UI: `http://localhost:4000`

### Multi-User Testing

**Test real-time collaboration:**

1. Start dev server: `npm run dev`
2. Open `http://localhost:5173` in multiple browser windows
3. Use different usernames in each window
4. Test:
   - Cursor movement syncs across windows
   - Rectangle creation/movement syncs
   - Selection conflicts show toast notifications
   - AI commands work and sync to all users

**Tips:**
- Use private/incognito windows for separate users
- Test on different devices (phone, tablet)
- Test with slow network (Chrome DevTools > Network > Throttling)

---

## Deployment

### Prerequisites

- All installation steps completed
- Local testing successful
- Firebase project configured

### 1. Build Production Version

```bash
npm run build
```

**Expected output:**
```
vite v7.1.10 building for production...
✓ 207 modules transformed.
dist/index.html                   0.46 kB
dist/assets/index-*.css          13.47 kB
dist/assets/index-*.js          833.56 kB
✓ built in 825ms
```

**Verify build:**
```bash
npm run preview
```
Open `http://localhost:4173` to preview production build.

### 2. Deploy Everything

**Full deployment:**
```bash
firebase deploy
```

This deploys:
- ✅ Hosting (static site)
- ✅ Functions (AI agent)
- ✅ Database rules

**Selective deployment:**
```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# Deploy only database rules
firebase deploy --only database
```

### 3. Verify Production Deployment

**Get deployment URL:**
```bash
firebase hosting:sites:list
```

**Open production URL:**
- Navigate to your Firebase Hosting URL (e.g., `https://your-project.web.app`)
- Test all functionality:
  - ✅ Anonymous authentication
  - ✅ Rectangle creation/movement
  - ✅ Real-time collaboration (open in multiple tabs)
  - ✅ AI commands
  - ✅ Selection conflicts
  - ✅ Cursor tracking

**Check Firebase Console:**
- **Hosting:** Should show deployment timestamp
- **Functions:** Should show `processAICommand` deployed
- **Database:** Should show activity when using the app

### 4. Monitor Production

**View function logs:**
```bash
firebase functions:log
```

**Or in Firebase Console:**
- Navigate to Functions > Logs
- Filter by function name: `processAICommand`
- Check for errors

**Monitor costs:**
- Firebase Console > Usage and billing
- OpenAI Dashboard > Usage

---

## Troubleshooting

### Installation Issues

**"firebase: command not found"**
```bash
npm install -g firebase-tools
```

**"Unable to locate a Java Runtime"**
- Install Java (see Prerequisites section)
- Emulators won't work without Java

**"npm ERR! code EACCES"**
```bash
sudo npm install -g firebase-tools
```

### Configuration Issues

**"Firebase config not found"**
- Check `.env.local` file exists
- Verify all `VITE_FIREBASE_*` variables are set
- Restart dev server after changing `.env.local`

**"OpenAI API key not configured"**
```bash
# Set key
firebase functions:config:set openai.key="sk-..."

# Verify
firebase functions:config:get

# Redeploy
firebase deploy --only functions
```

**"Database permission denied"**
- Deploy database rules: `firebase deploy --only database`
- Check Firebase Console > Database > Rules
- Verify authentication is enabled

### Function Issues

**"Function not found: processAICommand"**
- Deploy functions: `firebase deploy --only functions`
- Wait 1-2 minutes for deployment to complete
- Check Firebase Console > Functions

**"AI service temporarily unavailable"**
- Check OpenAI API key is configured
- Verify OpenAI account has credits
- Check Firebase Functions logs for errors

**Cold start delay (first request slow)**
- Normal behavior for Cloud Functions
- First request after inactivity: 2-5 seconds
- Subsequent requests: <1 second
- Solution (paid): Set `minInstances: 1` in function config

### Runtime Issues

**Rectangles not syncing**
- Check Firebase Console > Database
- Verify data is being written
- Check browser console for errors
- Test with multiple browser windows

**Cursor not showing**
- Check browser console for errors
- Verify Firebase connection
- Check network tab for WebSocket connection

**AI commands failing**
- Check browser console for detailed error
- Check Firebase Functions logs
- Verify quota not exceeded (1000 commands per user)
- Test with simple command: "Create a blue rectangle"

---

## Best Practices

### Development

1. **Always run tests before committing:**
   ```bash
   npx vitest run
   npm run lint
   npm run build
   ```

2. **Use emulators for local testing:**
   - Saves Firebase costs
   - Faster iteration
   - Offline development

3. **Keep dependencies updated:**
   ```bash
   npm outdated
   npm update
   ```

### Production

1. **Monitor Firebase usage:**
   - Check Firebase Console > Usage and billing
   - Set up budget alerts

2. **Monitor OpenAI costs:**
   - Check OpenAI Dashboard > Usage
   - Set monthly spending limits

3. **Database backups:**
   - Firebase Console > Database > Backups
   - Set up automated backups

4. **Error monitoring:**
   - Check Firebase Functions logs regularly
   - Set up error alerts

### Security

1. **Protect API keys:**
   - Never commit `.env.local`
   - Never commit `.runtimeconfig.json`
   - Use Firebase Functions config for secrets

2. **Update database rules:**
   - Review `database.rules.json`
   - Test rules before deploying

3. **Rate limiting:**
   - Current limit: 1000 AI commands per user
   - Adjust in `src/utils/constants.ts` if needed

---

## Next Steps

After successful setup:

1. **Read the User Guide** - Learn how to use AI commands
2. **Read the Architecture Doc** - Understand the codebase
3. **Run integration tests** - Follow testing plan in `docs/phase2/testing-plan.md`
4. **Customize the app** - Modify colors, limits, features

---

## Support & Resources

### Documentation
- **Architecture:** `/docs/phase2/architecture.md`
- **User Guide:** `/docs/phase2/user-guide.md`
- **Testing Plan:** `/docs/phase2/testing-plan.md`
- **Development Log:** `/docs/phase2/ai-development-log.md`

### External Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Konva.js Documentation](https://konvajs.org/docs/)
- [React Documentation](https://react.dev/)

### Getting Help

1. Check browser console for errors
2. Check Firebase Functions logs
3. Review troubleshooting section above
4. Check GitHub issues (if applicable)
5. Review architecture documentation

---

## Summary Checklist

Before you start developing, ensure:

- ✅ Node.js, npm, Git, Java installed
- ✅ Firebase CLI installed and logged in
- ✅ Firebase project created
- ✅ Authentication (Anonymous) enabled
- ✅ Realtime Database created
- ✅ `.env.local` configured with Firebase config
- ✅ OpenAI API key obtained
- ✅ Functions config set with OpenAI key
- ✅ Database rules deployed
- ✅ Cloud Functions deployed
- ✅ Local dev server running successfully
- ✅ AI command tested and working
- ✅ Multi-user collaboration tested

**Congratulations!** You're ready to develop with Collab Canvas AI Agent MVP! 🎉

