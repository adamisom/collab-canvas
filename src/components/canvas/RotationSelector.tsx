import React from 'react'
import './Canvas.css'

interface RotationSelectorProps {
  currentRotation: number
  x: number  // Screen X position
  y: number  // Screen Y position
  onRotate: (rotation: number) => void
}

const RotationSelector: React.FC<RotationSelectorProps> = ({
  currentRotation,
  x,
  y,
  onRotate
}) => {
  // Generate rotation options in 15-degree increments
  const rotationOptions = []
  for (let deg = 0; deg <= 345; deg += 15) {
    rotationOptions.push(deg)
  }

  return (
    <div
      className="rotation-selector"
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 1000
      }}
    >
      <label className="rotation-label">
        Rotate:
        <select
          value={Math.round(currentRotation / 15) * 15} // Snap to nearest 15 degrees
          onChange={(e) => onRotate(Number(e.target.value))}
          className="rotation-select"
        >
          {rotationOptions.map(deg => (
            <option key={deg} value={deg}>{deg}°</option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default RotationSelector

