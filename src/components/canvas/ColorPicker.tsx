import React, { useState, useEffect } from 'react'
import { RECTANGLE_COLOR_OPTIONS } from '../../utils/constants'

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
}

const HISTORY_KEY = 'collabcanvas_colorHistory'
const MAX_HISTORY = 5

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorChange }) => {
  const [hexInput, setHexInput] = useState('')
  const [colorHistory, setColorHistory] = useState<string[]>([])
  
  // NEW: Check if showing mixed color indicator
  const isMixed = selectedColor === '?'

  // Load color history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setColorHistory(Array.isArray(parsed) ? parsed : [])
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save color to history
  const addToHistory = (color: string) => {
    // Remove if already exists
    const filtered = colorHistory.filter(c => c !== color)
    // Add to front
    const newHistory = [color, ...filtered].slice(0, MAX_HISTORY)
    setColorHistory(newHistory)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
  }

  const handleQuickColorClick = (color: string) => {
    onColorChange(color)
    addToHistory(color)
  }

  const handleHexSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Normalize hex input
    let hex = hexInput.trim()
    if (!hex.startsWith('#')) {
      hex = '#' + hex
    }
    
    // Validate hex color (3 or 6 digit hex)
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      // Expand 3-digit hex to 6-digit
      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
      }
      onColorChange(hex.toLowerCase())
      addToHistory(hex.toLowerCase())
      setHexInput('')
    }
  }

  const handleHistoryClick = (color: string) => {
    onColorChange(color)
  }

  return (
    <div className="color-picker">
      {/* Quick color presets */}
      <div className="color-quick-options">
        {RECTANGLE_COLOR_OPTIONS.map((colorOption) => (
          <button
            key={colorOption.value}
            className="color-option"
            style={{ backgroundColor: colorOption.value }}
            onClick={() => handleQuickColorClick(colorOption.value)}
            title={colorOption.name}
            aria-label={colorOption.name}
          />
        ))}
      </div>

      {/* Hex input - show ? when mixed */}
      <form onSubmit={handleHexSubmit} className="color-hex-form">
        <input
          type="text"
          value={isMixed ? '?' : hexInput}  // CHANGED: Show ? when mixed
          onChange={(e) => setHexInput(e.target.value)}
          placeholder={isMixed ? '(mixed)' : '#3b82f6'}  // CHANGED: Different placeholder when mixed
          className="color-hex-input"
          maxLength={7}
          aria-label="Hex color input"
          disabled={isMixed}  // CHANGED: Disable input when mixed
        />
        <button 
          type="submit" 
          className="color-hex-submit"
          disabled={!hexInput.trim() || isMixed}  // CHANGED: Disable when mixed
        >
          ✓
        </button>
      </form>

      {/* Color history */}
      {colorHistory.length > 0 && (
        <div className="color-history">
          {colorHistory.map((color, index) => (
            <button
              key={`${color}-${index}`}
              className={`color-history-option ${!isMixed && selectedColor === color ? 'selected' : ''}`}  // CHANGED: Don't highlight when mixed
              style={{ backgroundColor: color }}
              onClick={() => handleHistoryClick(color)}
              title={color}
              aria-label={`Recent color ${color}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ColorPicker
