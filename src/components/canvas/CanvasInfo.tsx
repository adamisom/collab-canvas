import React, { useState, useCallback, useEffect, useRef } from 'react'
import type Konva from 'konva'
import type { Rectangle } from '../../services/canvasService'
import ColorPicker from './ColorPicker'

interface CanvasInfoProps {
  stageRef: React.RefObject<Konva.Stage>
  rectangles: Rectangle[]
  cursorsCount: number
  selectedRectangle: Rectangle | undefined
  displayColor: string
  onColorChange: (color: string) => void
}

const CanvasInfo: React.FC<CanvasInfoProps> = ({
  stageRef,
  rectangles,
  cursorsCount,
  selectedRectangle,
  displayColor,
  onColorChange
}) => {
  const [, setUpdateTrigger] = useState(0)
  const rafIdRef = useRef<number | null>(null)

  // Get current stage scale
  const getCurrentStageScale = useCallback(() => {
    if (!stageRef.current) return null
    return stageRef.current.scaleX()
  }, [stageRef])

  // Get current stage position
  const getCurrentStagePosition = useCallback(() => {
    if (!stageRef.current) return null
    return {
      x: stageRef.current.x(),
      y: stageRef.current.y()
    }
  }, [stageRef])

  // Force update when viewport changes
  const triggerUpdate = useCallback(() => {
    setUpdateTrigger(prev => prev + 1)
  }, [])

  // Listen to stage transform events
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const handleTransform = () => {
      // Debounce updates using RAF
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
      rafIdRef.current = requestAnimationFrame(() => {
        triggerUpdate()
      })
    }

    // Listen to wheel, drag, and programmatic transforms
    stage.on('wheel', handleTransform)
    stage.on('dragend', handleTransform)
    stage.on('transform', handleTransform)

    return () => {
      stage.off('wheel', handleTransform)
      stage.off('dragend', handleTransform)
      stage.off('transform', handleTransform)
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [stageRef, triggerUpdate])

  return (
    <div className="canvas-info">
      <div className="canvas-stats">
        <span>Zoom: {(() => {
          const scale = getCurrentStageScale()
          return scale ? Math.round(scale * 100) : 100
        })()}%</span>
        <span>Position: ({(() => {
          const pos = getCurrentStagePosition()
          return pos ? `${Math.round(pos.x)}, ${Math.round(pos.y)}` : '0, 0'
        })()})</span>
        <span>Rectangles: {rectangles.length}</span>
        <span>Friends: {cursorsCount}</span>
        
        {/* Color Picker */}
        {selectedRectangle && (
          <div className="header-color-picker">
            <span className="color-label">Color:</span>
            <ColorPicker
              selectedColor={displayColor}
              onColorChange={onColorChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default CanvasInfo

