import React from 'react'
import './Canvas.css'

interface ShapeModeSelectorProps {
  mode: 'rectangle' | 'circle'
  onModeChange: (mode: 'rectangle' | 'circle') => void
}

const ShapeModeSelector: React.FC<ShapeModeSelectorProps> = ({ mode, onModeChange }) => {
  return (
    <div className="shape-mode-selector">
      <button
        className={`shape-mode-btn ${mode === 'rectangle' ? 'active' : ''}`}
        onClick={() => onModeChange('rectangle')}
        title="Rectangle mode (R)"
        aria-label="Rectangle mode"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="14" height="10" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </button>
      <button
        className={`shape-mode-btn ${mode === 'circle' ? 'active' : ''}`}
        onClick={() => onModeChange('circle')}
        title="Circle mode (C)"
        aria-label="Circle mode"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </button>
    </div>
  )
}

export default ShapeModeSelector

