import React, { useState } from 'react'
import type { AICommandEntry } from '../../services/aiCommandHistory'
import './AICommandHistory.css'

interface AICommandHistoryProps {
  history: AICommandEntry[]
  onCommandClick: (command: string) => void
}

const AICommandHistory: React.FC<AICommandHistoryProps> = ({ history, onCommandClick }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (history.length === 0) return null

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="ai-command-history">
      <button 
        className="history-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>📋 Recent Commands ({history.length})</span>
        <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="history-list">
          {history.map((entry) => (
            <div
              key={entry.id}
              className={`history-item ${entry.success ? 'success' : 'error'}`}
              onClick={() => onCommandClick(entry.userInput)}
              title="Click to reuse this command"
            >
              <div className="history-header">
                <span className="history-status">
                  {entry.success ? '✓' : '✗'}
                </span>
                <span className="history-time">{formatTime(entry.timestamp)}</span>
              </div>
              <div className="history-command">{entry.userInput}</div>
              <div className="history-result">{entry.resultMessage}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AICommandHistory

