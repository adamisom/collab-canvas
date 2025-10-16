import React from 'react'
import type { CursorPosition } from '../../services/cursorService'
import { getUserColor } from '../../utils/userColors'

interface UsersListProps {
  cursors: Record<string, CursorPosition>
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
