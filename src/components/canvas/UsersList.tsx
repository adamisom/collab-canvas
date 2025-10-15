import React from 'react'
import type { CursorPosition } from '../../services/cursorService'

interface UsersListProps {
  cursors: Record<string, CursorPosition>
}

// Function to get user color (same logic as in Cursor.tsx)
const getUserColor = (userId: string): string => {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

const UsersList: React.FC<UsersListProps> = ({ cursors }) => {
  const otherUsers = Object.values(cursors).filter(cursor => cursor.username)

  if (otherUsers.length === 0) {
    return (
      <div className="users-list">
        <div className="users-list-title">Active Users</div>
        <div className="users-list-items">
          <div className="user-item">No other users online</div>
        </div>
      </div>
    )
  }

  return (
    <div className="users-list">
      <div className="users-list-title">Active Users</div>
      <div className="users-list-items">
        {otherUsers.map((cursor) => (
          <div key={cursor.userId} className="user-item">
            <div 
              className="user-color-dot" 
              style={{ backgroundColor: getUserColor(cursor.userId) }}
            />
            <span className="user-name">{cursor.username}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UsersList
