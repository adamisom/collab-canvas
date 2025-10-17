/**
 * useAIAgent Hook
 * React hook for AI agent integration
 * Provides state management and command execution
 */

import { useState, useCallback, useMemo } from 'react'
import { useCanvas } from '../contexts/CanvasContext'
import { AIAgent, type AIAgentResult } from '../services/aiAgent'

export interface UseAIAgentReturn {
  // State
  isProcessing: boolean
  lastResult: AIAgentResult | null
  
  // Methods
  processCommand: (userMessage: string) => Promise<void>
  clearResult: () => void
}

export function useAIAgent(): UseAIAgentReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<AIAgentResult | null>(null)
  
  const canvasContext = useCanvas()

  // Create AI agent instance (memoized)
  const agent = useMemo(() => new AIAgent(canvasContext), [canvasContext])

  /**
   * Process AI command
   */
  const processCommand = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) {
      setLastResult({
        success: false,
        error: {
          message: 'Please enter a command',
          retryable: false
        }
      })
      return
    }

    setIsProcessing(true)
    setLastResult(null)

    try {
      const result = await agent.processCommand(userMessage)
      setLastResult(result)
    } catch (error) {
      // This shouldn't happen as agent.processCommand catches all errors
      console.error('Unexpected error in processCommand:', error)
      setLastResult({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          retryable: true
        }
      })
    } finally {
      setIsProcessing(false)
    }
  }, [agent])

  /**
   * Clear last result
   */
  const clearResult = useCallback(() => {
    setLastResult(null)
  }, [])

  return {
    isProcessing,
    lastResult,
    processCommand,
    clearResult
  }
}

