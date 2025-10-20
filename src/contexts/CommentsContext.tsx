import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import * as commentsService from '../services/commentsService'
import type { Comment } from '../types/comment'

interface CommentsContextType {
  comments: Comment[]
  addComment: (shapeId: string, text: string) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
  getCommentsForShape: (shapeId: string) => Comment[]
  hasUnreadComments: (shapeId: string) => boolean
  markShapeAsRead: (shapeId: string) => void
}

const CommentsContext = createContext<CommentsContextType | undefined>(undefined)

export const CommentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])

  // Listen to comments collection
  useEffect(() => {
    if (!user) {
      setComments([])
      return
    }

    const unsubscribe = commentsService.onCommentsChange((newComments) => {
      setComments(newComments)
    })

    return unsubscribe
  }, [user])

  const addComment = useCallback(async (shapeId: string, text: string) => {
    if (!user || !text.trim() || text.length > 500) return

    await commentsService.createComment({
      shapeId,
      text: text.trim(),
      authorId: user.uid,
      authorName: user.displayName || user.email?.split('@')[0] || 'User',
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }, [user])

  const deleteComment = useCallback(async (commentId: string) => {
    await commentsService.deleteComment(commentId)
  }, [])

  const getCommentsForShape = useCallback((shapeId: string) => {
    return comments.filter(c => c.shapeId === shapeId)
  }, [comments])

  // Unread tracking using localStorage (Option A - Simple)
  const hasUnreadComments = useCallback((shapeId: string) => {
    const lastViewed = commentsService.getLastViewedAt(shapeId)
    const shapeComments = comments.filter(c => c.shapeId === shapeId)
    return shapeComments.some(c => c.createdAt > lastViewed && c.authorId !== user?.uid)
  }, [comments, user])

  const markShapeAsRead = useCallback((shapeId: string) => {
    commentsService.updateLastViewedAt(shapeId, Date.now())
  }, [])

  return (
    <CommentsContext.Provider value={{
      comments,
      addComment,
      deleteComment,
      getCommentsForShape,
      hasUnreadComments,
      markShapeAsRead
    }}>
      {children}
    </CommentsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useComments = () => {
  const context = useContext(CommentsContext)
  if (!context) {
    throw new Error('useComments must be used within CommentsProvider')
  }
  return context
}

