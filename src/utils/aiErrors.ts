/**
 * AI Error Handling Utilities
 * Maps Firebase/OpenAI errors to user-friendly messages
 * Classifies errors as retryable or non-retryable
 */

export interface AIError {
  message: string
  retryable: boolean
  originalError?: unknown
}

// Type guards for error objects
function isErrorWithCode(error: unknown): error is { code: string; message?: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function isErrorWithMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string';
}

function isErrorWithName(error: unknown): error is { name: string } {
  return typeof error === 'object' && error !== null && 'name' in error;
}

/**
 * Map error to user-friendly message and classify as retryable
 */
export function mapAIError(error: unknown): AIError {
  // Handle Firebase HttpsError (from Cloud Function)
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case 'unauthenticated':
        return {
          message: 'You must be logged in to use AI commands',
          retryable: false,
          originalError: error
        }

      case 'resource-exhausted':
        return {
          message: error.message || 'AI command limit reached (1000 commands per user)',
          retryable: false,
          originalError: error
        }

      case 'failed-precondition':
        if (error.message && error.message.includes('too many rectangles')) {
          return {
            message: 'Canvas has too many rectangles (limit: 1000)',
            retryable: false,
            originalError: error
          }
        }
        return {
          message: error.message || 'AI service not available',
          retryable: false,
          originalError: error
        }

      case 'deadline-exceeded':
        return {
          message: 'AI service temporarily unavailable. Please try again.',
          retryable: true,
          originalError: error
        }

      case 'invalid-argument':
        return {
          message: error.message || 'Invalid request format',
          retryable: false,
          originalError: error
        }

      case 'internal':
        return {
          message: 'An error occurred processing your command',
          retryable: true,
          originalError: error
        }

      case 'unavailable':
      case 'aborted':
        return {
          message: 'Service temporarily unavailable. Please try again.',
          retryable: true,
          originalError: error
        }

      default:
        return {
          message: error.message || 'An unexpected error occurred',
          retryable: true,
          originalError: error
        }
    }
  }

  // Handle executor errors (thrown by canvasCommandExecutor)
  if (isErrorWithMessage(error)) {
    const msg = error.message.toLowerCase()

    // Rectangle not found errors (non-retryable)
    if (msg.includes('not found') || msg.includes('deleted')) {
      return {
        message: 'The selected rectangle no longer exists',
        retryable: false,
        originalError: error
      }
    }

    // Invalid color errors (non-retryable)
    if (msg.includes('invalid color')) {
      return {
        message: error.message,
        retryable: false,
        originalError: error
      }
    }

    // Viewport not available (retryable - might be during mount)
    if (msg.includes('viewport info not available')) {
      return {
        message: 'Canvas not ready. Please try again.',
        retryable: true,
        originalError: error
      }
    }

    // Generic executor error
    return {
      message: error.message,
      retryable: false,
      originalError: error
    }
  }

  // Network errors (retryable)
  if (isErrorWithName(error) && error.name === 'NetworkError') {
    return {
      message: 'Network error. Please check your connection and try again.',
      retryable: true,
      originalError: error
    }
  }

  // Unknown errors (retryable to be safe)
  return {
    message: 'An unexpected error occurred. Please try again.',
    retryable: true,
    originalError: error
  }
}

/**
 * Format partial success message for multi-step commands
 */
export function formatPartialSuccessMessage(
  totalSteps: number,
  failedStep: number,
  error: AIError
): string {
  const successCount = failedStep - 1
  if (successCount === 0) {
    return error.message
  }
  return `Completed ${successCount} of ${totalSteps} steps. Error: ${error.message}`
}

