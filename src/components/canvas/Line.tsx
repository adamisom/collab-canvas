import React, { useRef, useState } from 'react'
import { Line as KonvaLine, Circle as KonvaCircle, Group, Arrow } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { LineShape } from '../../shared/shapes'
import { SHAPE_CONSTANTS } from '../../utils/constants'
import { getLineSelectionStyle, isShapeDraggable } from '../../utils/shapeStyleHelpers'

interface LineProps {
  line: LineShape
  isSelected: boolean
  isPrimary: boolean
  isShiftPressed: boolean
  onClick: (id: string, cmdOrCtrlPressed?: boolean) => void
  onDragStart: () => void
  onDragEnd: (id: string, x: number, y: number) => void
  onEndpointsChange: (id: string, endX: number, endY: number) => void
  onResizeStart: () => void
  onResizeEnd: () => void
}

const Line: React.FC<LineProps> = ({
  line,
  isSelected,
  isPrimary,
  isShiftPressed,
  onClick,
  onDragStart,
  onDragEnd,
  onEndpointsChange,
  onResizeStart,
  onResizeEnd
}) => {
  const groupRef = useRef<Konva.Group>(null)
  const [isDraggingHandle, setIsDraggingHandle] = useState(false)

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    const cmdOrCtrlPressed = e.evt.metaKey || e.evt.ctrlKey
    onClick(line.id, cmdOrCtrlPressed)
  }

  const handleDragStart = () => {
    onDragStart()
  }

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Group
    // Calculate new start position based on group movement
    const newX = line.x + node.x()
    const newY = line.y + node.y()
    
    // Reset group position to 0,0 (Konva pattern)
    node.x(0)
    node.y(0)
    
    onDragEnd(line.id, newX, newY)
  }

  // Handle endpoint drag
  const handleEndHandleDragStart = () => {
    setIsDraggingHandle(true)
    onResizeStart()
  }

  const handleEndHandleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Circle
    // Calculate new end position relative to line start
    const newEndX = line.x + node.x()
    const newEndY = line.y + node.y()
    
    // Reset handle position
    node.x(line.endX - line.x)
    node.y(line.endY - line.y)
    
    setIsDraggingHandle(false)
    onEndpointsChange(line.id, newEndX, newEndY)
    onResizeEnd()
  }

  // Calculate line points for Konva (relative to group position)
  const points = [0, 0, line.endX - line.x, line.endY - line.y]

  // Get selection styling
  const selectionStyle = getLineSelectionStyle(line.color, line.strokeWidth, isSelected, false)

  // Disable dragging when Shift is held (for selection box) or dragging handle
  const draggable = isShapeDraggable(isSelected, isShiftPressed, isDraggingHandle)

  return (
    <Group
      ref={groupRef}
      x={line.x}
      y={line.y}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Invisible hit area for easier clicking (wider than visible line) */}
      <KonvaLine
        points={points}
        stroke="transparent"
        strokeWidth={Math.max(20, selectionStyle.strokeWidth + 10)}
        lineCap="round"
        lineJoin="round"
      />
      
      {/* Main line or arrow */}
      {line.hasArrow ? (
        <Arrow
          points={points}
          stroke={selectionStyle.stroke}
          strokeWidth={selectionStyle.strokeWidth}
          fill={line.color}
          pointerLength={SHAPE_CONSTANTS.ARROW_POINTER_LENGTH}
          pointerWidth={SHAPE_CONSTANTS.ARROW_POINTER_WIDTH}
          lineCap="round"
          lineJoin="round"
        />
      ) : (
        <KonvaLine
          points={points}
          stroke={selectionStyle.stroke}
          strokeWidth={selectionStyle.strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      )}
      
      {/* Endpoint handle (on primary selection only) */}
      {isPrimary && !isShiftPressed && (
        <KonvaCircle
          x={line.endX - line.x}
          y={line.endY - line.y}
          radius={SHAPE_CONSTANTS.LINE_HANDLE_SIZE}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={2}
          draggable={true}
          onDragStart={handleEndHandleDragStart}
          onDragEnd={handleEndHandleDragEnd}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container()
            if (container) container.style.cursor = 'move'
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container()
            if (container) container.style.cursor = 'default'
          }}
        />
      )}
    </Group>
  )
}

export default Line

