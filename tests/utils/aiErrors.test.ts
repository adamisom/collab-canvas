/**
 * Tests for AI Error Mapping Utilities
 * Ensures errors are correctly classified as retryable/non-retryable
 * and mapped to user-friendly messages
 */

import { describe, it, expect } from 'vitest'
import { mapAIError, formatPartialSuccessMessage } from '../../src/utils/aiErrors'
import { mockFirebaseErrors, mockExecutorErrors, mockNetworkError, mockUnknownError } from '../fixtures/aiAgent.fixtures'

describe('mapAIError', () => {
  describe('Firebase HttpsError Codes', () => {
    it('should map "unauthenticated" to non-retryable with correct message', () => {
      const result = mapAIError(mockFirebaseErrors.unauthenticated)
      
      expect(result.message).toBe('You must be logged in to use AI commands')
      expect(result.retryable).toBe(false)
      expect(result.originalError).toBe(mockFirebaseErrors.unauthenticated)
    })

    it('should map "resource-exhausted" to non-retryable (quota exceeded)', () => {
      const result = mapAIError(mockFirebaseErrors.resourceExhausted)
      
      expect(result.message).toBe('AI command limit reached')
      expect(result.retryable).toBe(false)
    })

    it('should map "failed-precondition" with rectangles message to non-retryable', () => {
      const result = mapAIError(mockFirebaseErrors.failedPrecondition)
      
      expect(result.message).toBe('Canvas has too many rectangles (limit: 1000)')
      expect(result.retryable).toBe(false)
    })

    it('should map "failed-precondition" without rectangles message to non-retryable', () => {
      const error = { code: 'failed-precondition', message: 'Some other precondition' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('Some other precondition')
      expect(result.retryable).toBe(false)
    })

    it('should map "deadline-exceeded" to retryable (timeout)', () => {
      const result = mapAIError(mockFirebaseErrors.deadlineExceeded)
      
      expect(result.message).toBe('AI service temporarily unavailable. Please try again.')
      expect(result.retryable).toBe(true)
    })

    it('should map "invalid-argument" to non-retryable', () => {
      const result = mapAIError(mockFirebaseErrors.invalidArgument)
      
      expect(result.message).toBe('Invalid request format')
      expect(result.retryable).toBe(false)
    })

    it('should map "internal" to retryable', () => {
      const result = mapAIError(mockFirebaseErrors.internal)
      
      expect(result.message).toBe('An error occurred processing your command')
      expect(result.retryable).toBe(true)
    })

    it('should map "unavailable" to retryable', () => {
      const result = mapAIError(mockFirebaseErrors.unavailable)
      
      expect(result.message).toBe('Service temporarily unavailable. Please try again.')
      expect(result.retryable).toBe(true)
    })

    it('should map "aborted" to retryable', () => {
      const result = mapAIError(mockFirebaseErrors.aborted)
      
      expect(result.message).toBe('Service temporarily unavailable. Please try again.')
      expect(result.retryable).toBe(true)
    })

    it('should map unknown error codes to retryable with default message', () => {
      const error = { code: 'unknown-code', message: 'Unknown error' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('Unknown error')
      expect(result.retryable).toBe(true)
    })
  })

  describe('Executor Errors', () => {
    it('should map "not found" errors to non-retryable', () => {
      const result = mapAIError(mockExecutorErrors.rectangleNotFound)
      
      expect(result.message).toBe('The selected rectangle no longer exists')
      expect(result.retryable).toBe(false)
    })

    it('should map "deleted" errors to non-retryable', () => {
      const error = new Error('Rectangle was deleted by another user')
      const result = mapAIError(error)
      
      expect(result.message).toBe('The selected rectangle no longer exists')
      expect(result.retryable).toBe(false)
    })

    it('should map "invalid color" errors to non-retryable', () => {
      const result = mapAIError(mockExecutorErrors.invalidColor)
      
      expect(result.message).toBe('Invalid color: #yellow')
      expect(result.retryable).toBe(false)
    })

    it('should map "viewport info not available" to retryable', () => {
      const result = mapAIError(mockExecutorErrors.viewportNotAvailable)
      
      expect(result.message).toBe('Canvas not ready. Please try again.')
      expect(result.retryable).toBe(true)
    })

    it('should map generic executor errors to non-retryable', () => {
      const error = new Error('Some validation error')
      const result = mapAIError(error)
      
      expect(result.message).toBe('Some validation error')
      expect(result.retryable).toBe(false)
    })
  })

  describe('Network Errors', () => {
    it('should map NetworkError to retryable', () => {
      // Create proper NetworkError with name property
      const networkError = Object.assign(new Error('Failed to fetch'), { name: 'NetworkError' })
      const result = mapAIError(networkError)
      
      expect(result.message).toBe('Network error. Please check your connection and try again.')
      expect(result.retryable).toBe(true)
    })
  })

  describe('Unknown Errors', () => {
    it('should default unknown errors to retryable (safety)', () => {
      const result = mapAIError(mockUnknownError)
      
      // Should use the error message if available
      expect(result.message).toBe('Something went wrong')
      expect(result.retryable).toBe(false)
    })

    it('should handle null/undefined errors gracefully', () => {
      const resultNull = mapAIError(null)
      const resultUndefined = mapAIError(undefined)
      
      expect(resultNull.retryable).toBe(true)
      expect(resultUndefined.retryable).toBe(true)
    })

    it('should handle errors without message property', () => {
      const error = { code: 'some-code' }
      const result = mapAIError(error)
      
      expect(result.message).toBe('An unexpected error occurred')
      expect(result.retryable).toBe(true)
    })
  })
})

describe('formatPartialSuccessMessage', () => {
  it('should show success count (e.g. "Completed 3 of 5 steps")', () => {
    const error = { message: 'Rectangle not found', retryable: false }
    const result = formatPartialSuccessMessage(5, 4, error)
    
    expect(result).toBe('Completed 3 of 5 steps. Error: Rectangle not found')
  })

  it('should show just error if no steps succeeded', () => {
    const error = { message: 'Failed to create rectangle', retryable: false }
    const result = formatPartialSuccessMessage(3, 1, error)
    
    expect(result).toBe('Failed to create rectangle')
  })

  it('should include error message in partial success', () => {
    const error = { message: 'Invalid color', retryable: false }
    const result = formatPartialSuccessMessage(2, 2, error)
    
    expect(result).toBe('Completed 1 of 2 steps. Error: Invalid color')
  })

  it('should handle single-step failure', () => {
    const error = { message: 'Network error', retryable: true }
    const result = formatPartialSuccessMessage(1, 1, error)
    
    expect(result).toBe('Network error')
  })

  it('should handle last step failure', () => {
    const error = { message: 'Delete failed', retryable: false }
    const result = formatPartialSuccessMessage(4, 4, error)
    
    expect(result).toBe('Completed 3 of 4 steps. Error: Delete failed')
  })
})
