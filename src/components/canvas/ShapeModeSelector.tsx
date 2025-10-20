import React from 'react'
import './Canvas.css'

interface ShapeModeSelectorProps {
  mode: 'rectangle' | 'circle' | 'line' | 'text'  // PR #8: Added 'text'
  onModeChange: (mode: 'rectangle' | 'circle' | 'line' | 'text') => void  // PR #8: Added 'text'
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
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="14" height="10" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </button>
      <button
        className={`shape-mode-btn ${mode === 'circle' ? 'active' : ''}`}
        onClick={() => onModeChange('circle')}
        title="Circle mode (C)"
        aria-label="Circle mode"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </button>
      <button
        className={`shape-mode-btn ${mode === 'line' ? 'active' : ''}`}
        onClick={() => onModeChange('line')}
        title="Line mode (L)"
        aria-label="Line mode"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="15" x2="17" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button
        className={`shape-mode-btn ${mode === 'text' ? 'active' : ''}`}
        onClick={() => onModeChange('text')}
        title="Text mode (T)"
        aria-label="Text mode"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="10" y="15" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor">T</text>
        </svg>
      </button>
    </div>
  )
}

export default ShapeModeSelector

