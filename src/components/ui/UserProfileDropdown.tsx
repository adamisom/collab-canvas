import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserProfile } from '../../contexts/UserProfilesContext'
import { getUserColor } from '../../utils/userColors'
import './UserProfileDropdown.css'

const UserProfileDropdown: React.FC = () => {
  const { user, signOut } = useAuth()
  const { initials } = useUserProfile(user?.uid || '')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!user) return null

  const displayName = user.displayName || user.email || 'User'
  const userColor = getUserColor(user.uid)

  return (
    <div className="user-profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div 
          className="avatar-initials"
          style={{ backgroundColor: userColor }}
        >
          {initials}
        </div>
        <span className="display-name">{displayName}</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="user-info">
            <div 
              className="avatar-initials-large"
              style={{ backgroundColor: userColor }}
            >
              {initials}
            </div>
            <div className="user-details">
              <div className="name">{displayName}</div>
              {user.email && <div className="email">{user.email}</div>}
            </div>
          </div>

          <div className="dropdown-divider" />

          <button
            className="dropdown-item"
            onClick={() => {
              signOut()
              setIsOpen(false)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 14H4C3.46957 14 2.96086 13.7893 2.58579 13.4142C2.21071 13.0391 2 12.5304 2 12V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M11 11L14 8L11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 8H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default React.memo(UserProfileDropdown)

