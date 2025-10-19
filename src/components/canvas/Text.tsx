import React, { useCallback, useState, useRef, useEffect } from 'react'
import { Text as KonvaText, Group } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { TextShape } from '../../shared/shapes'
import { SELECTION_COLORS } from '../../utils/constants'

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
  isPrimary: _isPrimary,  // Unused for now, but keeping for consistency with other shape components
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

  return (
    <Group
      ref={groupRef}
      x={textShape.x}
      y={textShape.y}
      draggable={isSelected && !isEditing && !isShiftPressed}
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
        fill={textShape.color}
        stroke={isSelected ? SELECTION_COLORS.STROKE : undefined}
        strokeWidth={isSelected ? 2 : 0}
        listening={!isEditing}
      />
    </Group>
  )
}

export default Text

