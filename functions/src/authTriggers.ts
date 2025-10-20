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

