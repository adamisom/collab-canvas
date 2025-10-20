import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import {
  firebaseAuth,
  onAuthStateChange
} from '../services/firebaseService'
import type { User } from '../services/firebaseService'

interface AuthContextType {
  user: User | null
  username: string | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// Standard React context pattern: exporting hook with provider
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

// Google Auth provider (initialized once)
const googleProvider = new GoogleAuthProvider()

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Simplified auth state listener - user profile created by Cloud Function
  useEffect(() => {
    const unsubscribe = onAuthStateChange(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    
    return unsubscribe
  }, [])

  // Google Sign-In (popup-based - simpler and more reliable)
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true)
      await signInWithPopup(firebaseAuth, googleProvider)
      // User profile automatically created by Firebase Auth Trigger
    } catch (error: unknown) {
      console.error('Error signing in with Google:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Simplified sign-out (Cloud Function handles cursor cleanup)
  const signOut = useCallback(async () => {
    try {
      await firebaseAuth.signOut()
      setUser(null)
    } catch (error: unknown) {
      console.error('Error signing out:', error)
      throw error
    }
  }, [])

  // Derive username from user profile (displayName or email)
  const username = user?.displayName || user?.email?.split('@')[0] || null

  const value: AuthContextType = {
    user,
    username,
    loading,
    signInWithGoogle,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
