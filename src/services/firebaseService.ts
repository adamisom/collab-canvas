import { auth, database } from '../config/firebase'
import { 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { 
  ref, 
  set, 
  get, 
  onValue, 
  off, 
  push, 
  update, 
  remove
} from 'firebase/database'
import type { DatabaseReference, DataSnapshot } from 'firebase/database'

// Auth exports
export const firebaseAuth = auth
export const signInUserAnonymously = signInAnonymously
export const onAuthStateChange = onAuthStateChanged

// Database exports
export const firebaseDatabase = database
export const dbRef = ref
export const dbSet = set
export const dbGet = get
export const dbOnValue = onValue
export const dbOff = off
export const dbPush = push
export const dbUpdate = update
export const dbRemove = remove

// Types
export type { User, DatabaseReference, DataSnapshot }
