/**
 * Shape Style Helpers
 * Centralized utilities for consistent shape styling across all shape types
 * 
 * REFACTORED (Post-3C): Eliminates duplicate selection styling logic
 * across Rectangle, Circle, Line, and Text components
 */

import { SELECTION_COLORS } from './constants'

/**
 * Get consistent selection styling for any shape
 * Handles three states: unselected, selected by current user, selected by other user
 * 
 * @param baseColor - The shape's base color
 * @param isSelected - Is this shape selected by the current user?
 * @param isSelectedByOther - Is this shape selected by another user?
 * @returns Object with stroke, strokeWidth, and dash properties
 */
export function getShapeSelectionStyle(
  baseColor: string,
  isSelected: boolean,
  isSelectedByOther: boolean = false
): {
  stroke: string
  strokeWidth: number
  dash?: number[]
} {
  if (isSelected) {
    return {
      stroke: SELECTION_COLORS.STROKE,
      strokeWidth: SELECTION_COLORS.STROKE_WIDTH,
      dash: undefined
    }
  }
  
  if (isSelectedByOther) {
    return {
      stroke: SELECTION_COLORS.OTHER_USER,
      strokeWidth: 2,
      dash: [5, 5]
    }
  }
  
  // Unselected state - use base color with minimal stroke
  return {
    stroke: baseColor,
    strokeWidth: 1,
    dash: undefined
  }
}

/**
 * Calculate stroke color for lines (which show color in stroke, not fill)
 * Lines behave differently: we keep the actual color visible and just increase width for selection
 */
export function getLineSelectionStyle(
  lineColor: string,
  baseStrokeWidth: number,
  isSelected: boolean,
  isSelectedByOther: boolean = false
): {
  stroke: string
  strokeWidth: number
  dash?: number[]
} {
  if (isSelected) {
    return {
      stroke: lineColor,  // Keep actual color visible
      strokeWidth: baseStrokeWidth + 2,  // Thicker to show selection
      dash: undefined
    }
  }
  
  if (isSelectedByOther) {
    return {
      stroke: SELECTION_COLORS.OTHER_USER,
      strokeWidth: baseStrokeWidth + 1,
      dash: [5, 5]
    }
  }
  
  return {
    stroke: lineColor,
    strokeWidth: baseStrokeWidth,
    dash: undefined
  }
}

/**
 * Get shadow properties for selected shapes
 */
export function getSelectionShadow(isSelected: boolean) {
  return {
    shadowColor: isSelected ? SELECTION_COLORS.STROKE : 'transparent',
    shadowBlur: isSelected ? 5 : 0,
    shadowOpacity: isSelected ? 0.3 : 0
  }
}

/**
 * Check if a shape should be draggable
 * Common logic used across all shape components
 */
export function isShapeDraggable(
  isSelected: boolean,
  isShiftPressed: boolean,
  isInteracting: boolean = false
): boolean {
  return isSelected && !isShiftPressed && !isInteracting
}

