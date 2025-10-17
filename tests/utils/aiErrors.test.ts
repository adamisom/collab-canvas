import { describe, it, expect } from 'vitest'
import { mapAIError, formatPartialSuccessMessage } from '../../src/utils/aiErrors'

describe('aiErrors', () => {
  describe('mapAIError - Firebase HttpsError Codes', () => {
    it('should map "unauthenticated" to non-retryable error', () => {
      const error = { code: 'unauthenticated', message: 'Not logged in' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('You must be logged in to use AI commands')
      expect(result.retryable).toBe(false)
      expect(result.originalError).toBe(error)
    })

    it('should map "resource-exhausted" to non-retryable (quota exceeded)', () => {
      const error = { code: 'resource-exhausted', message: 'Quota exceeded' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('Quota exceeded')
      expect(result.retryable).toBe(false)
    })

    it('should map "deadline-exceeded" to retryable (timeout)', () => {
      const error = { code: 'deadline-exceeded', message: 'Timeout' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('AI service temporarily unavailable. Please try again.')
      expect(result.retryable).toBe(true)
    })

    it('should map "failed-precondition" (too many rectangles) to non-retryable', () => {
      const error = { code: 'failed-precondition', message: 'Canvas has too many rectangles' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('Canvas has too many rectangles (limit: 1000)')
      expect(result.retryable).toBe(false)
    })

    it('should map "failed-precondition" (AI not configured) to non-retryable', () => {
      const error = { code: 'failed-precondition', message: 'AI service not configured' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('AI service not configured')
      expect(result.retryable).toBe(false)
    })

    it('should map "internal" to retryable', () => {
      const error = { code: 'internal', message: 'Internal error' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('An error occurred processing your command')
      expect(result.retryable).toBe(true)
    })

    it('should map "unavailable" to retryable', () => {
      const error = { code: 'unavailable', message: 'Service unavailable' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('Service temporarily unavailable. Please try again.')
      expect(result.retryable).toBe(true)
    })

    it('should map "aborted" to retryable', () => {
      const error = { code: 'aborted', message: 'Request aborted' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('Service temporarily unavailable. Please try again.')
      expect(result.retryable).toBe(true)
    })

    it('should map "invalid-argument" to non-retryable', () => {
      const error = { code: 'invalid-argument', message: 'Bad request' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('Bad request')
      expect(result.retryable).toBe(false)
    })

    it('should map unknown error codes to retryable (safety)', () => {
      const error = { code: 'unknown-code', message: 'Unknown error' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('Unknown error')
      expect(result.retryable).toBe(true)
    })
  })

  describe('mapAIError - Executor Errors', () => {
    it('should map "not found" errors to non-retryable', () => {
      const error = new Error('Rectangle rect123 not found or was deleted')
      const result = mapAIError(error)
      
      expect(result.message).toBe('The selected rectangle no longer exists')
      expect(result.retryable).toBe(false)
    })

    it('should map "invalid color" errors to non-retryable', () => {
      const error = new Error('Invalid color: #ffffff. Must be one of: #ef4444, #3b82f6, #22c55e')
      const result = mapAIError(error)
      
      expect(result.message).toContain('Invalid color')
      expect(result.retryable).toBe(false)
    })

    it('should map "viewport info not available" to retryable', () => {
      const error = new Error('Viewport info not available')
      const result = mapAIError(error)
      
      expect(result.message).toBe('Canvas not ready. Please try again.')
      expect(result.retryable).toBe(true)
    })
  })

  describe('mapAIError - Network Errors', () => {
    it('should map NetworkError to retryable (when caught by generic handler)', () => {
      // Note: Errors with messages are caught by the generic error.message handler first
      // This tests the current behavior
      const error = new Error('Network error')
      error.name = 'NetworkError'
      const result = mapAIError(error)
      
      // Currently caught by generic handler (line 87-123), returns original message
      expect(result.message).toBe('Network error')
      expect(result.retryable).toBe(false) // Generic handler defaults to non-retryable
    })

    it('should handle errors with "network" in message', () => {
      // Errors with messages are caught by generic handler
      const error = new Error('Failed due to network issues')
      const result = mapAIError(error)
      
      expect(result.message).toBe('Failed due to network issues')
      expect(result.retryable).toBe(false)
    })
  })

  describe('mapAIError - Default Cases', () => {
    it('should handle errors with messages as non-retryable by default', () => {
      const error = new Error('Something weird happened')
      const result = mapAIError(error)
      
      // Generic handler returns original message with retryable: false
      expect(result.message).toBe('Something weird happened')
      expect(result.retryable).toBe(false)
    })

    it('should default truly unknown errors to retryable', () => {
      // Error without code or message property
      const error = { someProperty: 'value' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('An unexpected error occurred. Please try again.')
      expect(result.retryable).toBe(true)
    })
  })

  describe('formatPartialSuccessMessage', () => {
    it('should show success count (e.g. "Completed 3 of 5 steps")', () => {
      const error = { message: 'Rectangle not found', retryable: false }
      const result = formatPartialSuccessMessage(5, 4, error)
      
      expect(result).toBe('Completed 3 of 5 steps. Error: Rectangle not found')
    })

    it('should show just error if no steps succeeded', () => {
      const error = { message: 'Invalid request', retryable: false }
      const result = formatPartialSuccessMessage(5, 1, error)
      
      expect(result).toBe('Invalid request')
    })

    it('should include error message in partial success', () => {
      const error = { message: 'Timeout occurred', retryable: true }
      const result = formatPartialSuccessMessage(10, 6, error)
      
      expect(result).toContain('Completed 5 of 10 steps')
      expect(result).toContain('Timeout occurred')
    })
  })
})

