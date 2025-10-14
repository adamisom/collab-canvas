import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './LoginForm.css'

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const { signIn, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    if (username.length < 2) {
      setError('Username must be at least 2 characters')
      return
    }

    if (username.length > 20) {
      setError('Username must be less than 20 characters')
      return
    }

    try {
      setError('')
      await signIn(username.trim())
    } catch (error) {
      console.error('Sign in error:', error)
      setError('Failed to sign in. Please try again.')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to CollabCanvas</h2>
        <p>Enter a username to start collaborating!</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              autoFocus
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            disabled={loading || !username.trim()}
            className="login-button"
          >
            {loading ? 'Signing in...' : 'Start Collaborating'}
          </button>
        </form>
        
        <div className="login-info">
          <p>👋 No password needed - just pick a username!</p>
          <p>🚀 You'll be able to create and move rectangles in real-time</p>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
