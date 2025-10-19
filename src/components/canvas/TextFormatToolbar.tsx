import React from 'react'
import './Canvas.css'

interface TextFormatToolbarProps {
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  onFontSizeChange: (size: number) => void
  onBoldToggle: () => void
  onItalicToggle: () => void
}

const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({
  fontSize,
  fontWeight,
  fontStyle,
  onFontSizeChange,
  onBoldToggle,
  onItalicToggle
}) => {
  const fontSizes = [10, 12, 14, 16, 18, 24, 32, 48, 72]

  return (
    <div className="text-format-toolbar">
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

