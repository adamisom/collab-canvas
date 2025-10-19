import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { canvasService } from '../services/canvasService'
import type { Rectangle, RectangleInput } from '../services/canvasService'
import { useAuth } from './AuthContext'
import type { ViewportInfo } from '../shared/types'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants'

interface CanvasContextType {
  rectangles: Rectangle[]
  selectedRectangleIds: Set<string> // CHANGED: From single to multi
  primarySelectionId: string | null  // NEW: Last clicked rectangle
  loading: boolean
  error: string | null
  toastMessage: string | null
  selectionLocked: boolean
  
  // Rectangle operations
  createRectangle: (x: number, y: number) => Promise<Rectangle | null>
  updateRectangle: (rectangleId: string, updates: Partial<Omit<Rectangle, 'id' | 'createdBy' | 'createdAt'>>) => Promise<void>
  resizeRectangle: (rectangleId: string, newWidth: number, newHeight: number, newX?: number, newY?: number) => Promise<void>
  deleteRectangle: (rectangleId: string) => Promise<void>
  changeRectangleColor: (rectangleId: string, color: string) => Promise<void>
  
  // Selection operations (UPDATED)
  selectRectangle: (rectangleId: string, additive?: boolean) => Promise<void>
  selectMultiple: (rectangleIds: string[]) => Promise<void>  // NEW
  selectAll: () => Promise<void>  // NEW
  clearSelection: () => Promise<void>  // NEW
  setSelectionLocked: (locked: boolean) => void
  
  // Bulk operations (NEW)
  deleteSelectedRectangles: () => Promise<void>
  changeSelectedRectanglesColor: (color: string) => Promise<void>
  
  // Clipboard operations (UPDATED)
  copySelectedRectangles: () => void  // Was: copyRectangle(id)
  pasteRectangles: () => Promise<void>  // Was: pasteRectangle()
  duplicateRectangle: (rectangleId: string) => Promise<Rectangle | null>  // Unchanged (single only)
  hasClipboardData: () => boolean
  
  // Layering operations
  bringToFront: (rectangleId: string) => Promise<void>
  sendToBack: (rectangleId: string) => Promise<void>
  
  // Viewport operations (for AI agent)
  getViewportInfo: () => ViewportInfo | null
  updateViewportInfo: (info: ViewportInfo) => void
  
  // Utility operations
  clearError: () => void
  clearToast: () => void
  showToast: (message: string) => void  // NEW: Helper for toast messages
  refreshRectangles: () => Promise<void>
}

const CanvasContext = createContext<CanvasContextType | null>(null)

// Standard React context pattern: exporting hook with provider
// eslint-disable-next-line react-refresh/only-export-components
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
  const [selectedRectangleIds, setSelectedRectangleIds] = useState<Set<string>>(new Set())  // CHANGED: From single to Set
  const [primarySelectionId, setPrimarySelectionId] = useState<string | null>(null)  // NEW
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [selectionLocked, setSelectionLocked] = useState(false)
  const [clipboardRectangles, setClipboardRectangles] = useState<Rectangle[]>([])  // CHANGED: From single to array
  
  // Use ref to access current selection state in Firebase callback
  const selectedRectangleIdsRef = useRef<Set<string>>(new Set())
  const primarySelectionIdRef = useRef<string | null>(null)
  
  // Use ref to track previous user ID for cleanup
  const prevUserIdRef = useRef<string | null>(null)
  
  // Use ref to store viewport info (doesn't cause re-renders when updated)
  const viewportInfoRef = useRef<ViewportInfo | null>(null)
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedRectangleIdsRef.current = selectedRectangleIds
    primarySelectionIdRef.current = primarySelectionId
  }, [selectedRectangleIds, primarySelectionId])
  
  const { user, username } = useAuth()

  // Initialize canvas state and set up real-time listeners
  useEffect(() => {
    if (!user) {
      setRectangles([])
      setSelectedRectangleIds(new Set())
      setPrimarySelectionId(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Set up real-time listener for rectangles
    const unsubscribe = canvasService.onRectanglesChange((newRectangles) => {
      setRectangles(newRectangles)
      setLoading(false)
      
      // Clear selections for rectangles that no longer exist
      const currentSelectedIds = selectedRectangleIdsRef.current
      const currentPrimaryId = primarySelectionIdRef.current
      
      if (currentSelectedIds.size > 0) {
        const existingIds = new Set(newRectangles.map(r => r.id))
        const updatedSelection = new Set(
          Array.from(currentSelectedIds).filter(id => existingIds.has(id))
        )
        
        if (updatedSelection.size !== currentSelectedIds.size) {
          setSelectedRectangleIds(updatedSelection)
        }
        
        // Clear primary if it no longer exists
        if (currentPrimaryId && !existingIds.has(currentPrimaryId)) {
          setPrimarySelectionId(updatedSelection.size > 0 ? Array.from(updatedSelection)[0] : null)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [user])

  // Clean up user selections when user signs out
  useEffect(() => {
    if (user) {
      prevUserIdRef.current = user.uid
    } else if (prevUserIdRef.current) {
      // User signed out, clean up their selections
      canvasService.clearUserSelections(prevUserIdRef.current)
      prevUserIdRef.current = null
    }
  }, [user])

  // Clear clipboard and selection on sign out
  useEffect(() => {
    if (!user) {
      setClipboardRectangles([])
      setSelectedRectangleIds(new Set())
      setPrimarySelectionId(null)
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
      
      // Select the newly created rectangle (single selection)
      setSelectedRectangleIds(new Set([newRectangle.id]))
      setPrimarySelectionId(newRectangle.id)
      
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
      
      // Remove from selection if deleted
      if (selectedRectangleIds.has(rectangleId)) {
        setSelectedRectangleIds(prev => {
          const next = new Set(prev)
          next.delete(rectangleId)
          return next
        })
        
        // Update primary if it was deleted
        if (primarySelectionId === rectangleId) {
          const remaining = Array.from(selectedRectangleIds).filter(id => id !== rectangleId)
          setPrimarySelectionId(remaining.length > 0 ? remaining[0] : null)
        }
      }
    } catch (error) {
      console.error('Error deleting rectangle:', error)
      setError('Failed to delete rectangle')
    }
  }, [selectedRectangleIds, primarySelectionId])

  // NEW: Helper to show toast messages
  const showToast = useCallback((message: string) => {
    setToastMessage(message)
  }, [])

  // Get current viewport info (for AI agent)
  const getViewportInfo = useCallback((): ViewportInfo | null => {
    return viewportInfoRef.current
  }, [])

  // Update viewport info (called by Canvas component on pan/zoom/resize)
  const updateViewportInfo = useCallback((info: ViewportInfo): void => {
    viewportInfoRef.current = info
  }, [])

  // UPDATED: Select rectangle with additive mode support
  const selectRectangle = useCallback(async (rectangleId: string, additive: boolean = false) => {
    if (!user || !username) return
    
    // Don't allow selection changes when locked (during AI processing)
    if (selectionLocked) {
      console.log('Selection locked, ignoring selection change')
      return
    }

    const rectangle = rectangles.find(r => r.id === rectangleId)
    if (!rectangle) {
      showToast('Rectangle not found')
      return
    }

    // Check if another user has it selected (exclusive selection per rectangle)
    if (rectangle.selectedBy && rectangle.selectedBy !== user.uid) {
      showToast(`Rectangle is currently selected by ${rectangle.selectedByUsername || 'another user'}`)
      return
    }

    if (!additive) {
      // Clear all previous selections
      for (const prevId of selectedRectangleIds) {
        await canvasService.deselectRectangle(prevId, user.uid)
      }

      // Select this one
      setSelectedRectangleIds(new Set([rectangleId]))
      setPrimarySelectionId(rectangleId)
      await canvasService.selectRectangle(rectangleId, user.uid, username)
    } else {
      // Add/remove from selection (toggle)
      const isCurrentlySelected = selectedRectangleIds.has(rectangleId)

      if (isCurrentlySelected) {
        // Remove from selection
        await canvasService.deselectRectangle(rectangleId, user.uid)

        setSelectedRectangleIds(prev => {
          const next = new Set(prev)
          next.delete(rectangleId)

          // If removing primary, set new primary
          if (rectangleId === primarySelectionId) {
            if (next.size > 0) {
              const newPrimary = Array.from(next)[0]
              setPrimarySelectionId(newPrimary)
            } else {
              setPrimarySelectionId(null)
            }
          }
          return next
        })
      } else {
        // Add to selection
        await canvasService.selectRectangle(rectangleId, user.uid, username)

        setSelectedRectangleIds(prev => new Set(prev).add(rectangleId))
        setPrimarySelectionId(rectangleId)
      }
    }
  }, [user, username, rectangles, selectedRectangleIds, primarySelectionId, selectionLocked, showToast])

  // NEW: Select multiple rectangles (used by drag selection box)
  const selectMultiple = useCallback(async (rectangleIds: string[]) => {
    if (selectionLocked) return
    if (!user || !username) return

    // Enforce selection limit
    if (rectangleIds.length > 25) {
      showToast('Selection too large (max 25 rectangles)')
      // Clear selection
      for (const prevId of selectedRectangleIds) {
        await canvasService.deselectRectangle(prevId, user.uid)
      }
      setSelectedRectangleIds(new Set())
      setPrimarySelectionId(null)
      return
    }

    // Clear previous selections
    for (const prevId of selectedRectangleIds) {
      await canvasService.deselectRectangle(prevId, user.uid)
    }

    // Select new ones sequentially, checking before each write
    const selected: string[] = []
    const skipped: string[] = []

    for (const id of rectangleIds) {
      const rect = rectangles.find(r => r.id === id)

      // Check right before writing to minimize race condition
      if (rect && (!rect.selectedBy || rect.selectedBy === user.uid)) {
        await canvasService.selectRectangle(id, user.uid, username)
        selected.push(id)
      } else {
        skipped.push(id)
      }
    }

    setSelectedRectangleIds(new Set(selected))
    setPrimarySelectionId(selected[selected.length - 1] || null)

    if (skipped.length > 0) {
      showToast(`Selected ${selected.length}, ${skipped.length} already taken by other users`)
    } else if (selected.length > 0) {
      showToast(`Selected ${selected.length} rectangles`)
    }
  }, [selectionLocked, user, username, rectangles, selectedRectangleIds, showToast])

  // NEW: Select all available rectangles (skip those selected by others)
  const selectAll = useCallback(async () => {
    if (selectionLocked) return
    if (!user || !username) return

    // Filter to only available rectangles
    const availableIds = rectangles
      .filter(r => !r.selectedBy || r.selectedBy === user.uid)
      .map(r => r.id)

    // Enforce selection limit
    if (availableIds.length > 25) {
      showToast(`Too many rectangles (${availableIds.length}). Max selection is 25.`)
      return
    }

    // Clear previous selections
    for (const prevId of selectedRectangleIds) {
      await canvasService.deselectRectangle(prevId, user.uid)
    }

    // Select all available ones
    for (const id of availableIds) {
      await canvasService.selectRectangle(id, user.uid, username)
    }

    setSelectedRectangleIds(new Set(availableIds))
    setPrimarySelectionId(availableIds[availableIds.length - 1] || null)

    showToast(`Selected all ${availableIds.length} rectangles`)
  }, [selectionLocked, user, username, rectangles, selectedRectangleIds, showToast])

  // NEW: Clear selection
  const clearSelection = useCallback(async () => {
    if (!user) return

    // Clear all selections in Firebase
    for (const id of selectedRectangleIds) {
      await canvasService.deselectRectangle(id, user.uid)
    }

    setSelectedRectangleIds(new Set())
    setPrimarySelectionId(null)
  }, [user, selectedRectangleIds])

  // NEW: Delete all selected rectangles
  const deleteSelectedRectangles = useCallback(async () => {
    const idsToDelete = Array.from(selectedRectangleIds)
    if (idsToDelete.length === 0) return

    // Delete all sequentially
    for (const id of idsToDelete) {
      await canvasService.deleteRectangle(id)
    }

    setSelectedRectangleIds(new Set())
    setPrimarySelectionId(null)

    const count = idsToDelete.length
    showToast(`Deleted ${count} rectangle${count > 1 ? 's' : ''}`)
  }, [selectedRectangleIds, showToast])

  // NEW: Change color of all selected rectangles
  const changeSelectedRectanglesColor = useCallback(async (color: string) => {
    const idsToUpdate = Array.from(selectedRectangleIds)
    if (idsToUpdate.length === 0) return

    // Update all sequentially
    for (const id of idsToUpdate) {
      await canvasService.updateRectangle(id, { color })
    }

    const count = idsToUpdate.length
    showToast(`Changed color of ${count} rectangle${count > 1 ? 's' : ''}`)
  }, [selectedRectangleIds, showToast])

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

  // UPDATED: Copy all selected rectangles to clipboard
  const copySelectedRectangles = useCallback(() => {
    const selected = rectangles.filter(r => selectedRectangleIds.has(r.id))
    if (selected.length === 0) {
      showToast('No rectangles selected to copy')
      return
    }

    setClipboardRectangles(selected)
    const count = selected.length
    showToast(`Copied ${count} rectangle${count > 1 ? 's' : ''}`)
  }, [rectangles, selectedRectangleIds, showToast])

  // UPDATED: Paste all clipboard rectangles with relative positioning
  const pasteRectangles = useCallback(async (): Promise<void> => {
    if (!user || !username) {
      setError('You must be signed in to paste')
      return
    }

    if (clipboardRectangles.length === 0) {
      showToast('Nothing to paste')
      return
    }

    try {
      const PASTE_OFFSET = 20
      const newIds: string[] = []

      // Calculate bounding box of all clipboard rectangles
      const minX = Math.min(...clipboardRectangles.map(r => r.x))
      const minY = Math.min(...clipboardRectangles.map(r => r.y))

      // Paste all rectangles with same relative positions
      for (const original of clipboardRectangles) {
        // Calculate position relative to group's top-left
        const relativeX = original.x - minX
        const relativeY = original.y - minY

        // Apply uniform offset to entire group
        const newX = Math.min(
          minX + PASTE_OFFSET + relativeX,
          CANVAS_WIDTH - original.width
        )
        const newY = Math.min(
          minY + PASTE_OFFSET + relativeY,
          CANVAS_HEIGHT - original.height
        )

        const input: RectangleInput = {
          x: newX,
          y: newY,
          width: original.width,
          height: original.height,
          color: original.color,
          createdBy: user.uid
        }

        const newRectangle = await canvasService.createRectangle(input)
        if (newRectangle) {
          newIds.push(newRectangle.id)
          // Select the newly pasted rectangle in Firebase
          await canvasService.selectRectangle(newRectangle.id, user.uid, username)
        }
      }

      // Select all newly pasted rectangles
      setSelectedRectangleIds(new Set(newIds))
      setPrimarySelectionId(newIds[newIds.length - 1] || null)

      const count = newIds.length
      showToast(`Pasted ${count} rectangle${count > 1 ? 's' : ''}`)
    } catch (err) {
      console.error('Error pasting rectangles:', err)
      setError(err instanceof Error ? err.message : 'Failed to paste rectangles')
    }
  }, [user, username, clipboardRectangles, showToast])

  // UPDATED: Duplicate rectangle (single selection only, kept for compatibility)
  const duplicateRectangle = useCallback(async (rectangleId: string): Promise<Rectangle | null> => {
    if (!user || !username) {
      setError('You must be signed in to duplicate')
      return null
    }

    const rectangle = rectangles.find(r => r.id === rectangleId)
    if (!rectangle) {
      showToast('Rectangle not found')
      return null
    }

    try {
      const DUPLICATE_OFFSET = 20
      const newX = Math.min(
        rectangle.x + DUPLICATE_OFFSET,
        CANVAS_WIDTH - rectangle.width
      )
      const newY = Math.min(
        rectangle.y + DUPLICATE_OFFSET,
        CANVAS_HEIGHT - rectangle.height
      )

      const input: RectangleInput = {
        x: newX,
        y: newY,
        width: rectangle.width,
        height: rectangle.height,
        color: rectangle.color,
        createdBy: user.uid
      }

      const duplicated = await canvasService.createRectangle(input)

      if (duplicated) {
        // Select the duplicated rectangle
        await canvasService.selectRectangle(duplicated.id, user.uid, username)
        setSelectedRectangleIds(new Set([duplicated.id]))
        setPrimarySelectionId(duplicated.id)
        showToast('Rectangle duplicated')
      }

      return duplicated
    } catch (err) {
      console.error('Error duplicating rectangle:', err)
      setError(err instanceof Error ? err.message : 'Failed to duplicate rectangle')
      return null
    }
  }, [user, username, rectangles, showToast])

  // Check if clipboard has data
  const hasClipboardData = useCallback(() => {
    return clipboardRectangles.length > 0
  }, [clipboardRectangles])

  // Bring rectangle to front
  const bringToFront = useCallback(async (rectangleId: string): Promise<void> => {
    try {
      await canvasService.bringToFront(rectangleId)
      setToastMessage('Brought to front')
    } catch (error) {
      console.error('Error bringing rectangle to front:', error)
      setError('Failed to bring rectangle to front')
    }
  }, [])

  // Send rectangle to back
  const sendToBack = useCallback(async (rectangleId: string): Promise<void> => {
    try {
      await canvasService.sendToBack(rectangleId)
      setToastMessage('Sent to back')
    } catch (error) {
      console.error('Error sending rectangle to back:', error)
      setError('Failed to send rectangle to back')
    }
  }, [])

  const value: CanvasContextType = {
    rectangles,
    selectedRectangleIds,
    primarySelectionId,
    loading,
    error,
    toastMessage,
    selectionLocked,
    createRectangle,
    updateRectangle,
    resizeRectangle,
    deleteRectangle,
    changeRectangleColor,
    selectRectangle,
    selectMultiple,
    selectAll,
    clearSelection,
    setSelectionLocked,
    deleteSelectedRectangles,
    changeSelectedRectanglesColor,
    copySelectedRectangles,
    pasteRectangles,
    duplicateRectangle,
    hasClipboardData,
    bringToFront,
    sendToBack,
    getViewportInfo,
    updateViewportInfo,
    clearError,
    clearToast,
    showToast,
    refreshRectangles
  }

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  )
}
