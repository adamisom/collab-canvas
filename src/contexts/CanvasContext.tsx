import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { canvasService } from '../services/canvasService'
import type { Rectangle, RectangleInput } from '../services/canvasService'
import { useAuth } from './AuthContext'

interface CanvasContextType {
  rectangles: Rectangle[]
  selectedRectangleId: string | null
  loading: boolean
  error: string | null
  toastMessage: string | null
  
  // Rectangle operations
  createRectangle: (x: number, y: number) => Promise<Rectangle | null>
  updateRectangle: (rectangleId: string, updates: Partial<Omit<Rectangle, 'id' | 'createdBy' | 'createdAt'>>) => Promise<void>
  resizeRectangle: (rectangleId: string, newWidth: number, newHeight: number, newX?: number, newY?: number) => Promise<void>
  deleteRectangle: (rectangleId: string) => Promise<void>
  changeRectangleColor: (rectangleId: string, color: string) => Promise<void>
  
  // Selection operations
  selectRectangle: (rectangleId: string | null) => Promise<void>
  
  // Utility operations
  clearError: () => void
  clearToast: () => void
  refreshRectangles: () => Promise<void>
}

const CanvasContext = createContext<CanvasContextType | null>(null)

export const useCanvas = () => {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider')
  }
  return context
}

interface CanvasProviderProps {
  children: React.ReactNode
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [rectangles, setRectangles] = useState<Rectangle[]>([])
  const [selectedRectangleId, setSelectedRectangleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  // Use ref to access current selectedRectangleId in Firebase callback
  const selectedRectangleIdRef = useRef<string | null>(null)
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedRectangleIdRef.current = selectedRectangleId
  }, [selectedRectangleId])
  
  const { user, username } = useAuth()

  // Initialize canvas state and set up real-time listeners
  useEffect(() => {
    if (!user) {
      setRectangles([])
      setSelectedRectangleId(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Set up real-time listener for rectangles
    const unsubscribe = canvasService.onRectanglesChange((newRectangles) => {
      setRectangles(newRectangles)
      setLoading(false)
      
      // Clear selection if selected rectangle no longer exists
      // Use ref to get current selectedRectangleId without causing re-subscription
      const currentSelectedId = selectedRectangleIdRef.current
      if (currentSelectedId && !newRectangles.find(r => r.id === currentSelectedId)) {
        setSelectedRectangleId(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [user])

  // Create a new rectangle
  const createRectangle = useCallback(async (x: number, y: number): Promise<Rectangle | null> => {
    if (!user) {
      setError('Must be logged in to create rectangles')
      return null
    }

    try {
      const rectangleInput: RectangleInput = {
        x,
        y,
        width: 100,  // Default width
        height: 80,  // Default height
        createdBy: user.uid
      }

      const newRectangle = await canvasService.createRectangle(rectangleInput)
      
      // Select the newly created rectangle
      setSelectedRectangleId(newRectangle.id)
      
      return newRectangle
    } catch (error) {
      console.error('Error creating rectangle:', error)
      setError('Failed to create rectangle')
      return null
    }
  }, [user])

  // Update an existing rectangle
  const updateRectangle = useCallback(async (
    rectangleId: string, 
    updates: Partial<Omit<Rectangle, 'id' | 'createdBy' | 'createdAt'>>
  ): Promise<void> => {
    try {
      await canvasService.updateRectangle(rectangleId, updates)
    } catch (error) {
      console.error('Error updating rectangle:', error)
      setError('Failed to update rectangle')
    }
  }, [])

  // Resize an existing rectangle
  const resizeRectangle = useCallback(async (
    rectangleId: string, 
    newWidth: number, 
    newHeight: number, 
    newX?: number, 
    newY?: number
  ): Promise<void> => {
    try {
      await canvasService.resizeRectangle(rectangleId, newWidth, newHeight, newX, newY)
    } catch (error) {
      console.error('Error resizing rectangle:', error)
      setError('Failed to resize rectangle')
    }
  }, [])

  // Delete a rectangle
  const deleteRectangle = useCallback(async (rectangleId: string): Promise<void> => {
    try {
      await canvasService.deleteRectangle(rectangleId)
      
      // Clear selection if deleted rectangle was selected
      if (selectedRectangleId === rectangleId) {
        setSelectedRectangleId(null)
      }
    } catch (error) {
      console.error('Error deleting rectangle:', error)
      setError('Failed to delete rectangle')
    }
  }, [selectedRectangleId])

  // Select or deselect a rectangle (with exclusive selection logic)
  const selectRectangle = useCallback(async (rectangleId: string | null) => {
    if (!user || !username) return

    // Deselect current rectangle first
    if (selectedRectangleId) {
      await canvasService.deselectRectangle(selectedRectangleId, user.uid)
    }

    if (rectangleId) {
      // Try to select the new rectangle
      const success = await canvasService.selectRectangle(rectangleId, user.uid, username)
      
      if (success) {
        setSelectedRectangleId(rectangleId)
      } else {
        // Rectangle is already selected by another user
        const rectangle = rectangles.find(r => r.id === rectangleId)
        if (rectangle && rectangle.selectedByUsername) {
          setToastMessage(`Rectangle selected by ${rectangle.selectedByUsername}`)
        }
      }
    } else {
      setSelectedRectangleId(null)
    }
  }, [user, username, selectedRectangleId, rectangles])

  // Clear any error messages
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Clear toast messages
  const clearToast = useCallback(() => {
    setToastMessage(null)
  }, [])

  // Change rectangle color
  const changeRectangleColor = useCallback(async (rectangleId: string, color: string): Promise<void> => {
    try {
      await canvasService.updateRectangle(rectangleId, { color })
    } catch (error) {
      console.error('Error changing rectangle color:', error)
      setError('Failed to change rectangle color')
    }
  }, [])

  // Refresh rectangles manually
  const refreshRectangles = useCallback(async (): Promise<void> => {
    if (!user) return

    try {
      setLoading(true)
      const freshRectangles = await canvasService.getAllRectangles()
      setRectangles(freshRectangles)
    } catch (error) {
      console.error('Error refreshing rectangles:', error)
      setError('Failed to refresh rectangles')
    } finally {
      setLoading(false)
    }
  }, [user])

  const value: CanvasContextType = {
    rectangles,
    selectedRectangleId,
    loading,
    error,
    toastMessage,
    createRectangle,
    updateRectangle,
    resizeRectangle,
    deleteRectangle,
    changeRectangleColor,
    selectRectangle,
    clearError,
    clearToast,
    refreshRectangles
  }

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  )
}
