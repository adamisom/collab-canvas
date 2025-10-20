import React from 'react'
import type { Comment } from '../../types/comment'
import { getUserColor } from '../../utils/userColors'
import './CommentBubble.css'

interface CommentBubbleProps {
  comment: Comment
  onDelete: () => void
  isOwner: boolean
}

// Helper to derive initials (reuse from Phase 3E pattern)
const getInitials = (name: string): string => {
  if (!name) return '?'
  const initials = name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return initials || '?'
}

const CommentBubble: React.FC<CommentBubbleProps> = ({
  comment,
  onDelete,
  isOwner
}) => {
  const initials = getInitials(comment.authorName)
  const userColor = getUserColor(comment.authorId)

  return (
    <div className="comment-bubble">
      <div className="comment-header">
        <div 
          className="comment-avatar-initials"
          style={{ backgroundColor: userColor }}
        >
          {initials}
        </div>
        <div className="comment-info">
          <span className="author">{comment.authorName}</span>
          <span className="timestamp">
            {new Date(comment.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="comment-body">
        <p className="comment-text">{comment.text}</p>

        {isOwner && (
          <div className="comment-actions">
            <button onClick={onDelete} className="danger">Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CommentBubble

