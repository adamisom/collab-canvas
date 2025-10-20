import React, { useCallback, useState, useRef, useEffect } from 'react'
import { Text as KonvaText, Group } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { TextShape } from '../../shared/shapes'
import { getShapeSelectionStyle, isShapeDraggable } from '../../utils/shapeStyleHelpers'
import * as canvasService from '../../services/canvasService'

interface TextProps {
  textShape: TextShape
  isSelected: boolean
  isPrimary: boolean
  isShiftPressed: boolean
  isInMultiSelectGroup?: boolean
  onClick: (id: string, cmdOrCtrlPressed?: boolean) => void
  onDragStart: () => void
  onDragEnd: (id: string, x: number, y: number) => void
  onTextChange: (id: string, newText: string) => void
  onEditingChange: (editing: boolean) => void
}

const Text: React.FC<TextProps> = ({
  textShape,
  isSelected,
  // isPrimary not used in this component (kept in interface for consistency)
  isShiftPressed,
  isInMultiSelectGroup = false,
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
    const cmdOrCtrlPressed = e.evt.metaKey || e.evt.ctrlKey
    onClick(textShape.id, cmdOrCtrlPressed)
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
    
    input.style.left = `${absPos.x + 104}px`  // Position 104px to the right (4px offset from toolbar)
    input.style.top = `${absPos.y + 30}px`  // Position 30px below the text
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

  // Measure and persist text dimensions (debounced for performance)
  useEffect(() => {
    if (!textRef.current) return

    const node = textRef.current
    const width = node.width()
    const height = node.height()

    // Only update if measurements changed significantly (avoid tiny rendering variations)
    const currentWidth = textShape.measuredWidth || 0
    const currentHeight = textShape.measuredHeight || 0

    if (Math.abs(width - currentWidth) > 1 || Math.abs(height - currentHeight) > 1) {
      // Debounce: wait 500ms after last change before updating Firebase
      const timeoutId = setTimeout(() => {
        canvasService.canvasService.updateText(textShape.id, {
          measuredWidth: width,
          measuredHeight: height
        }).catch((err: unknown) => {
          console.error('Failed to update text measurements:', err)
          // Non-critical error - alignment will use estimation fallback
        })
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [textShape.text, textShape.fontSize, textShape.fontWeight, textShape.fontStyle, textShape.measuredWidth, textShape.measuredHeight, textShape.id])

  // Get selection styling
  const selectionStyle = getShapeSelectionStyle(textShape.color, isSelected, false)

  // Disable dragging when editing, Shift is pressed, or in multi-select group
  const draggable = isShapeDraggable(isSelected, isShiftPressed, isEditing) && !isInMultiSelectGroup

  // Calculate offset for rotation around center
  const textWidth = textShape.measuredWidth || 100
  const textHeight = textShape.measuredHeight || 20

  return (
    <Group
      ref={groupRef}
      x={textShape.x + textWidth / 2}  // Position at center
      y={textShape.y + textHeight / 2}
      offsetX={textWidth / 2}  // Rotate around center
      offsetY={textHeight / 2}
      rotation={textShape.rotation || 0}
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

