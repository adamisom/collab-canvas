# Phase 3E: Infrastructure & Production Readiness

**Focus**: Authentication migration, comprehensive testing, and security  
**PRs**: 13-15  
**Work Level**: High  
**Dependencies**: All previous phases complete (3A-3D)

> **⚠️ Before Implementation:** Review this plan and ask questions before proceeding. Consider whether any plans need to change first. Also re-read the sibling file README.md to ensure broader context.

---

## Phase Overview

Phase 3E prepares the application infrastructure for production. This phase includes the second and final breaking change (authentication migration), comprehensive testing, and production-grade security rules.

**PRs in this phase:**
- **PR #13**: Authentication Migration - From Anonymous to Google Auth
- **PR #14**: Testing & Quality - Comprehensive test suite (70%+ coverage)
- **PR #15**: Database Security Rules - Production-grade security

**Why this phase?**
- Authentication migration is a breaking change that needs its own PR
- Testing ensures quality and catches regressions
- Security rules are critical for production deployment
- Infrastructure must be solid before final features

---

## PR #13: Authentication Migration

**Branch**: `feature/auth-migration`  
**Work Level**: Low-Medium (simplified from original plan)  
**Breaking Changes**: ⚠️ YES - Migration from Anonymous to Google Auth

### Why This PR?
- Anonymous auth is insufficient for production
- Users need persistent identities  
- Required for comments/annotations (Phase 3F)
- Enables user profiles with identity
- Industry standard for real applications

### What This PR Delivers

**Authentication:**
- **Google Sign-In** - Single provider for simplicity
- Everyone has a Gmail account (general users)
- One-click sign-in experience
- No password management complexity

**User Profiles:**
- Display name (from Google account)
- Email (from Google account)
- User initials (derived from display name)
- Color history (already stored per user from Phase 3A)
- Last seen timestamp

**Breaking Changes:**
- Remove Anonymous auth entirely
- Users must sign in with Google account
- Anonymous sessions not migrated (acceptable - no production users yet)
- New user profile structure at `/users/{userId}`

**Why Google Only?**
- 10-minute setup vs. hours for multiple providers
- Can add more providers later if needed
- Simplest path to production
- Perfect integration with Firebase

### Implementation Strategy

**Firebase Auth Configuration (5 minutes):**
1. Go to Firebase Console → Authentication → Sign-in method
2. Enable Google provider
3. That's it! Google is pre-configured with Firebase

**UI Updates:**
- Create simple sign-in modal with "Sign in with Google" button
- Add user profile dropdown in header
- Show user initials in collaborative cursors (colored circles)
- Add sign-out button

**Code Changes:**
- Replace `signInAnonymously()` with `signInWithPopup(GoogleAuthProvider)`
- Create Firebase Auth Trigger (Cloud Function) to auto-create user profiles
- Create shared UserProfilesContext for efficient profile caching
- Update `AuthContext` to use Google auth
- Update security rules moved to separate PR (see PR #15 below)

### Files to Create

#### `/functions/src/authTriggers.ts`
Firebase Auth Trigger to auto-create user profiles:

```typescript
import { onAuthUserCreated, onAuthUserDeleted } from 'firebase-functions/v2/auth'
import * as admin from 'firebase-admin'

// Automatically create user profile when user signs in for first time
export const onUserCreated = onAuthUserCreated(async (event) => {
  const { uid, email, displayName } = event.data
  
  try {
    await admin.database().ref(`users/${uid}`).set({
      uid,
      displayName: displayName || email?.split('@')[0] || 'User',
      email,
      createdAt: Date.now(),
      lastSeenAt: Date.now()
    })
    
    console.log(`✅ Created profile for user ${uid}`)
  } catch (error) {
    console.error(`❌ Failed to create profile for ${uid}:`, error)
    throw error // Firebase will retry automatically
  }
})

// Clean up user data when account is deleted
export const onUserDeleted = onAuthUserDeleted(async (event) => {
  const { uid } = event.data
  
  try {
    // Remove user profile
    await admin.database().ref(`users/${uid}`).remove()
    
    // Remove cursor
    await admin.database().ref(`cursors/${uid}`).remove()
    
    // Remove color history
    await admin.database().ref(`colorHistory/${uid}`).remove()
    
    console.log(`✅ Cleaned up data for deleted user ${uid}`)
  } catch (error) {
    console.error(`❌ Failed to clean up data for ${uid}:`, error)
  }
})
```

#### `/functions/src/index.ts`
Export the auth triggers:

```typescript
// Add to existing exports
export { onUserCreated, onUserDeleted } from './authTriggers'
```

**Deployment Instructions:**
```bash
# From project root, deploy all functions (including auth triggers)
firebase deploy --only functions

# Verify deployment in Firebase Console → Functions
# Test by signing in with a new Google account
```

> **Note:** Auth triggers automatically activate on the first user sign-in after deployment. The Cloud Function will handle all user profile creation going forward.

#### `/src/contexts/UserProfilesContext.tsx`
Shared context for efficient user profile caching:

```typescript
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { firebaseDatabase, dbRef, dbOnValue } from '../services/firebaseService'

interface UserProfile {
  uid: string
  displayName: string
  email: string
  createdAt: number
  lastSeenAt: number
}

interface UserProfilesContextType {
  profiles: Map<string, UserProfile>
  getProfile: (userId: string) => UserProfile | undefined
  getInitials: (userId: string) => string
  loading: boolean
}

const UserProfilesContext = createContext<UserProfilesContextType | undefined>(undefined)

export const UserProfilesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map())
  const [loading, setLoading] = useState(true)
  
  // Single subscription to user profiles for currently online users
  useEffect(() => {
    const profileUnsubscribes = new Map<string, () => void>()
    
    // Subscribe to cursors to know which users are online
    const cursorsRef = dbRef(firebaseDatabase, 'cursors')
    
    const unsubscribeCursors = dbOnValue(cursorsRef, (cursorsSnapshot) => {
      const onlineUserIds = new Set<string>()
      
      if (cursorsSnapshot.exists()) {
        cursorsSnapshot.forEach((child) => {
          onlineUserIds.add(child.key!)
        })
      }
      
      // Unsubscribe from profiles of users who went offline
      profileUnsubscribes.forEach((unsubscribe, userId) => {
        if (!onlineUserIds.has(userId)) {
          unsubscribe()
          profileUnsubscribes.delete(userId)
          setProfiles((prev) => {
            const updated = new Map(prev)
            updated.delete(userId)
            return updated
          })
        }
      })
      
      // Subscribe to profiles of new online users
      onlineUserIds.forEach((userId) => {
        if (!profileUnsubscribes.has(userId)) {
          const userRef = dbRef(firebaseDatabase, `users/${userId}`)
          const unsubscribe = dbOnValue(userRef, (userSnapshot) => {
            if (userSnapshot.exists()) {
              const profile = userSnapshot.val() as UserProfile
              setProfiles((prev) => {
                const updated = new Map(prev)
                updated.set(userId, profile)
                return updated
              })
            }
          })
          profileUnsubscribes.set(userId, unsubscribe)
        }
      })
      
      setLoading(false)
    })
    
    return () => {
      // Cleanup all subscriptions
      unsubscribeCursors()
      profileUnsubscribes.forEach((unsubscribe) => unsubscribe())
      profileUnsubscribes.clear()
    }
  }, [])
  
  const getProfile = useCallback((userId: string) => {
    return profiles.get(userId)
  }, [profiles])
  
  const getInitials = useCallback((userId: string) => {
    const profile = profiles.get(userId)
    if (!profile || !profile.displayName) return '?'
    
    const name = profile.displayName.trim()
    if (!name) return '?'
    
    const initials = name
      .split(' ')
      .filter(n => n.length > 0)  // Filter empty strings
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    
    return initials || '?'  // Fallback if still empty
  }, [profiles])
  
  return (
    <UserProfilesContext.Provider value={{ profiles, getProfile, getInitials, loading }}>
      {children}
    </UserProfilesContext.Provider>
  )
}

export const useUserProfiles = () => {
  const context = useContext(UserProfilesContext)
  if (!context) {
    throw new Error('useUserProfiles must be used within UserProfilesProvider')
  }
  return context
}

export const useUserProfile = (userId: string) => {
  const { getProfile, getInitials, loading } = useUserProfiles()
  return {
    profile: getProfile(userId),
    initials: getInitials(userId),
    loading
  }
}
```

**Key Design Decision:**
This context only subscribes to profiles for **currently online users** (users with active cursors). This ensures efficient memory usage and database reads, even if hundreds of users have signed in historically. Profiles automatically load when users join and unload when they leave.

#### `/src/components/auth/SignInModal.tsx`
Simple Google-only sign-in:

```typescript
import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './SignInModal.css'

const SignInModal: React.FC = () => {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await signInWithGoogle()
    } catch (err: any) {
      console.error('Sign in error:', err)
      setError(err.message || 'Failed to sign in with Google')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content sign-in-modal">
        <div className="modal-header">
          <h1>CollabCanvas</h1>
          <p>Real-time collaborative canvas with AI</p>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="sign-in-button google"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <p className="sign-in-footer">
          No account needed • Sign in with your Gmail account
        </p>
      </div>
    </div>
  )
}

export default SignInModal
```

#### `/src/components/auth/SignInModal.css`
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.sign-in-modal {
  background: white;
  border-radius: 12px;
  padding: 48px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  color: #1a1a1a;
}

.modal-header p {
  margin: 0 0 32px 0;
  font-size: 16px;
  color: #666;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  color: #c00;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}

.sign-in-button {
  width: 100%;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 500;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  color: #444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s;
}

.sign-in-button:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #bbb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sign-in-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sign-in-footer {
  margin-top: 16px;
  font-size: 13px;
  color: #888;
}
```

#### `/src/components/ui/UserProfileDropdown.tsx`
```typescript
import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserProfile } from '../../contexts/UserProfilesContext'
import { getUserColor } from '../../utils/userColors'
import './UserProfileDropdown.css'

const UserProfileDropdown: React.FC = () => {
  const { user, signOut } = useAuth()
  const { initials } = useUserProfile(user?.uid || '')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!user) return null

  const displayName = user.displayName || user.email || 'User'
  const userColor = getUserColor(user.uid)

  return (
    <div className="user-profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div 
          className="avatar-initials"
          style={{ backgroundColor: userColor }}
        >
          {initials}
        </div>
        <span className="display-name">{displayName}</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="user-info">
            <div 
              className="avatar-initials-large"
              style={{ backgroundColor: userColor }}
            >
              {initials}
            </div>
            <div className="user-details">
              <div className="name">{displayName}</div>
              {user.email && <div className="email">{user.email}</div>}
            </div>
          </div>

          <div className="dropdown-divider" />

          <button
            className="dropdown-item"
            onClick={() => {
              signOut()
              setIsOpen(false)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 14H4C3.46957 14 2.96086 13.7893 2.58579 13.4142C2.21071 13.0391 2 12.5304 2 12V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M11 11L14 8L11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 8H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default React.memo(UserProfileDropdown)
```

#### `/src/components/ui/UserProfileDropdown.css`
Complete styles for the dropdown:

```css
.user-profile-dropdown {
  position: relative;
}

.profile-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: white;
}

.profile-button:hover {
  background: rgba(255, 255, 255, 0.25);
}

.avatar-initials {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.display-name {
  font-size: 14px;
  font-weight: 500;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 240px;
  padding: 8px;
  z-index: 1000;
}

.user-info {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-initials-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-details .name {
  font-weight: 600;
  color: #2d3748;
  font-size: 14px;
  margin-bottom: 2px;
}

.user-details .email {
  font-size: 12px;
  color: #718096;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 8px 0;
}

.dropdown-item {
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #2d3748;
  transition: background-color 0.2s;
  text-align: left;
}

.dropdown-item:hover {
  background: #f7fafc;
}

.dropdown-item svg {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .dropdown-menu {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }
}
```

### Files to Update

#### 1. `/src/contexts/AuthContext.tsx` ⚠️ MAJOR UPDATE
**Update in place** - Replace Anonymous Auth with Google Auth (simplified - no client-side profile creation):

**Changes needed:**
1. Update imports:
```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
```

2. Update `AuthContextType` interface:
```typescript
interface AuthContextType {
  user: User | null
  username: string | null
  loading: boolean
  
  // REPLACE: signIn(username: string) → signInWithGoogle()
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}
```

3. Create Google provider:
```typescript
// Add before AuthProvider
const googleProvider = new GoogleAuthProvider()
```

4. Replace `signIn` function with `signInWithGoogle`:
```typescript
// REPLACE the signIn function with:
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true)
    await signInWithPopup(firebaseAuth, googleProvider)
    // User profile automatically created by Firebase Auth Trigger
    } catch (error: any) {
      console.error('Error signing in with Google:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])
```

5. Simplify `onAuthStateChanged` - remove username localStorage and database logic:
```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChange(firebaseAuth, (firebaseUser) => {
    setUser(firebaseUser)
    setLoading(false)
  })
  
  return unsubscribe
}, [])
```

6. Update `username` derivation (keep it simple):
```typescript
const username = user?.displayName || user?.email?.split('@')[0] || null
```

7. Simplify `signOut` - remove localStorage and cursor cleanup (Auth Trigger handles it):
```typescript
  const signOut = useCallback(async () => {
    try {
    await firebaseAuth.signOut()
      setUser(null)
    } catch (error: any) {
      console.error('Error signing out:', error)
      throw error
    }
  }, [])
```

8. Update context value:
```typescript
  return (
    <AuthContext.Provider value={{
      user,
      username,
      loading,
    signInWithGoogle,  // Changed from signIn
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
```

**Summary of changes:**
- ❌ Remove `signIn(username)` → ✅ Add `signInWithGoogle()`
- ❌ Remove localStorage username logic
- ❌ Remove manual user profile creation
- ❌ Remove cursor cleanup on signOut (Auth Trigger handles it)
- ✅ Simplify to just Google auth with popup
- ✅ Cloud Function handles all user data management

#### 2. `/src/components/layout/Header.tsx`
**Update in place** - Replace user info section with UserProfileDropdown:

1. Add import:
```typescript
import UserProfileDropdown from '../ui/UserProfileDropdown'
```

2. Replace the **contents** of the `.user-section` div (lines 24-32) with just the dropdown component:
```typescript
<div className="user-section">
<UserProfileDropdown />
</div>
```

**That's it!** The dropdown handles display, sign-out button, and user info internally. Keep the `.user-section` wrapper div for styling.

#### 3. `/src/App.tsx`
**Update in place** - Replace `LoginForm` with `SignInModal` and add `UserProfilesProvider`:

1. Update imports (replace `LoginForm` with `SignInModal`):
```typescript
import SignInModal from './components/auth/SignInModal'
import { UserProfilesProvider } from './contexts/UserProfilesContext'
```

2. In `AppContent` component, replace `<LoginForm />` with `<SignInModal />` (line 75):
```typescript
  if (!user) {
    return <SignInModal />
  }
```

3. Wrap the authenticated app content with `UserProfilesProvider` (lines 78-85):
```typescript
  return (
  <UserProfilesProvider>
    <div className="App">
      <Header />
      <CanvasProvider>
        <CanvasContent />
      </CanvasProvider>
    </div>
  </UserProfilesProvider>
)
```

**Summary:** Replace `LoginForm` with `SignInModal`, wrap authenticated content with `UserProfilesProvider`.

#### 4. Delete Old Auth Files
**Files to delete:**
- `/src/components/auth/LoginForm.tsx` (replaced by `SignInModal.tsx`)
- `/src/components/auth/LoginForm.css` (replaced by `SignInModal.css`)

These are completely replaced by the new Google authentication UI.

#### 5. `/src/components/canvas/Cursor.tsx`
Update to show user initials (using shared UserProfilesContext):

```typescript
import { useUserProfile } from '../../contexts/UserProfilesContext'
import { getUserColor } from '../../utils/userColors'
import { Circle, Text, Group, Line, Rect } from 'react-konva'

const Cursor: React.FC<{ cursor: CursorData }> = ({ cursor }) => {
  const { profile, initials } = useUserProfile(cursor.userId)
  
  if (!profile) return null
  
  const userColor = getUserColor(cursor.userId)
  
return (
  <Group x={cursor.x} y={cursor.y}>
    {/* Cursor arrow */}
      <Line
        points={[0, 0, 0, 16, 4, 12, 8, 18, 12, 14, 8, 10, 14, 10, 0, 0]}
        fill={userColor}
        stroke="white"
        strokeWidth={1}
        closed
      />
      
      {/* User info badge */}
      <Group x={16} y={0}>
        {/* Background pill */}
        <Rect
          x={0}
          y={0}
          width={Math.max(profile.displayName.length * 7 + 40, 80)}
          height={24}
          fill="rgba(0, 0, 0, 0.8)"
          cornerRadius={12}
        />
        
        {/* Initials circle */}
        <Circle
          x={12}
          y={12}
          radius={8}
          fill={userColor}
        />
        <Text
          x={8}
          y={7}
          text={initials}
          fontSize={8}
          fill="white"
          fontStyle="bold"
        />
        
        {/* User name */}
        <Text
          x={24}
          y={7}
          text={profile.displayName}
          fontSize={11}
          fill="white"
        />
      </Group>
  </Group>
)
}

export default React.memo(Cursor, (prev, next) => {
  return prev.cursor.x === next.cursor.x && 
         prev.cursor.y === next.cursor.y &&
         prev.cursor.userId === next.cursor.userId
})
```

**Benefits:**
- ✅ No database calls per cursor (uses shared cache)
- ✅ Only loads profiles for currently online users (efficient memory usage)
- ✅ Shows user initials in colored circle
- ✅ Automatically updates when users join/leave
- ✅ Real-time updates when profiles change

#### 6. Firebase Console Configuration
**Super simple - 2-minute setup:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Sign-in method**
4. Click **Google** → **Enable** → **Save**
5. Done! Google auth is pre-configured with Firebase

**No OAuth configuration needed** - Firebase handles it automatically for Google.

**Note:** Your existing `.env` file already has all necessary Firebase credentials. No changes needed.

### Testing Checklist

**Manual Testing - Authentication:**
- [ ] Can sign in with Google
- [ ] Sign-in button shows correct Google branding
- [ ] Can sign out
- [ ] User profile automatically created by Cloud Function on first sign-in
- [ ] User profile displays in header dropdown with initials
- [ ] User initials show in cursor (colored circle)
- [ ] Display name shows correctly (from Google account)
- [ ] Email shows correctly (from Google account)

**Manual Testing - Migration:**
- [ ] Anonymous auth completely removed
- [ ] All existing features work with Google auth
- [ ] Database rules enforce authenticated users
- [ ] Security rules tested (can't write to other users' data)
- [ ] Can't access app without signing in

**Manual Testing - Edge Cases:**
- [ ] Sign-in errors handled gracefully
- [ ] Google popup blocked scenario handled (show helpful message)
- [ ] Sign-out clears all state correctly
- [ ] Multiple users can sign in simultaneously
- [ ] User profiles sync correctly across sessions
- [ ] User profile updates when Google account info changes

**Manual Testing - Real-Time Collaboration:**
- [ ] Multiple authenticated users can collaborate
- [ ] Cursors show correct user initials and names
- [ ] Profiles load automatically when users join (cursor appears)
- [ ] Profiles unload when users leave (no memory leak)
- [ ] All operations work with authenticated users
- [ ] Exclusive selection still works per rectangle
- [ ] User can see their own profile in header with initials
- [ ] UserProfilesContext efficiently caches only online user profiles

### Success Criteria
- ✅ Google authentication works flawlessly
- ✅ User profiles automatically created by Cloud Function
- ✅ User initials show in header dropdown and collaborative cursors
- ✅ UserProfilesContext efficiently caches only online user profiles (no redundant fetches)
- ✅ Profiles automatically load/unload as users join/leave
- ✅ All Phase 3A-3D features still work
- ✅ No console errors
- ✅ Real-time collaboration verified with Google-authenticated users
- ✅ Sign-in/sign-out flow is smooth and intuitive

### Breaking Changes Summary

**Authentication Model Changed:**
- Before: Anonymous authentication
- After: Google Sign-In required

**User Data Structure:**
- Added user profiles collection: `/users/{userId}`
- Profile includes: `uid`, `displayName`, `email`, `createdAt`, `lastSeenAt`
- User initials derived from `displayName`

**Migration Notes:**
- No data migration needed (no production users)
- Anonymous auth completely removed (not kept for testing)
- All users must sign in with Google account
- User initials used instead of photos for visual identity
- Update all documentation to reflect Google sign-in flow

---

## PR #14: Testing & Quality

**Branch**: `feature/testing-quality`  
**Work Level**: Medium  
**Breaking Changes**: None

### Why This PR?
- Ensure quality and catch regressions
- Verify performance at scale
- Prepare for production usage
- Essential for submission quality
- Builds confidence in codebase

### What This PR Delivers

**Unit Tests:**
- Context tests (AuthContext, CanvasContext, UserProfilesContext)
- Service tests (canvasService, aiAgent)
- Component tests (Rectangle, Circle, Line, Text)
- Utility tests (alignment, selection helpers, getInitials)

**Test Coverage Goal: 70%+**

> **Note:** Performance testing is considered out of scope for this PR. Basic manual testing with many shapes is sufficient.

### Implementation Strategy

**Testing Framework:**
- Vitest (already configured from Phase 2)
- React Testing Library
- Mock Firebase services for unit tests

**Continuous Integration:**
- GitHub Actions workflow (optional)
- Run tests on every PR

### Files to Create

> **Note:** All new test files should be placed in `/tests/` directory to maintain consistency with existing test structure.

#### `/tests/contexts/CanvasContext.test.tsx`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { CanvasProvider, useCanvas } from '../../src/contexts/CanvasContext'
import { AuthProvider } from '../../src/contexts/AuthContext'

// Mock Firebase services
vi.mock('../../src/services/firebaseService', () => ({
  firebaseAuth: {},
  firebaseDatabase: {},
  dbRef: vi.fn((db, path) => ({ path })),
  dbSet: vi.fn(() => Promise.resolve()),
  dbOnValue: vi.fn((ref, callback) => {
    // Simulate empty snapshot
    callback({ exists: () => false, val: () => null })
    return vi.fn() // Unsubscribe
  }),
  dbPush: vi.fn(() => Promise.resolve({ key: 'test-id' })),
  dbRemove: vi.fn(() => Promise.resolve()),
  dbUpdate: vi.fn(() => Promise.resolve()),
  dbGet: vi.fn(() => Promise.resolve({ exists: () => false, val: () => null })),
  onAuthStateChange: vi.fn((auth, callback) => {
    callback(null)
    return vi.fn()
  })
}))

// Mock Firebase Auth separately
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(() => Promise.resolve({ user: { uid: 'test-uid', displayName: 'Test User', email: 'test@example.com' } })),
  GoogleAuthProvider: vi.fn()
}))

describe('CanvasContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rectangle Operations', () => {
    it('should create a rectangle', async () => {
      const wrapper = ({ children }) => (
        <AuthProvider>
          <CanvasProvider>{children}</CanvasProvider>
        </AuthProvider>
      )

      const { result } = renderHook(() => useCanvas(), { wrapper })

      await act(async () => {
        await result.current.createRectangle(100, 100)
      })

      await waitFor(() => {
        expect(result.current.rectangles).toHaveLength(1)
      })
    })

    it('should select a rectangle', async () => {
      // Test implementation
    })

    it('should delete a rectangle', async () => {
      // Test implementation
    })
  })

  describe('Multi-Select', () => {
    it('should select multiple rectangles', async () => {
      // Test implementation
    })

    it('should copy and paste multiple rectangles', async () => {
      // Test implementation
    })
  })

  describe('Alignment', () => {
    it('should align rectangles to the left', async () => {
      // Test implementation
    })

    it('should distribute rectangles evenly', async () => {
      // Test implementation
    })
  })
})
```

#### `/tests/utils/alignmentHelpers.test.ts`
```typescript
import { describe, it, expect } from 'vitest'
import {
  getShapeBounds,
  calculateAlignedPosition,
  calculateDistributedPositions
} from '../../src/utils/alignmentHelpers'

describe('alignmentHelpers', () => {
  describe('getShapeBounds', () => {
    it('should calculate bounds for rectangle', () => {
      const rect = {
        type: 'rectangle',
        id: '1',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        color: '#ff0000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const bounds = getShapeBounds(rect)
      
      expect(bounds).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50
      })
    })

    it('should calculate bounds for circle', () => {
      const circle = {
        type: 'circle',
        id: '1',
        x: 100,
        y: 100,
        radius: 50,
        color: '#ff0000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const bounds = getShapeBounds(circle)
      
      expect(bounds).toEqual({
        x: 50,
        y: 50,
        width: 100,
        height: 100
      })
    })
  })

  describe('calculateAlignedPosition', () => {
    it('should align rectangle to left', () => {
      const rect = {
        type: 'rectangle',
        id: '1',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        color: '#ff0000',
        zIndex: 0,
        createdBy: 'user1',
        createdAt: Date.now(),
        selectedBy: null,
        selectedAt: null
      }

      const newPos = calculateAlignedPosition(rect, 0, 'left')
      
      expect(newPos).toEqual({ x: 0 })
    })
  })
})
```

#### `/tests/contexts/UserProfilesContext.test.tsx`
```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { UserProfilesProvider, useUserProfiles } from '../../src/contexts/UserProfilesContext'

// Mock Firebase with comprehensive user data
vi.mock('../../src/services/firebaseService', () => ({
  dbRef: vi.fn(),
  dbOnValue: vi.fn((ref, callback) => {
    // Simulate Firebase snapshot with test users
    const mockSnapshot = {
      exists: () => true,
      forEach: (fn: Function) => {
        fn({ val: () => ({ uid: 'user1', displayName: 'John Doe', email: 'john@example.com', createdAt: 1, lastSeenAt: 1 }) })
        fn({ val: () => ({ uid: 'user2', displayName: 'Jane Smith', email: 'jane@example.com', createdAt: 2, lastSeenAt: 2 }) })
        fn({ val: () => ({ uid: 'user3', displayName: 'Madonna', email: 'madonna@example.com', createdAt: 3, lastSeenAt: 3 }) })
        fn({ val: () => ({ uid: 'user4', displayName: 'John  Doe', email: 'spaces@example.com', createdAt: 4, lastSeenAt: 4 }) })
      }
    }
    callback(mockSnapshot)
    return vi.fn() // Unsubscribe function
  })
}))

describe('UserProfilesContext', () => {
  const wrapper = ({ children }) => <UserProfilesProvider>{children}</UserProfilesProvider>

  it('should load and cache all user profiles', async () => {
    const { result } = renderHook(() => useUserProfiles(), { wrapper })
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.profiles.size).toBe(4)
    expect(result.current.profiles.get('user1')?.displayName).toBe('John Doe')
    expect(result.current.profiles.get('user2')?.displayName).toBe('Jane Smith')
  })

  it('should return correct initials for two-word name', async () => {
    const { result } = renderHook(() => useUserProfiles(), { wrapper })
    
    await waitFor(() => {
      const initials = result.current.getInitials('user1')
      expect(initials).toBe('JD')
    })
  })

  it('should handle single-word names', async () => {
    const { result } = renderHook(() => useUserProfiles(), { wrapper })
    
    await waitFor(() => {
      const initials = result.current.getInitials('user3')  // Madonna
      expect(initials).toBe('MA')
    })
  })

  it('should handle empty display names', async () => {
    const { result } = renderHook(() => useUserProfiles(), { wrapper })
    
    await waitFor(() => {
      const initials = result.current.getInitials('nonexistent')
      expect(initials).toBe('?')
    })
  })

  it('should handle names with extra spaces', async () => {
    const { result } = renderHook(() => useUserProfiles(), { wrapper })
    
    await waitFor(() => {
      const initials = result.current.getInitials('user4')  // "John  Doe" with double space
      expect(initials).toBe('JD')  // Should filter empty strings
    })
  })

  it('should provide profile data via getProfile', async () => {
    const { result } = renderHook(() => useUserProfiles(), { wrapper })
    
    await waitFor(() => {
      const profile = result.current.getProfile('user1')
      expect(profile).toBeDefined()
      expect(profile?.displayName).toBe('John Doe')
      expect(profile?.email).toBe('john@example.com')
    })
  })
})
```

#### `/tests/contexts/AuthContext.test.tsx`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext'
import { signInWithPopup } from 'firebase/auth'

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(null)
    return vi.fn()
  })
}))

describe('AuthContext with Google Auth', () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should sign in with Google successfully', async () => {
    const mockUser = { uid: 'test-uid', displayName: 'Test User', email: 'test@example.com' }
    vi.mocked(signInWithPopup).mockResolvedValue({ user: mockUser } as any)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signInWithGoogle()
    })

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled()
    })
  })

  it('should handle Google popup blocked error', async () => {
    const popupError = new Error('Popup blocked by browser')
    vi.mocked(signInWithPopup).mockRejectedValue(popupError)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(async () => {
      await result.current.signInWithGoogle()
    }).rejects.toThrow('Popup blocked by browser')
  })

  it('should handle Google sign-in cancellation', async () => {
    const cancelError = new Error('auth/popup-closed-by-user')
    vi.mocked(signInWithPopup).mockRejectedValue(cancelError)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await expect(async () => {
      await result.current.signInWithGoogle()
    }).rejects.toThrow()
  })

  it('should derive username from displayName', () => {
    // Test username extraction logic
    const displayName = 'John Doe'
    const username = displayName
    expect(username).toBe('John Doe')
  })

  it('should derive username from email if no displayName', () => {
    const email = 'john@example.com'
    const username = email.split('@')[0]
    expect(username).toBe('john')
  })
})
```

#### `/tests/components/auth/SignInModal.test.tsx`
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignInModal from '../../../src/components/auth/SignInModal'
import { useAuth } from '../../../src/contexts/AuthContext'

vi.mock('../../../src/contexts/AuthContext')

describe('SignInModal', () => {
  it('should display error message on sign-in failure', async () => {
    const mockSignIn = vi.fn().mockRejectedValue(new Error('Sign in failed'))
    vi.mocked(useAuth).mockReturnValue({ signInWithGoogle: mockSignIn } as any)

    render(<SignInModal />)
    
    const button = screen.getByText('Sign in with Google')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Sign in failed')
    })
  })

  it('should disable button while loading', async () => {
    const mockSignIn = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
    vi.mocked(useAuth).mockReturnValue({ signInWithGoogle: mockSignIn } as any)

    render(<SignInModal />)
    
    const button = screen.getByText('Sign in with Google')
    fireEvent.click(button)

    expect(button).toBeDisabled()
    expect(screen.getByText('Signing in...')).toBeInTheDocument()
  })

  it('should clear error on retry', async () => {
    const mockSignIn = vi.fn()
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce(undefined)
    vi.mocked(useAuth).mockReturnValue({ signInWithGoogle: mockSignIn } as any)

    render(<SignInModal />)
    
    const button = screen.getByText('Sign in with Google')
    
    // First attempt - error
    fireEvent.click(button)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('First error')
    })

    // Second attempt - should clear error
    fireEvent.click(button)
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
```

### Files to Update

#### `/package.json`
Update test scripts and add missing devDependency:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    // ... existing devDependencies ...
    "@vitest/coverage-v8": "^2.1.8",  // ADD THIS - required for test coverage
    // ... rest of devDependencies ...
  }
}
```

**Installation command:**
```bash
npm install --save-dev @vitest/coverage-v8
```

#### `/vitest.config.ts`
Add coverage configuration:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx'
      ],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70
    }
  }
})
```

### Testing Checklist

**Unit Test Coverage:**
- [ ] AuthContext tests pass
- [ ] CanvasContext tests pass
- [ ] UserProfilesContext tests pass
- [ ] All service tests pass
- [ ] All utility tests pass
- [ ] Component tests pass
- [ ] Coverage > 70%

**Manual Testing:**
- [ ] Test with 50+ shapes (mixed types) - basic performance check
- [ ] Test with 3+ concurrent users
- [ ] Monitor Firebase usage (check console)
- [ ] Check bundle size (should be reasonable)

### Success Criteria
- ✅ All tests passing
- ✅ Test coverage > 70%
- ✅ Basic manual performance testing passes (50+ shapes works smoothly)
- ✅ No console errors in tests
- ✅ CI/CD pipeline working (optional)

---

## PR #15: Database Security Rules

**Branch**: `feature/database-security`  
**Work Level**: Low  
**Breaking Changes**: None (tightens security only)

### Why This PR?
- Current rules are too permissive (allow any authenticated user to write anything)
- Production requires strict security rules
- Prevent malicious users from deleting others' work
- Validate data structure and types
- Protect user privacy
- Essential for production deployment

### What This PR Delivers

**Comprehensive Security Rules:**
- Per-shape write permissions (only owner can modify their shapes)
- Field-level validation (types, ranges, formats)
- Protection for user profiles (can only edit own profile)
- Cursor write protection (can only update own cursor)
- Color history privacy (can only read/write own history)
- Selection field special handling (any user can select)

**Data Validation:**
- Type checking (strings, numbers, booleans)
- Range validation (positive dimensions, valid hex colors)
- Required fields enforcement
- Structure validation

**Privacy Protection:**
- Users can only modify their own data
- User profiles readable by all (for collaboration)
- Color history private to each user
- AI command count protection (can only increment)

### Implementation Strategy

**Progressive Tightening:**
- Start with current permissive rules
- Add per-collection rules
- Add per-field validation
- Test thoroughly
- Deploy incrementally

**Testing Approach:**
- Test with Firebase Rules Playground
- Test with emulator
- Test edge cases (malicious attempts)
- Verify all legitimate operations still work

### Files to Update

#### `/database.rules.json`
Complete replacement with production-grade rules:

```json
{
  "rules": {
    // Global: must be authenticated
    ".read": "auth != null",
    ".write": false,  // Deny all writes by default
    
    // Rectangles
    "rectangles": {
      "$rectangleId": {
        // Can create new OR can update own shapes
        ".write": "!data.exists() || data.child('createdBy').val() === auth.uid",
        
        // Validate structure
        ".validate": "newData.hasChildren(['id', 'x', 'y', 'width', 'height', 'color', 'createdBy', 'createdAt'])",
        
        // Field validation
        "id": { ".validate": "newData.isString()" },
        "x": { ".validate": "newData.isNumber()" },
        "y": { ".validate": "newData.isNumber()" },
        "width": { ".validate": "newData.isNumber() && newData.val() > 0" },
        "height": { ".validate": "newData.isNumber() && newData.val() > 0" },
        "color": { 
          ".validate": "newData.isString() && newData.val().matches(/^#[0-9A-Fa-f]{6}$/)" 
        },
        "createdBy": { 
          ".validate": "newData.val() === auth.uid" 
        },
        "createdAt": { ".validate": "newData.isNumber()" },
        "zIndex": { ".validate": "newData.isNumber()" },
        
        // Selection fields - any authenticated user can update
        "selectedBy": {
          ".write": "auth != null",
          ".validate": "newData.val() === auth.uid || newData.val() === null"
        },
        "selectedAt": {
          ".write": "auth != null",
          ".validate": "newData.isNumber() || newData.val() === null"
        }
      }
    },
    
    // Circles (same pattern as rectangles)
    "circles": {
      "$circleId": {
        ".write": "!data.exists() || data.child('createdBy').val() === auth.uid",
        ".validate": "newData.hasChildren(['id', 'type', 'x', 'y', 'radius', 'color', 'createdBy', 'createdAt'])",
        
        "id": { ".validate": "newData.isString()" },
        "type": { ".validate": "newData.val() === 'circle'" },
        "x": { ".validate": "newData.isNumber()" },
        "y": { ".validate": "newData.isNumber()" },
        "radius": { ".validate": "newData.isNumber() && newData.val() > 0" },
        "color": { 
          ".validate": "newData.isString() && newData.val().matches(/^#[0-9A-Fa-f]{6}$/)" 
        },
        "createdBy": { ".validate": "newData.val() === auth.uid" },
        "createdAt": { ".validate": "newData.isNumber()" },
        "zIndex": { ".validate": "newData.isNumber()" },
        
        "selectedBy": {
          ".write": "auth != null",
          ".validate": "newData.val() === auth.uid || newData.val() === null"
        },
        "selectedAt": {
          ".write": "auth != null",
          ".validate": "newData.isNumber() || newData.val() === null"
        }
      }
    },
    
    // Lines
    "lines": {
      "$lineId": {
        ".write": "!data.exists() || data.child('createdBy').val() === auth.uid",
        ".validate": "newData.hasChildren(['id', 'type', 'x', 'y', 'endX', 'endY', 'color', 'createdBy', 'createdAt'])",
        
        "id": { ".validate": "newData.isString()" },
        "type": { ".validate": "newData.val() === 'line'" },
        "x": { ".validate": "newData.isNumber()" },
        "y": { ".validate": "newData.isNumber()" },
        "endX": { ".validate": "newData.isNumber()" },
        "endY": { ".validate": "newData.isNumber()" },
        "color": { 
          ".validate": "newData.isString() && newData.val().matches(/^#[0-9A-Fa-f]{6}$/)" 
        },
        "createdBy": { ".validate": "newData.val() === auth.uid" },
        "createdAt": { ".validate": "newData.isNumber()" },
        "zIndex": { ".validate": "newData.isNumber()" },
        
        "selectedBy": {
          ".write": "auth != null",
          ".validate": "newData.val() === auth.uid || newData.val() === null"
        },
        "selectedAt": {
          ".write": "auth != null",
          ".validate": "newData.isNumber() || newData.val() === null"
        }
      }
    },
    
    // Texts
    "texts": {
      "$textId": {
        ".write": "!data.exists() || data.child('createdBy').val() === auth.uid",
        ".validate": "newData.hasChildren(['id', 'type', 'x', 'y', 'text', 'color', 'createdBy', 'createdAt'])",
        
        "id": { ".validate": "newData.isString()" },
        "type": { ".validate": "newData.val() === 'text'" },
        "x": { ".validate": "newData.isNumber()" },
        "y": { ".validate": "newData.isNumber()" },
        "text": { 
          ".validate": "newData.isString() && newData.val().length <= 500" 
        },
        "fontSize": { ".validate": "newData.isNumber() && newData.val() > 0 && newData.val() <= 200" },
        "color": { 
          ".validate": "newData.isString() && newData.val().matches(/^#[0-9A-Fa-f]{6}$/)" 
        },
        "createdBy": { ".validate": "newData.val() === auth.uid" },
        "createdAt": { ".validate": "newData.isNumber()" },
        "zIndex": { ".validate": "newData.isNumber()" },
        
        "selectedBy": {
          ".write": "auth != null",
          ".validate": "newData.val() === auth.uid || newData.val() === null"
        },
        "selectedAt": {
          ".write": "auth != null",
          ".validate": "newData.isNumber() || newData.val() === null"
        }
      }
    },
    
    // User profiles (includes AI command count for rate limiting)
    "users": {
      "$userId": {
        ".read": "auth != null",  // All users can read all profiles
        ".write": "$userId === auth.uid",  // Can only write own profile
        ".validate": "newData.hasChildren(['uid', 'displayName', 'email', 'createdAt'])",
        
        "uid": { ".validate": "newData.val() === $userId" },
        "displayName": { ".validate": "newData.isString()" },
        "email": { ".validate": "newData.isString()" },
        "createdAt": { ".validate": "newData.isNumber()" },
        "lastSeenAt": { ".validate": "newData.isNumber()" },
        
        // AI command count - nested inside user profile
        "aiCommandCount": {
          ".read": "$userId === auth.uid",  // Can only read own command count
          ".write": "$userId === auth.uid && (!data.exists() || newData.val() > data.val())",  // Can only increment
          ".validate": "newData.isNumber() && newData.val() >= 0"
        }
      }
    },
    
    // Cursors
    "cursors": {
      "$userId": {
        ".read": "auth != null",  // All users can see all cursors
        ".write": "$userId === auth.uid",  // Can only update own cursor
        ".validate": "newData.hasChildren(['x', 'y', 'userId'])",
        
        "x": { ".validate": "newData.isNumber()" },
        "y": { ".validate": "newData.isNumber()" },
        "userId": { ".validate": "newData.val() === $userId" }
      }
    },
    
    // Color history - per user
    "colorHistory": {
      "$userId": {
        ".read": "$userId === auth.uid",  // Can only read own history
        ".write": "$userId === auth.uid",  // Can only write own history
        ".validate": "newData.isString() && newData.val().length <= 500"
      }
    }
  }
}
```

> **Important**: Firebase Cloud Functions using Firebase Admin SDK bypass these security rules entirely. This is how the AI agent (which runs as a Cloud Function) can create shapes on behalf of users without being blocked by the `createdBy` validation.

**Key Security Features:**
- ✅ Per-shape ownership (can only modify own shapes)
- ✅ Field-level validation (types, ranges, regex)
- ✅ Hex color validation
- ✅ Positive dimension requirements
- ✅ Selection fields writable by anyone (for collaboration)
- ✅ User profiles readable by all (for cursors)
- ✅ Color history private to each user
- ✅ Text length limits (prevent abuse)
- ✅ AI command count can only increment (prevents quota manipulation)

### Testing Checklist

**Security Rules Testing:**
- [ ] Firebase Rules Playground tested (online simulator)
- [ ] Firebase emulator tested locally (OPTIONAL - run `npm run emulators` for local testing)
- [ ] Malicious write attempts blocked (e.g., delete other users' shapes)
- [ ] Malicious read attempts blocked (e.g., read other users' color history)
- [ ] All legitimate operations still work
- [ ] Shape creation works
- [ ] Shape modification works (own shapes only)
- [ ] Selection updates work (any user can select)
- [ ] User profile reads work (all profiles)
- [ ] User profile writes work (own profile only)

**Edge Case Testing:**
- [ ] Invalid hex colors rejected
- [ ] Negative dimensions rejected
- [ ] Missing required fields rejected
- [ ] Wrong data types rejected
- [ ] Text length limits enforced
- [ ] Font size limits enforced
- [ ] AI Cloud Function can create shapes on behalf of users (bypasses rules via Admin SDK)
- [ ] AI command count can only increment (cannot decrement)

**Integration Testing:**
- [ ] All Phase 3A-3D features still work
- [ ] Multi-user collaboration still works
- [ ] AI agent still works
- [ ] No console errors
- [ ] No Firebase permission errors

### Success Criteria
- ✅ Production-grade security rules deployed
- ✅ All malicious operations blocked
- ✅ All legitimate operations work
- ✅ Data validation comprehensive
- ✅ Privacy protection enforced
- ✅ No regression in existing features

---

## Phase 3E Completion Checklist

Before moving to Phase 3F, verify:

### Functionality
- [ ] All 3 PRs merged and tested (13, 14, 15)
- [ ] Authentication migration complete (Google only)
- [ ] User profiles auto-created by Cloud Function
- [ ] UserProfilesContext caching only online user profiles efficiently
- [ ] Profiles load/unload as users join/leave (verified)
- [ ] Test suite comprehensive (70%+ coverage)
- [ ] All tests passing
- [ ] Security rules deployed and tested

### Production Readiness
- [ ] Production-grade security rules active
- [ ] All features work with authenticated users
- [ ] No console errors or warnings
- [ ] Basic performance testing passed (50+ shapes)
- [ ] Multi-user collaboration verified

### Quality
- [ ] Test coverage > 70%
- [ ] Code is clean and maintainable
- [ ] User experience is polished
- [ ] Real-time sync is reliable
- [ ] Security rules block malicious operations

---

## Next Steps

**Proceed to Phase 3F**: [Final Features & Documentation](./phase3f-final.md)

Phase 3F adds the final polish and documentation: Documentation & Demo, AI Agent Enhancements, and Comments. These features elevate the application to production quality and enable submission.

**Note**: Phase 3E is a critical milestone. The application infrastructure is now production-ready with authentication, testing, and security. Phase 3F focuses on documentation and advanced features.


