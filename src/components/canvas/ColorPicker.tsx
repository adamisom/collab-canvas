import React from 'react'
import { RECTANGLE_COLOR_OPTIONS } from '../../utils/constants'

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorChange }) => {
  return (
    <div className="color-picker">
      <div className="color-picker-title">Color</div>
      <div className="color-picker-options">
        {RECTANGLE_COLOR_OPTIONS.map((colorOption) => (
          <button
            key={colorOption.value}
            className={`color-option ${selectedColor === colorOption.value ? 'selected' : ''}`}
            style={{ backgroundColor: colorOption.value }}
            onClick={() => onColorChange(colorOption.value)}
            title={colorOption.name}
          />
        ))}
      </div>
    </div>
  )
}

export default ColorPicker
