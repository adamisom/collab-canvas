import React, { useCallback, useState, useRef, useEffect } from 'react'
import { Text as KonvaText, Group } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { TextShape } from '../../shared/shapes'
import { getShapeSelectionStyle, isShapeDraggable } from '../../utils/shapeStyleHelpers'

interface TextProps {
  textShape: TextShape
  isSelected: boolean
  isPrimary: boolean
  isShiftPressed: boolean
  onClick: (id: string) => void
  onDragStart: () => void
  onDragEnd: (id: string, x: number, y: number) => void
  onTextChange: (id: string, newText: string) => void
  onEditingChange: (editing: boolean) => void
}

const Text: React.FC<TextProps> = ({
  textShape,
  isSelected,
  // isPrimary - not used yet, but kept in interface for consistency
  isShiftPressed,
  onClick,
  onDragStart,
  onDragEnd,
  onTextChange,
  onEditingChange
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const textRef = useRef<Konva.Text | null>(null)
  const groupRef = useRef<Konva.Group | null>(null)

  const handleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    onClick(textShape.id)
  }, [onClick, textShape.id])

  const handleDblClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    setIsEditing(true)
    onEditingChange(true)
  }, [onEditingChange])

  const handleDragStart = useCallback(() => {
    onDragStart()
  }, [onDragStart])

  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Group
    onDragEnd(textShape.id, node.x(), node.y())
  }, [onDragEnd, textShape.id])

  // DOM input overlay for editing
  useEffect(() => {
    if (!isEditing || !textRef.current) return

    const textNode = textRef.current
    const stage = textNode.getStage()
    if (!stage) return

    // Create input
    const input = document.createElement('input')
    input.type = 'text'
    input.value = textShape.text
    input.maxLength = 200
    input.style.position = 'absolute'
    input.style.zIndex = '10000'  // Above canvas
    
    // Use Konva's getAbsolutePosition (handles all transforms!)
    const absPos = textNode.getAbsolutePosition()
    const scale = stage.scaleX()
    
    input.style.left = `${absPos.x}px`
    input.style.top = `${absPos.y}px`
    input.style.fontSize = `${16 * scale}px`  // Scale with zoom for better UX
    input.style.fontFamily = textShape.fontFamily
    input.style.fontWeight = textShape.fontWeight || 'normal'  // PR #9
    input.style.fontStyle = textShape.fontStyle || 'normal'  // PR #9
    input.style.color = textShape.color
    input.style.border = '2px solid #3b82f6'
    input.style.padding = '2px 4px'
    input.style.background = 'white'
    input.style.outline = 'none'
    
    document.body.appendChild(input)
    input.focus()
    input.select()
    
    // Finish editing
    const finishEditing = () => {
      const newText = input.value.trim()
      if (newText && newText !== textShape.text) {
        onTextChange(textShape.id, newText)
      }
      if (document.body.contains(input)) {
        document.body.removeChild(input)
      }
      setIsEditing(false)
      onEditingChange(false)
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        finishEditing()
      }
    }
    
    input.addEventListener('keydown', handleKeyDown)
    input.addEventListener('blur', finishEditing)
    
    // Cleanup
    return () => {
      input.removeEventListener('keydown', handleKeyDown)
      input.removeEventListener('blur', finishEditing)
      if (document.body.contains(input)) {
        document.body.removeChild(input)
        onEditingChange(false)  // Ensure editing state is cleared
      }
    }
  }, [isEditing, textShape, onTextChange, onEditingChange])

  // Get selection styling
  const selectionStyle = getShapeSelectionStyle(textShape.color, isSelected, false)

  // Disable dragging when editing or Shift is pressed
  const draggable = isShapeDraggable(isSelected, isShiftPressed, isEditing)

  return (
    <Group
      ref={groupRef}
      x={textShape.x}
      y={textShape.y}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onDblClick={handleDblClick}
      onTap={handleClick}
      onDblTap={handleDblClick}
    >
      <KonvaText
        ref={textRef}
        text={textShape.text}
        fontSize={textShape.fontSize}
        fontFamily={textShape.fontFamily}
        fontStyle={textShape.fontWeight === 'bold' && textShape.fontStyle === 'italic' ? 'bold italic' : 
                   textShape.fontWeight === 'bold' ? 'bold' : 
                   textShape.fontStyle === 'italic' ? 'italic' : 'normal'}  // PR #9: Combined font style
        fill={textShape.color}
        stroke={selectionStyle.stroke}
        strokeWidth={isSelected ? 1 : 0}  // Subtle stroke for text selection
        listening={!isEditing}
      />
    </Group>
  )
}

export default Text

