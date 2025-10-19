import React, { useCallback } from 'react'
import { Circle, Line } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { INTERACTION_CONSTANTS } from '../../utils/constants'
import { calculateAngle, snapToInterval, normalizeRotation } from '../../utils/rotationHelpers'

interface RotateHandleProps {
  shapeId: string
  centerX: number
  centerY: number
  currentRotation?: number  // Optional, not used in calculation but kept for future features
  isShiftPressed: boolean
  onRotate: (shapeId: string, newRotation: number) => void
}

/**
 * Rotate handle component
 * Shows a circular handle above the shape for rotation
 */
const RotateHandle: React.FC<RotateHandleProps> = ({
  shapeId,
  centerX,
  centerY,
  currentRotation: _currentRotation,  // Prefix with _ to indicate intentionally unused
  isShiftPressed,
  onRotate
}) => {
  const handleY = centerY - INTERACTION_CONSTANTS.ROTATE_HANDLE_OFFSET

  const handleDrag = useCallback((e: KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // Calculate angle from shape center to pointer
    const scale = stage.scaleX()
    const stagePos = { x: stage.x(), y: stage.y() }
    
    // Convert screen coordinates to canvas coordinates
    const canvasX = (pointer.x - stagePos.x) / scale
    const canvasY = (pointer.y - stagePos.y) / scale

    let angle = calculateAngle(centerX, centerY, canvasX, canvasY)

    // Snap to 15° if Shift is pressed
    if (isShiftPressed) {
      angle = snapToInterval(angle, 15)
    }

    // Normalize to 0-360
    angle = normalizeRotation(angle)

    onRotate(shapeId, angle)
  }, [shapeId, centerX, centerY, isShiftPressed, onRotate])

  return (
    <>
      {/* Line connecting shape to rotate handle */}
      <Line
        points={[centerX, centerY, centerX, handleY]}
        stroke="#3b82f6"
        strokeWidth={1}
        dash={[3, 3]}
        listening={false}
      />
      
      {/* Rotate handle */}
      <Circle
        x={centerX}
        y={handleY}
        radius={6}
        fill="white"
        stroke="#3b82f6"
        strokeWidth={2}
        draggable
        onDragMove={handleDrag}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container()
          if (container) {
            container.style.cursor = 'grab'
          }
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container()
          if (container) {
            container.style.cursor = 'default'
          }
        }}
        onDragStart={(e) => {
          const container = e.target.getStage()?.container()
          if (container) {
            container.style.cursor = 'grabbing'
          }
        }}
        onDragEnd={(e) => {
          const container = e.target.getStage()?.container()
          if (container) {
            container.style.cursor = 'default'
          }
        }}
      />
    </>
  )
}

export default RotateHandle

