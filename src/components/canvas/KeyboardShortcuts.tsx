import React, { useState, useEffect } from 'react'
import './Canvas.css'

const KeyboardShortcuts: React.FC = () => {
  // Keyboard shortcuts visibility (persisted in localStorage)
  const [showShortcuts, setShowShortcuts] = useState(() => {
    const stored = localStorage.getItem('collabcanvas_showShortcuts')
    return stored !== null ? stored === 'true' : true // Default to expanded for new users
  })
  
  // Persist showShortcuts to localStorage
  useEffect(() => {
    localStorage.setItem('collabcanvas_showShortcuts', String(showShortcuts))
  }, [showShortcuts])

  return (
    <div className="keyboard-shortcuts">
      <button 
        className="shortcuts-toggle"
        onClick={() => setShowShortcuts(!showShortcuts)}
        aria-expanded={showShortcuts}
      >
        ⌨️ Keyboard Shortcuts {showShortcuts ? '▼' : '▶'}
      </button>
      
      {showShortcuts && (
        <div className="shortcuts-expanded">
          <div className="shortcuts-section">
            <strong>Canvas Navigation:</strong>
            <span>🖱️ Click+Drag to pan</span>
            <span>🔍 Scroll to zoom</span>
            <span>⌨️ Arrow keys to navigate</span>
            <span>0 - Reset zoom and position</span>
          </div>
          
          <div className="shortcuts-section">
            <strong>Rectangle Operations:</strong>
            <span>⇧+Arrows - Resize selected</span>
            <span>⌘/Ctrl+C - Copy selected</span>
            <span>⌘/Ctrl+V - Paste</span>
            <span>⌘/Ctrl+D - Duplicate selected</span>
            <span>⌘/Ctrl+] - Bring to front</span>
            <span>⌘/Ctrl+[ - Send to back</span>
            <span>Delete/Backspace - Delete selected</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default KeyboardShortcuts

