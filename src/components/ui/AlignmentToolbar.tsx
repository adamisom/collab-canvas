import React from 'react'
import './AlignmentToolbar.css'

export type AlignmentType = 
  | 'left' 
  | 'center-horizontal' 
  | 'right' 
  | 'top' 
  | 'center-vertical' 
  | 'bottom'
  | 'distribute-horizontal'
  | 'distribute-vertical'

interface AlignmentToolbarProps {
  selectedCount: number
  onAlign: (type: AlignmentType) => void
}

const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({ 
  selectedCount, 
  onAlign 
}) => {
  if (selectedCount < 2) return null

  const canDistribute = selectedCount >= 3

  return (
    <div className="alignment-toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">Align:</span>
        
        <button
          onClick={() => onAlign('left')}
          title="Align Left (Cmd+Shift+L)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="2" y="4" width="2" height="12" fill="currentColor" />
            <rect x="6" y="6" width="8" height="3" fill="currentColor" />
            <rect x="6" y="11" width="12" height="3" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => onAlign('center-horizontal')}
          title="Align Center Horizontal (Cmd+Shift+H)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="9" y="2" width="2" height="16" fill="currentColor" />
            <rect x="4" y="6" width="12" height="3" fill="currentColor" />
            <rect x="6" y="11" width="8" height="3" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => onAlign('right')}
          title="Align Right (Cmd+Shift+R)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="16" y="4" width="2" height="12" fill="currentColor" />
            <rect x="6" y="6" width="8" height="3" fill="currentColor" />
            <rect x="2" y="11" width="12" height="3" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="toolbar-section">
        <button
          onClick={() => onAlign('top')}
          title="Align Top (Cmd+Shift+T)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="4" y="2" width="12" height="2" fill="currentColor" />
            <rect x="6" y="6" width="3" height="8" fill="currentColor" />
            <rect x="11" y="6" width="3" height="12" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => onAlign('center-vertical')}
          title="Align Center Vertical (Cmd+Shift+V)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="2" y="9" width="16" height="2" fill="currentColor" />
            <rect x="6" y="4" width="3" height="12" fill="currentColor" />
            <rect x="11" y="6" width="3" height="8" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => onAlign('bottom')}
          title="Align Bottom (Cmd+Shift+B)"
          className="toolbar-button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="4" y="16" width="12" height="2" fill="currentColor" />
            <rect x="6" y="6" width="3" height="8" fill="currentColor" />
            <rect x="11" y="2" width="3" height="12" fill="currentColor" />
          </svg>
        </button>
      </div>

      {canDistribute && (
        <div className="toolbar-section">
          <span className="toolbar-label">Distribute:</span>
          
          <button
            onClick={() => onAlign('distribute-horizontal')}
            title="Distribute Horizontally"
            className="toolbar-button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <rect x="2" y="7" width="3" height="6" fill="currentColor" />
              <rect x="8.5" y="7" width="3" height="6" fill="currentColor" />
              <rect x="15" y="7" width="3" height="6" fill="currentColor" />
            </svg>
          </button>
          
          <button
            onClick={() => onAlign('distribute-vertical')}
            title="Distribute Vertically"
            className="toolbar-button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <rect x="7" y="2" width="6" height="3" fill="currentColor" />
              <rect x="7" y="8.5" width="6" height="3" fill="currentColor" />
              <rect x="7" y="15" width="6" height="3" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default AlignmentToolbar

