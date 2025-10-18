import React from 'react'
import './App.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CanvasProvider, useCanvas } from './contexts/CanvasContext'
import { useCursors } from './hooks/useCursors'
import LoginForm from './components/auth/LoginForm'
import Header from './components/layout/Header'
import Canvas from './components/canvas/Canvas'
import UsersList from './components/canvas/UsersList'
import KeyboardShortcuts from './components/canvas/KeyboardShortcuts'
import AIChat from './components/ai/AIChat'

const CanvasContent: React.FC = () => {
  const { loading, error } = useCanvas()
  const { cursors } = useCursors()

  if (loading) {
    return (
      <main className="app-main">
        <div className="canvas-loading">
          <div className="loading-spinner"></div>
          <p>Loading canvas...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="app-main canvas-main">
      <div className="canvas-sidebar">
        <div className="canvas-status">
          <h3>🎨 Canvas Workspace</h3>
          
          {error && (
            <div className="status-item error">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {/* Users List */}
          <div className="sidebar-section">
            <UsersList cursors={cursors} />
          </div>
          
          
          <KeyboardShortcuts />
        </div>
      </div>
      
      <div className="canvas-area">
        <Canvas />
      </div>
      
      {/* AI Chat Interface */}
      <AIChat />
    </main>
  )
}

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
      <CanvasProvider>
        <CanvasContent />
      </CanvasProvider>
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
