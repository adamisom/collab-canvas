// AI Command History - localStorage service
// Stores last 10 AI commands for user reference

const HISTORY_KEY = 'collab-canvas-ai-history'
const MAX_HISTORY = 10

export interface AICommandEntry {
  id: string
  timestamp: number
  userInput: string
  success: boolean
  resultMessage: string
}

export const getCommandHistory = (): AICommandEntry[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error reading command history:', error)
    return []
  }
}

export const addCommandToHistory = (entry: Omit<AICommandEntry, 'id' | 'timestamp'>): void => {
  try {
    const history = getCommandHistory()
    
    const newEntry: AICommandEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now()
    }
    
    // Add to start, keep last 10
    const updated = [newEntry, ...history].slice(0, MAX_HISTORY)
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error saving command history:', error)
  }
}

export const clearCommandHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    console.error('Error clearing command history:', error)
  }
}

