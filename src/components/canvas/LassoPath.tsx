import React from 'react'
import { Line } from 'react-konva'

interface LassoPathProps {
  points: number[]
}

/**
 * Lasso selection path visualization
 * Shows the user's freehand selection path
 */
const LassoPath: React.FC<LassoPathProps> = ({ points }) => {
  if (points.length < 2) return null

  return (
    <Line
      points={points}
      stroke="#3b82f6"
      strokeWidth={2}
      dash={[5, 5]}
      closed={false}
      listening={false}
    />
  )
}

export default LassoPath

