import React from 'react'
import './App.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CanvasProvider, useCanvas } from './contexts/CanvasContext'
import LoginForm from './components/auth/LoginForm'
import Header from './components/layout/Header'
import Canvas from './components/canvas/Canvas'

const CanvasContent: React.FC = () => {
  const { rectangles, selectedRectangleId, loading, error, createRectangle } = useCanvas()

  const handleTestCreate = async () => {
    const rect = await createRectangle(100, 100)
    console.log('Created rectangle:', rect)
  }

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
          <div className="status-item">
            <strong>Rectangles:</strong> {rectangles.length}
          </div>
          <div className="status-item">
            <strong>Selected:</strong> {selectedRectangleId ? 'Yes' : 'None'}
          </div>
          {error && (
            <div className="status-item error">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <div className="test-controls">
            <button onClick={handleTestCreate} className="test-button">
              Create Test Rectangle
            </button>
          </div>
          
          <div className="canvas-instructions">
            <h4>🖱️ How to Use:</h4>
            <ul>
              <li>Click empty space to create rectangle</li>
              <li>Click rectangle to select it</li>
              <li>Drag selected rectangle to move it</li>
              <li>See real-time updates from other users</li>
            </ul>
          </div>
          
          <div className="feature-list">
            <div className="feature-item">✅ Anonymous authentication</div>
            <div className="feature-item">✅ Canvas service layer</div>
            <div className="feature-item">✅ Real-time Firebase sync</div>
            <div className="feature-item">✅ Pan & zoom canvas</div>
            <div className="feature-item">✅ Multi-user cursors</div>
            <div className="feature-item">✅ Rectangle creation & sync</div>
            <div className="feature-item">🔄 Rectangle selection & movement (Next PR)</div>
          </div>
        </div>
      </div>
      
      <div className="canvas-area">
        <Canvas />
      </div>
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
