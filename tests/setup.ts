import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Firebase for testing
const mockFirebaseAuth = {
  signInAnonymously: vi.fn(),
  onAuthStateChanged: vi.fn(),
  currentUser: null,
}

const mockFirebaseDatabase = {
  ref: vi.fn(() => ({
    set: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    push: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  })),
  child: vi.fn(),
  push: vi.fn(),
}

global.firebase = {
  auth: () => mockFirebaseAuth,
  database: () => mockFirebaseDatabase,
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
