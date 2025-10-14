import React from 'react'
import './App.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CanvasProvider, useCanvas } from './contexts/CanvasContext'
import LoginForm from './components/auth/LoginForm'
import Header from './components/layout/Header'

const CanvasContent: React.FC = () => {
  const { rectangles, loading, error, createRectangle } = useCanvas()

  const handleTestCreate = async () => {
    const rect = await createRectangle(100, 100)
    console.log('Created rectangle:', rect)
  }

  return (
    <main className="app-main">
      <div className="canvas-placeholder">
        <h2>🎨 Canvas Data Layer Ready!</h2>
        <p>Canvas context and service layer are working!</p>
        
        <div className="canvas-status">
          <div className="status-item">
            <strong>Rectangles:</strong> {rectangles.length}
          </div>
          <div className="status-item">
            <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
          </div>
          {error && (
            <div className="status-item error">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div className="test-controls">
          <button onClick={handleTestCreate} className="test-button">
            Create Test Rectangle
          </button>
        </div>
        
        <div className="feature-list">
          <div className="feature-item">✅ Anonymous authentication</div>
          <div className="feature-item">✅ Canvas service layer</div>
          <div className="feature-item">✅ Rectangle data management</div>
          <div className="feature-item">✅ Real-time Firebase sync</div>
          <div className="feature-item">✅ Unit tests passing</div>
          <div className="feature-item">🔄 Visual canvas (Next PR)</div>
        </div>

        {rectangles.length > 0 && (
          <div className="rectangles-list">
            <h4>Rectangle Data:</h4>
            <pre>{JSON.stringify(rectangles, null, 2)}</pre>
          </div>
        )}
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
