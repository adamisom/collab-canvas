import React from 'react'
import UserProfileDropdown from '../ui/UserProfileDropdown'
import './Header.css'

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-section">
          <h1>CollabCanvas</h1>
          <span className="tagline">Real-time collaborative canvas</span>
        </div>
        
        <div className="user-section">
          <UserProfileDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header
