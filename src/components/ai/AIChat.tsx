/**
 * AI Chat Component
 * Interface for sending AI commands and displaying results
 */

import React, { useState, useRef, useEffect } from 'react'
import { useAIAgent } from '../../hooks/useAIAgent'
import AICommandHistory from './AICommandHistory'
import { getCommandHistory, addCommandToHistory, type AICommandEntry } from '../../services/aiCommandHistory'
import './AIChat.css'

export const AIChat: React.FC = () => {
  const [input, setInput] = useState('')
  const [lastCommand, setLastCommand] = useState('')
  const [history, setHistory] = useState<AICommandEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { isProcessing, lastResult, processCommand, clearResult } = useAIAgent()

  // Load command history on mount
  useEffect(() => {
    setHistory(getCommandHistory())
  }, [])

  // Focus input after result is cleared or on mount
  useEffect(() => {
    if (!lastResult && inputRef.current) {
      inputRef.current.focus()
    }
  }, [lastResult])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isProcessing) return

    const command = input.trim()
    setLastCommand(command)
    setInput('')
    
    await processCommand(command)
  }

  // Save to history when result changes
  useEffect(() => {
    if (lastResult && lastCommand) {
      addCommandToHistory({
        userInput: lastCommand,
        success: lastResult.success,
        resultMessage: lastResult.success 
          ? (lastResult.message || 'Success') 
          : (lastResult.error?.message || 'Command failed')
      })
      
      // Refresh history display
      setHistory(getCommandHistory())
    }
  }, [lastResult, lastCommand])

  const handleRetry = async () => {
    if (lastCommand) {
      await processCommand(lastCommand)
    }
  }

  const handleClear = () => {
    clearResult()
    setInput('')
    inputRef.current?.focus()
  }

  const handleCommandClick = (command: string) => {
    setInput(command)
    inputRef.current?.focus()
  }

  return (
    <div className="ai-chat">
      <div className="ai-chat-header">
        <h3>AI Canvas Agent</h3>
        <span className="ai-chat-hint">
          Try: "Create a blue rectangle" or "Make it bigger"
        </span>
      </div>

      {/* Command History */}
      <AICommandHistory 
        history={history}
        onCommandClick={handleCommandClick}
      />

      <form onSubmit={handleSubmit} className="ai-chat-form">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell me what to do..."
          className="ai-chat-input"
          disabled={isProcessing}
        />
        <button
          type="submit"
          className="ai-chat-submit"
          disabled={isProcessing || !input.trim()}
        >
          {isProcessing ? 'Processing...' : 'Send'}
        </button>
      </form>

      {/* Loading State */}
      {isProcessing && (
        <div className="ai-chat-message ai-chat-loading">
          <div className="ai-chat-spinner"></div>
          <span>Processing your command...</span>
        </div>
      )}

      {/* Success Message */}
      {lastResult && lastResult.success && (
        <div className="ai-chat-message ai-chat-success">
          <div className="ai-chat-message-icon">✓</div>
          <div className="ai-chat-message-content">
            <div className="ai-chat-message-text">
              {lastResult.message || 'Command executed successfully!'}
            </div>
            <button
              onClick={handleClear}
              className="ai-chat-message-button ai-chat-button-ok"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {lastResult && !lastResult.success && lastResult.error && (
        <div className="ai-chat-message ai-chat-error">
          <div className="ai-chat-message-icon">✕</div>
          <div className="ai-chat-message-content">
            <div className="ai-chat-message-text">
              {lastResult.error.message}
            </div>
            <div className="ai-chat-message-actions">
              {lastResult.error.retryable ? (
                <>
                  <button
                    onClick={handleRetry}
                    className="ai-chat-message-button ai-chat-button-retry"
                  >
                    Retry
                  </button>
                  <button
                    onClick={handleClear}
                    className="ai-chat-message-button ai-chat-button-cancel"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleClear}
                  className="ai-chat-message-button ai-chat-button-ok"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIChat

