import { firebaseDatabase, dbRef, dbPush, dbSet, dbRemove, dbOnValue } from './firebaseService'
import type { Comment } from '../types/comment'

const LAST_VIEWED_KEY = 'collab-canvas-comments-last-viewed'

export const createComment = async (comment: Omit<Comment, 'id'>): Promise<Comment | null> => {
  try {
    const commentsRef = dbRef(firebaseDatabase, 'comments')
    const newCommentRef = dbPush(commentsRef)

    const fullComment: Comment = {
      ...comment,
      id: newCommentRef.key!
    }

    await dbSet(newCommentRef, fullComment)
    return fullComment
  } catch (error) {
    console.error('Error creating comment:', error)
    throw error
  }
}

export const deleteComment = async (commentId: string): Promise<void> => {
  // Delete single comment (no threading, so no replies to worry about)
  const commentRef = dbRef(firebaseDatabase, `comments/${commentId}`)
  await dbRemove(commentRef)
}

export const onCommentsChange = (callback: (comments: Comment[]) => void): (() => void) => {
  const commentsRef = dbRef(firebaseDatabase, 'comments')
  
  return dbOnValue(commentsRef, (snapshot) => {
    const comments: Comment[] = []
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        comments.push(child.val())
      })
    }
    callback(comments)
  })
}

// === Unread Tracking (localStorage - Option A) ===

export const getLastViewedAt = (shapeId: string): number => {
  try {
    const data = localStorage.getItem(LAST_VIEWED_KEY)
    if (!data) return 0
    const parsed = JSON.parse(data)
    return parsed[shapeId] || 0
  } catch {
    return 0
  }
}

export const updateLastViewedAt = (shapeId: string, timestamp: number): void => {
  try {
    const data = localStorage.getItem(LAST_VIEWED_KEY)
    const parsed = data ? JSON.parse(data) : {}
    parsed[shapeId] = timestamp
    localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify(parsed))
  } catch (error) {
    console.error('Error updating last viewed timestamp:', error)
  }
}

