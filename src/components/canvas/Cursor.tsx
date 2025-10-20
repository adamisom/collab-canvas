import React from 'react'
import { Group, Circle, Text, Rect, Line } from 'react-konva'
import type { CursorPosition } from '../../services/cursorService'
import { getUserColor } from '../../utils/userColors'
import { useUserProfile } from '../../contexts/UserProfilesContext'

interface CursorProps {
  cursor: CursorPosition
  isOwnCursor?: boolean
}

const Cursor: React.FC<CursorProps> = ({ cursor, isOwnCursor = false }) => {
  const { profile, initials } = useUserProfile(cursor.userId)

  // Don't render own cursor or if profile not loaded yet
  if (isOwnCursor || !profile || !profile.displayName) {
    return null
  }

  const userColor = getUserColor(cursor.userId)
  
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
      
      {/* User info badge */}
      <Group x={16} y={0}>
        {/* Background pill */}
        <Rect
          x={0}
          y={0}
          width={Math.max(profile.displayName.length * 7 + 40, 80)}
          height={24}
          fill="rgba(0, 0, 0, 0.8)"
          cornerRadius={12}
        />
        
        {/* Initials circle */}
        <Circle
          x={12}
          y={12}
          radius={8}
          fill={userColor}
        />
        <Text
          x={8}
          y={7}
          text={initials}
          fontSize={8}
          fill="white"
          fontStyle="bold"
        />
        
        {/* User name */}
        <Text
          x={24}
          y={7}
          text={profile.displayName}
          fontSize={11}
          fill="white"
        />
      </Group>
    </Group>
  )
}

export default Cursor
