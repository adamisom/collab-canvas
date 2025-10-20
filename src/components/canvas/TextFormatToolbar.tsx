import React from 'react'
import './Canvas.css'

interface TextFormatToolbarProps {
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  x: number  // Screen X position (already includes pan/zoom)
  y: number  // Screen Y position (already includes pan/zoom)
  onFontSizeChange: (size: number) => void
  onBoldToggle: () => void
  onItalicToggle: () => void
}

const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({
  fontSize,
  fontWeight,
  fontStyle,
  x,
  y,
  onFontSizeChange,
  onBoldToggle,
  onItalicToggle
}) => {
  const fontSizes = [10, 12, 14, 16, 18, 24, 32, 48, 72]

  return (
    <div 
      className="text-format-toolbar"
      style={{
        position: 'absolute',
        left: `${x + 100}px`, // Position 100px to the right of text start
        top: `${y - 20}px`, // Position 20px above the text
        zIndex: 1000
      }}
    >
      <label className="toolbar-label">
        Size:
        <select 
          value={fontSize} 
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="font-size-select"
        >
          {fontSizes.map(size => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>
      </label>
      
      <button
        className={`format-btn ${fontWeight === 'bold' ? 'active' : ''}`}
        onClick={onBoldToggle}
        title="Bold (B)"
        aria-label="Toggle bold"
      >
        <strong>B</strong>
      </button>
      
      <button
        className={`format-btn ${fontStyle === 'italic' ? 'active' : ''}`}
        onClick={onItalicToggle}
        title="Italic (I)"
        aria-label="Toggle italic"
      >
        <em>I</em>
      </button>
    </div>
  )
}

export default TextFormatToolbar

