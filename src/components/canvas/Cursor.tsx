import React from 'react'
import { Group, Circle, Text, Rect } from 'react-konva'
import type { CursorPosition } from '../../services/cursorService'

interface CursorProps {
  cursor: CursorPosition
  isOwnCursor?: boolean
}

const Cursor: React.FC<CursorProps> = ({ cursor, isOwnCursor = false }) => {
  // Don't render own cursor
  if (isOwnCursor) {
    return null
  }

  // Generate a consistent color based on the userId
  const getUserColor = (userId: string): string => {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal  
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Mint
      '#F7DC6F', // Light Yellow
      '#BB8FCE', // Light Purple
      '#85C1E9'  // Light Blue
    ]
    
    // Simple hash function to get consistent color
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  const cursorColor = getUserColor(cursor.userId)
  
  return (
    <Group x={cursor.x} y={cursor.y}>
      {/* Cursor pointer */}
      <Group>
        {/* Cursor shadow */}
        <Circle
          x={2}
          y={2}
          radius={6}
          fill="rgba(0, 0, 0, 0.2)"
        />
        
        {/* Main cursor circle */}
        <Circle
          x={0}
          y={0}
          radius={5}
          fill={cursorColor}
          stroke="white"
          strokeWidth={2}
        />
        
        {/* Inner dot */}
        <Circle
          x={0}
          y={0}
          radius={2}
          fill="white"
        />
      </Group>
      
      {/* Username label */}
      <Group x={15} y={-15}>
        {/* Label background */}
        <Rect
          width={cursor.username.length * 14 + 8}
          height={28}
          fill="rgba(0, 0, 0, 0.7)"
          cornerRadius={4}
        />
        
        {/* Username text */}
        <Text
          text={cursor.username}
          fontSize={24}
          fontFamily="Inter, system-ui, sans-serif"
          fill={cursorColor}
          stroke="white"
          strokeWidth={1}
          align="left"
          verticalAlign="middle"
          x={4}
          y={2}
        />
      </Group>
    </Group>
  )
}

export default Cursor
