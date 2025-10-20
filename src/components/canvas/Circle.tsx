import React, { useRef, useEffect, useState } from 'react'
import { Circle as KonvaCircle, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CircleShape } from '../../shared/shapes'
import { SHAPE_CONSTANTS } from '../../utils/constants'
import { getShapeSelectionStyle, isShapeDraggable } from '../../utils/shapeStyleHelpers'

interface CircleProps {
  circle: CircleShape
  isSelected: boolean
  isPrimary: boolean
  isShiftPressed: boolean
  onClick: (id: string, cmdOrCtrlPressed?: boolean) => void
  onDragStart: () => void
  onDragEnd: (id: string, x: number, y: number) => void
  onResize: (id: string, radius: number, x: number, y: number) => void
  onResizeStart: () => void
  onResizeEnd: () => void
}

const Circle: React.FC<CircleProps> = ({
  circle,
  isSelected,
  isPrimary,
  isShiftPressed,
  onClick,
  onDragStart,
  onDragEnd,
  onResize,
  onResizeStart,
  onResizeEnd
}) => {
  const circleRef = useRef<Konva.Circle | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  // Attach transformer to circle when selected
  useEffect(() => {
    if (isPrimary && transformerRef.current && circleRef.current) {
      transformerRef.current.nodes([circleRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [isPrimary])

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    const cmdOrCtrlPressed = e.evt.metaKey || e.evt.ctrlKey
    onClick(circle.id, cmdOrCtrlPressed)
  }

  const handleDragStart = () => {
    onDragStart()
  }

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Circle
    onDragEnd(circle.id, node.x(), node.y())
  }

  const handleTransformStart = () => {
    setIsResizing(true)
    onResizeStart()
  }

  const handleTransformEnd = () => {
    const node = circleRef.current
    if (!node) return

    // Get the new radius from the scaled circle
    const scaleX = node.scaleX()
    const newRadius = circle.radius * scaleX

    // Reset scale to 1 (Konva pattern)
    node.scaleX(1)
    node.scaleY(1)

    onResize(circle.id, newRadius, node.x(), node.y())
    setIsResizing(false)
    onResizeEnd()
  }

  // Disable dragging when Shift is pressed (for selection box) or when resizing
  const dragEnabled = isShapeDraggable(isSelected, isShiftPressed, isResizing)

  // Get selection styling
  const selectionStyle = getShapeSelectionStyle(circle.color, isSelected, false)

  return (
    <>
      <KonvaCircle
        ref={circleRef}
        id={circle.id}
        x={circle.x}
        y={circle.y}
        radius={circle.radius}
        fill={circle.color}
        stroke={selectionStyle.stroke}
        strokeWidth={selectionStyle.strokeWidth}
        draggable={dragEnabled}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
      {isPrimary && !isShiftPressed && (
        <Transformer
          ref={transformerRef}
          flipEnabled={false}
          rotateEnabled={false}
          borderStroke="#3b82f6"
          borderStrokeWidth={2}
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          anchorSize={SHAPE_CONSTANTS.TRANSFORMER_ANCHOR_SIZE}
          anchorCornerRadius={SHAPE_CONSTANTS.TRANSFORMER_ANCHOR_RADIUS}
          keepRatio={true}  // Keep circle proportional
          onTransformStart={handleTransformStart}
          onTransformEnd={handleTransformEnd}
        />
      )}
    </>
  )
}

export default Circle

