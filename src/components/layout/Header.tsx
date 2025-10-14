import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './Header.css'

const Header: React.FC = () => {
  const { username, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-section">
          <h1>CollabCanvas</h1>
          <span className="tagline">Real-time collaborative canvas</span>
        </div>
        
        <div className="user-section">
          <div className="user-info">
            <span className="username-label">Signed in as:</span>
            <span className="username">{username}</span>
          </div>
          <button onClick={handleSignOut} className="sign-out-button">
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
