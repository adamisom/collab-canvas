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
- Update security rules moved to separate PR (see Phase 3F)

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

#### `/src/contexts/UserProfilesContext.tsx`
Shared context for efficient user profile caching:

```typescript
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { dbRef, dbOnValue } from '../services/firebaseService'

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
  
  // Single subscription to ALL user profiles
  useEffect(() => {
    const usersRef = dbRef('users')
    
    const unsubscribe = dbOnValue(usersRef, (snapshot) => {
      const newProfiles = new Map<string, UserProfile>()
      
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const profile = child.val() as UserProfile
          newProfiles.set(profile.uid, profile)
        })
      }
      
      setProfiles(newProfiles)
      setLoading(false)
    })
    
    return unsubscribe
  }, [])
  
  const getProfile = useCallback((userId: string) => {
    return profiles.get(userId)
  }, [profiles])
  
  const getInitials = useCallback((userId: string) => {
    const profile = profiles.get(userId)
    if (!profile) return '?'
    
    return profile.displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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

export default UserProfileDropdown
```

**CSS for avatar initials** (add to `UserProfileDropdown.css`):
```css
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
}
```

### Files to Update

#### 1. `/src/contexts/AuthContext.tsx` ⚠️ MAJOR UPDATE
Replace Anonymous Auth with Google Auth (simplified - no client-side profile creation):

```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

interface AuthContextType {
  user: User | null
  username: string | null
  loading: boolean
  
  // UPDATED: Replace signInAnonymously with signInWithGoogle
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

// Create Google provider
const googleProvider = new GoogleAuthProvider()

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    
    return unsubscribe
  }, [])

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true)
      await signInWithPopup(auth, googleProvider)
      // User profile automatically created by Firebase Auth Trigger
    } catch (error: any) {
      console.error('Error signing in with Google:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await auth.signOut()
      setUser(null)
    } catch (error: any) {
      console.error('Error signing out:', error)
      throw error
    }
  }, [])

  const username = user?.displayName || user?.email?.split('@')[0] || null

  return (
    <AuthContext.Provider value={{
      user,
      username,
      loading,
      signInWithGoogle,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}
```

**Key Changes:**
- ❌ Removed `signInAnonymously`
- ✅ Added `signInWithGoogle` using `signInWithPopup`
- ✅ Removed client-side profile creation (handled by Cloud Function trigger)
- ✅ Much simpler and more reliable

#### 2. `/src/components/layout/Header.tsx`
Add user profile dropdown:

```typescript
import UserProfileDropdown from '../ui/UserProfileDropdown'

// Replace anonymous sign-in button with:
<UserProfileDropdown />
```

#### 3. `/src/App.tsx`
Show sign-in modal when not authenticated and wrap with UserProfilesProvider:

```typescript
import SignInModal from './components/auth/SignInModal'
import { UserProfilesProvider } from './contexts/UserProfilesContext'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!user) {
    return <SignInModal />
  }

  return (
    <UserProfilesProvider>
    <div className="app">
      {/* Main app content */}
    </div>
    </UserProfilesProvider>
  )
}
```

#### 4. `/src/components/canvas/Cursor.tsx`
Update to show user initials (using shared UserProfilesContext):

```typescript
import { useUserProfile } from '../../contexts/UserProfilesContext'
import { getUserColor } from '../../utils/userColors'
import { Circle, Text, Group, Line } from 'react-konva'

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
          width={profile.displayName.length * 6 + 36}
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

export default Cursor
```

**Benefits:**
- ✅ No database calls per cursor (uses shared cache)
- ✅ Shows user initials in colored circle
- ✅ Efficient and fast
- ✅ Real-time updates when profiles change

#### 5. Firebase Console Configuration
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
- [ ] All operations work with authenticated users
- [ ] Exclusive selection still works per rectangle
- [ ] User can see their own profile in header with initials
- [ ] UserProfilesContext efficiently caches all profiles

### Success Criteria
- ✅ Google authentication works flawlessly
- ✅ User profiles automatically created by Cloud Function
- ✅ User initials show in header dropdown and collaborative cursors
- ✅ UserProfilesContext efficiently caches profiles (no redundant fetches)
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
- Context tests (AuthContext, CanvasContext)
- Service tests (canvasService, aiAgent)
- Component tests (Rectangle, Circle, Line, Text)
- Utility tests (alignment, selection helpers)

**Integration Tests:**
- Full workflow tests (create, edit, delete)
- Multi-user collaboration tests
- AI agent integration tests

**Test Coverage Goal: 70%+**

> **Note:** Performance testing is considered out of scope for this PR. Basic manual testing with many shapes is sufficient.

### Implementation Strategy

**Testing Framework:**
- Vitest (already configured from Phase 2)
- React Testing Library
- Firebase emulator for integration tests

**Continuous Integration:**
- GitHub Actions workflow (optional)
- Run tests on every PR

### Files to Create

#### `/src/contexts/__tests__/CanvasContext.test.tsx`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { CanvasProvider, useCanvas } from '../CanvasContext'
import { AuthProvider } from '../AuthContext'

// Mock Firebase
vi.mock('../../services/firebaseService', () => ({
  // Mock implementations
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

#### `/src/utils/__tests__/alignmentHelpers.test.ts`
```typescript
import { describe, it, expect } from 'vitest'
import {
  getShapeBounds,
  calculateAlignedPosition,
  calculateDistributedPositions
} from '../alignmentHelpers'

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

#### `/tests/integration/collaboration.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { connectDatabaseEmulator } from 'firebase/database'

describe('Multi-User Collaboration', () => {
  beforeAll(() => {
    // Connect to Firebase emulator
    connectDatabaseEmulator(database, 'localhost', 9000)
  })

  afterAll(() => {
    // Cleanup
  })

  it('should sync rectangle creation between users', async () => {
    // Test implementation with two simulated users
  })

  it('should handle exclusive selection', async () => {
    // Test implementation
  })

  it('should sync AI commands', async () => {
    // Test implementation
  })
})
```

### Files to Update

#### `/package.json`
Update test scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run tests/integration"
  }
}
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
- [ ] All service tests pass
- [ ] All utility tests pass
- [ ] Component tests pass
- [ ] Coverage > 70%

**Integration Tests:**
- [ ] Multi-user collaboration tests pass
- [ ] AI agent integration tests pass
- [ ] Full workflow tests pass

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
    
    // User profiles
    "users": {
      "$userId": {
        ".read": "auth != null",  // All users can read all profiles
        ".write": "$userId === auth.uid",  // Can only write own profile
        ".validate": "newData.hasChildren(['uid', 'displayName', 'email', 'createdAt'])",
        
        "uid": { ".validate": "newData.val() === $userId" },
        "displayName": { ".validate": "newData.isString()" },
        "email": { ".validate": "newData.isString()" },
        "createdAt": { ".validate": "newData.isNumber()" },
        "lastSeenAt": { ".validate": "newData.isNumber()" }
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

**Key Security Features:**
- ✅ Per-shape ownership (can only modify own shapes)
- ✅ Field-level validation (types, ranges, regex)
- ✅ Hex color validation
- ✅ Positive dimension requirements
- ✅ Selection fields writable by anyone (for collaboration)
- ✅ User profiles readable by all (for cursors)
- ✅ Color history private to each user
- ✅ Text length limits (prevent abuse)

### Testing Checklist

**Security Rules Testing:**
- [ ] Firebase Rules Playground tested
- [ ] Firebase emulator tested locally
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
- [ ] AI Cloud Function can still create shapes (has admin access)

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
- [ ] UserProfilesContext caching profiles efficiently
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


