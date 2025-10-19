import React, { useRef, useState } from 'react'
import { Rect } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Rectangle } from '../../services/canvasService'

interface MultiSelectGroupProps {
  rectangles: Rectangle[]
  onGroupDragStart: () => void
  onGroupDragEnd: (offset: { x: number; y: number }) => void
}

const MultiSelectGroup: React.FC<MultiSelectGroupProps> = ({ rectangles, onGroupDragStart, onGroupDragEnd }) => {
  const rectRef = useRef<Konva.Rect | null>(null)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  if (rectangles.length < 2) {
    // Don't show border for single or no selection
    return null
  }

  const MARGIN = 8 // pixels of margin around the group

  // Calculate bounding box of all selected rectangles
  const minX = Math.min(...rectangles.map(r => r.x)) - MARGIN
  const minY = Math.min(...rectangles.map(r => r.y)) - MARGIN
  const maxX = Math.max(...rectangles.map(r => r.x + r.width)) + MARGIN
  const maxY = Math.max(...rectangles.map(r => r.y + r.height)) + MARGIN

  const width = maxX - minX
  const height = maxY - minY

  // During drag, use the frozen start position; otherwise use calculated position
  const x = isDragging && dragStartPos ? dragStartPos.x : minX
  const y = isDragging && dragStartPos ? dragStartPos.y : minY

  const handleDragStart = (_e: KonvaEventObject<DragEvent>) => {
    // Store the starting position
    setDragStartPos({ x: minX, y: minY })
    setIsDragging(true)
    onGroupDragStart()
  }

  const handleDragEnd = (_e: KonvaEventObject<DragEvent>) => {
    if (!dragStartPos || !rectRef.current) return

    const newX = rectRef.current.x()
    const newY = rectRef.current.y()

    // Calculate offset
    const offset = {
      x: newX - dragStartPos.x,
      y: newY - dragStartPos.y
    }

    // Reset the visual position back (rectangles will update via Firebase)
    rectRef.current.position({ x: dragStartPos.x, y: dragStartPos.y })

    // Call the callback to update all rectangles
    onGroupDragEnd(offset)

    setDragStartPos(null)
    setIsDragging(false)
  }

  return (
    <Rect
      ref={rectRef}
      x={x}
      y={y}
      width={width}
      height={height}
      stroke="#3b82f6"
      strokeWidth={2}
      dash={[8, 4]}
      fill="transparent"
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      perfectDrawEnabled={false}
    />
  )
}

export default MultiSelectGroup

