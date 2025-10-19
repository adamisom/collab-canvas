import React from 'react'
import type { ShapeType } from '../../shared/shapes'
import './SelectTypeModal.css'

interface SelectTypeModalProps {
  onSelect: (shapeType: ShapeType) => void
  onClose: () => void
}

/**
 * Modal for selecting all shapes of a specific type
 * Triggered by Cmd+Shift+A keyboard shortcut
 */
const SelectTypeModal: React.FC<SelectTypeModalProps> = ({ onSelect, onClose }) => {
  const handleSelect = (shapeType: ShapeType) => {
    onSelect(shapeType)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="select-type-modal-backdrop" onClick={handleBackdropClick}>
      <div className="select-type-modal">
        <h3>Select All of Type</h3>
        <div className="select-type-buttons">
          <button
            className="select-type-button"
            onClick={() => handleSelect('rectangle')}
          >
            <span className="button-icon">▭</span>
            Rectangles
          </button>
          <button
            className="select-type-button"
            onClick={() => handleSelect('circle')}
          >
            <span className="button-icon">●</span>
            Circles
          </button>
          <button
            className="select-type-button"
            onClick={() => handleSelect('line')}
          >
            <span className="button-icon">╱</span>
            Lines
          </button>
          <button
            className="select-type-button"
            onClick={() => handleSelect('text')}
          >
            <span className="button-icon">T</span>
            Text
          </button>
        </div>
        <button className="modal-close-button" onClick={onClose}>
          Cancel (Esc)
        </button>
      </div>
    </div>
  )
}

export default SelectTypeModal

