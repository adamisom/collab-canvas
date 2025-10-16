import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  firebaseAuth,
  firebaseDatabase,
  signInUserAnonymously,
  onAuthStateChange,
  dbRef,
  dbSet,
  dbGet
} from '../services/firebaseService'
import type { User } from '../services/firebaseService'
import { cursorService } from '../services/cursorService'

interface AuthContextType {
  user: User | null
  username: string | null
  loading: boolean
  signIn: (username: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChange(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        
        // Retrieve username from localStorage first (for immediate UI update)
        const storedUsername = localStorage.getItem('username')
        if (storedUsername) {
          setUsername(storedUsername)
        }
        
        // Then sync with Firebase database
        try {
          const userRef = dbRef(firebaseDatabase, `users/${firebaseUser.uid}`)
          const snapshot = await dbGet(userRef)
          
          if (snapshot.exists()) {
            const userData = snapshot.val()
            setUsername(userData.username)
            localStorage.setItem('username', userData.username)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      } else {
        setUser(null)
        setUsername(null)
        localStorage.removeItem('username')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (usernameInput: string) => {
    try {
      setLoading(true)
      
      // Sign in anonymously with Firebase
      const result = await signInUserAnonymously(firebaseAuth)
      const firebaseUser = result.user
      
      // Store username in localStorage immediately
      localStorage.setItem('username', usernameInput)
      setUsername(usernameInput)
      
      // Store username in Firebase Realtime Database
      const userRef = dbRef(firebaseDatabase, `users/${firebaseUser.uid}`)
      await dbSet(userRef, {
        username: usernameInput,
        createdAt: Date.now(),
        lastActive: Date.now()
      })
      
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      // Clean up cursor data before signing out
      if (user) {
        await cursorService.removeCursor(user.uid)
      }
      
      await firebaseAuth.signOut()
      localStorage.removeItem('username')
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    username,
    loading,
    signIn,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
