import { describe, it, expect } from 'vitest'
import { RECTANGLE_COLORS, RECTANGLE_COLOR_OPTIONS } from '../../src/utils/constants'

describe('Rectangle Colors', () => {
  describe('RECTANGLE_COLORS', () => {
    it('should have red color defined', () => {
      expect(RECTANGLE_COLORS.RED).toBe('#ef4444')
    })

    it('should have blue color defined', () => {
      expect(RECTANGLE_COLORS.BLUE).toBe('#3b82f6')
    })

    it('should have green color defined', () => {
      expect(RECTANGLE_COLORS.GREEN).toBe('#22c55e')
    })

    it('should have exactly 3 colors', () => {
      const colorKeys = Object.keys(RECTANGLE_COLORS)
      expect(colorKeys).toHaveLength(3)
    })

    it('should have all colors as valid hex values', () => {
      const hexPattern = /^#[0-9a-f]{6}$/i
      Object.values(RECTANGLE_COLORS).forEach(color => {
        expect(color).toMatch(hexPattern)
      })
    })
  })

  describe('RECTANGLE_COLOR_OPTIONS', () => {
    it('should have 3 color options', () => {
      expect(RECTANGLE_COLOR_OPTIONS).toHaveLength(3)
    })

    it('should have red option with correct name and value', () => {
      const redOption = RECTANGLE_COLOR_OPTIONS.find(option => option.name === 'Red')
      expect(redOption).toBeDefined()
      expect(redOption?.value).toBe(RECTANGLE_COLORS.RED)
    })

    it('should have blue option with correct name and value', () => {
      const blueOption = RECTANGLE_COLOR_OPTIONS.find(option => option.name === 'Blue')
      expect(blueOption).toBeDefined()
      expect(blueOption?.value).toBe(RECTANGLE_COLORS.BLUE)
    })

    it('should have green option with correct name and value', () => {
      const greenOption = RECTANGLE_COLOR_OPTIONS.find(option => option.name === 'Green')
      expect(greenOption).toBeDefined()
      expect(greenOption?.value).toBe(RECTANGLE_COLORS.GREEN)
    })

    it('should have all options with name and value properties', () => {
      RECTANGLE_COLOR_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('name')
        expect(option).toHaveProperty('value')
        expect(typeof option.name).toBe('string')
        expect(typeof option.value).toBe('string')
      })
    })

    it('should have unique color values', () => {
      const values = RECTANGLE_COLOR_OPTIONS.map(option => option.value)
      const uniqueValues = [...new Set(values)]
      expect(uniqueValues).toHaveLength(values.length)
    })

    it('should have unique color names', () => {
      const names = RECTANGLE_COLOR_OPTIONS.map(option => option.name)
      const uniqueNames = [...new Set(names)]
      expect(uniqueNames).toHaveLength(names.length)
    })
  })
})
