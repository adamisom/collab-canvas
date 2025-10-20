import React from 'react'
import { Group, Text, Rect, Line } from 'react-konva'
import type { CursorPosition } from '../../services/cursorService'
import { getUserColor } from '../../utils/userColors'

interface CursorProps {
  cursor: CursorPosition
  isOwnCursor?: boolean
}

const Cursor: React.FC<CursorProps> = ({ cursor, isOwnCursor = false }) => {
  // Don't render own cursor
  if (isOwnCursor) {
    return null
  }

  const userColor = getUserColor(cursor.userId)
  const displayName = cursor.username || 'User'
  
  return (
    <Group x={cursor.x} y={cursor.y}>
      {/* Cursor arrow */}
      <Line
        points={[0, 0, 0, 16, 4, 12, 8, 18, 12, 14, 8, 10, 14, 10, 0, 0]}
        fill={userColor}
        stroke="white"
        strokeWidth={1}
        closed
      />
      
      {/* User name badge */}
      <Group x={16} y={0}>
        {/* Background pill */}
        <Rect
          x={0}
          y={0}
          width={displayName.length * 7 + 16}
          height={20}
          fill="rgba(0, 0, 0, 0.8)"
          cornerRadius={10}
        />
        
        {/* User name */}
        <Text
          x={8}
          y={5}
          text={displayName}
          fontSize={11}
          fill="white"
        />
      </Group>
    </Group>
  )
}

export default Cursor
