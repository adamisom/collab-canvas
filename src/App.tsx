import React from 'react'
import './App.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginForm from './components/auth/LoginForm'
import Header from './components/layout/Header'

const AppContent: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="App">
      <Header />
      <main className="app-main">
        <div className="canvas-placeholder">
          <h2>🎨 Canvas Coming Soon!</h2>
          <p>Authentication is working! Next up: Canvas with pan & zoom</p>
          <div className="feature-list">
            <div className="feature-item">✅ Anonymous authentication</div>
            <div className="feature-item">✅ Username storage</div>
            <div className="feature-item">✅ Session persistence</div>
            <div className="feature-item">🔄 Canvas workspace (Next PR)</div>
            <div className="feature-item">🔄 Real-time cursors (PR #5)</div>
            <div className="feature-item">🔄 Rectangle creation (PR #6)</div>
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
