import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { firebaseDatabase, dbRef, dbOnValue } from '../services/firebaseService'

// we don't use this data (this interface, etc) after all
// it could theoretically come in handy. i'm so tired i don't even want to decide to delete dead code though...
// so i'll make an exception and leave it in, but feel free to delete it.

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

// eslint-disable-next-line react-refresh/only-export-components
export const useUserProfiles = () => {
  const context = useContext(UserProfilesContext)
  if (!context) {
    throw new Error('useUserProfiles must be used within UserProfilesProvider')
  }
  return context
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUserProfile = (userId: string) => {
  const { getProfile, getInitials, loading } = useUserProfiles()
  return {
    profile: getProfile(userId),
    initials: getInitials(userId),
    loading
  }
}

