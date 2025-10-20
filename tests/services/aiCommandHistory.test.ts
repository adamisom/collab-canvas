import { describe, it, expect, beforeEach } from 'vitest'
import { getCommandHistory, addCommandToHistory, clearCommandHistory } from '../../src/services/aiCommandHistory'

const HISTORY_KEY = 'collab-canvas-ai-history'

describe('aiCommandHistory service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getCommandHistory', () => {
    it('should return empty array when no history exists', () => {
      expect(getCommandHistory()).toEqual([])
    })

    it('should return stored history', () => {
      const mockHistory = [
        { id: '1', timestamp: 1000, userInput: 'test', success: true, resultMessage: 'OK' }
      ]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(mockHistory))
      
      expect(getCommandHistory()).toEqual(mockHistory)
    })

    it('should return empty array if localStorage data is corrupted', () => {
      localStorage.setItem(HISTORY_KEY, 'invalid-json{')
      expect(getCommandHistory()).toEqual([])
    })
  })

  describe('addCommandToHistory', () => {
    it('should add a command to empty history', () => {
      addCommandToHistory({
        userInput: 'Create a rectangle',
        success: true,
        resultMessage: 'Created successfully'
      })

      const history = getCommandHistory()
      expect(history).toHaveLength(1)
      expect(history[0].userInput).toBe('Create a rectangle')
      expect(history[0].success).toBe(true)
      expect(history[0].resultMessage).toBe('Created successfully')
      expect(history[0].id).toBeDefined()
      expect(history[0].timestamp).toBeDefined()
    })

    it('should add commands to the start of history (newest first)', () => {
      addCommandToHistory({
        userInput: 'First command',
        success: true,
        resultMessage: 'OK'
      })

      addCommandToHistory({
        userInput: 'Second command',
        success: true,
        resultMessage: 'OK'
      })

      const history = getCommandHistory()
      expect(history[0].userInput).toBe('Second command')
      expect(history[1].userInput).toBe('First command')
    })

    it('should limit history to 10 commands', () => {
      // Add 12 commands
      for (let i = 0; i < 12; i++) {
        addCommandToHistory({
          userInput: `Command ${i}`,
          success: true,
          resultMessage: 'OK'
        })
      }

      const history = getCommandHistory()
      expect(history).toHaveLength(10)
      expect(history[0].userInput).toBe('Command 11') // Most recent
      expect(history[9].userInput).toBe('Command 2')  // 10th most recent
    })

    it('should handle both success and error states', () => {
      addCommandToHistory({
        userInput: 'Success command',
        success: true,
        resultMessage: 'Done'
      })

      addCommandToHistory({
        userInput: 'Failed command',
        success: false,
        resultMessage: 'Error occurred'
      })

      const history = getCommandHistory()
      expect(history[0].success).toBe(false)
      expect(history[0].resultMessage).toBe('Error occurred')
      expect(history[1].success).toBe(true)
      expect(history[1].resultMessage).toBe('Done')
    })
  })

  describe('clearCommandHistory', () => {
    it('should clear all history', () => {
      addCommandToHistory({
        userInput: 'Test',
        success: true,
        resultMessage: 'OK'
      })

      expect(getCommandHistory()).toHaveLength(1)

      clearCommandHistory()

      expect(getCommandHistory()).toEqual([])
    })

    it('should not throw when clearing empty history', () => {
      expect(() => clearCommandHistory()).not.toThrow()
    })
  })
})

