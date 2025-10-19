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
            <div className="shortcut-item">
              <div className="shortcut-key">🖱️ Click+Drag</div>
              <div className="shortcut-desc">to pan</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">Space+Drag</div>
              <div className="shortcut-desc">Pan mode</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">🔍 Scroll</div>
              <div className="shortcut-desc">to zoom</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">⌨️ Arrow keys</div>
              <div className="shortcut-desc">to navigate</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">0</div>
              <div className="shortcut-desc">Reset zoom</div>
            </div>
          </div>
          
          <div className="shortcuts-section">
            <strong>Selection:</strong>
            <div className="shortcut-item">
              <div className="shortcut-key">⇧+Drag</div>
              <div className="shortcut-desc">Select box</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">⌘/Ctrl+A</div>
              <div className="shortcut-desc">Select all</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">Esc</div>
              <div className="shortcut-desc">Clear selection</div>
            </div>
          </div>
          
          <div className="shortcuts-section">
            <strong>Shape Modes:</strong>
            <div className="shortcut-item">
              <div className="shortcut-key">R</div>
              <div className="shortcut-desc">Rectangle mode</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">C</div>
              <div className="shortcut-desc">Circle mode</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">L</div>
              <div className="shortcut-desc">Line mode</div>
            </div>
          </div>
          
          <div className="shortcuts-section">
            <strong>Shape Operations:</strong>
            <div className="shortcut-item">
              <div className="shortcut-key">⇧+Arrows</div>
              <div className="shortcut-desc">Resize</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">⌘/Ctrl+C</div>
              <div className="shortcut-desc">Copy</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">⌘/Ctrl+V</div>
              <div className="shortcut-desc">Paste</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">⌘/Ctrl+D</div>
              <div className="shortcut-desc">Duplicate</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">⌘/Ctrl+]</div>
              <div className="shortcut-desc">To front</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">⌘/Ctrl+[</div>
              <div className="shortcut-desc">To back</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-key">Del/Backspace</div>
              <div className="shortcut-desc">Delete</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KeyboardShortcuts

