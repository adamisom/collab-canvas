import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useComments } from '../../contexts/CommentsContext'
import CommentBubble from './CommentBubble'
import './CommentsPanel.css'

interface CommentsPanelProps {
  shapeId: string
  onClose: () => void
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({ shapeId, onClose }) => {
  const { user } = useAuth()
  const { getCommentsForShape, addComment, deleteComment } = useComments()
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const shapeComments = getCommentsForShape(shapeId)
    .sort((a, b) => b.createdAt - a.createdAt)  // Newest first

  const handleSubmit = async () => {
    if (!commentText.trim() || commentText.length > 500 || isSubmitting) return

    setIsSubmitting(true)
    try {
      await addComment(shapeId, commentText.trim())
      setCommentText('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const charCount = commentText.length
  const isValid = charCount >= 1 && charCount <= 500

  return (
    <div className="comments-panel">
      <div className="panel-header">
        <h3>Comments ({shapeComments.length})</h3>
        <button onClick={onClose} className="close-button">✕</button>
      </div>

      {/* Add comment input at TOP */}
      <div className="comment-input-container">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          maxLength={500}
        />
        <div className="comment-input-actions">
          <span className={`comment-char-count ${!isValid && charCount > 0 ? 'error' : ''}`}>
            {charCount}/500
          </span>
          <button
            className="submit"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Comments list (newest first) */}
      <div className="comments-list">
        {shapeComments.length === 0 ? (
          <div className="empty-state">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          shapeComments.map(comment => (
            <CommentBubble
              key={comment.id}
              comment={comment}
              onDelete={() => deleteComment(comment.id)}
              isOwner={comment.authorId === user?.uid}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default CommentsPanel

