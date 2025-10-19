/**
 * Shared shape type definitions for Phase 3C
 * 
 * This file defines the discriminated union of all shape types
 * used throughout the application.
 */

/**
 * Base properties shared by all shapes
 */
interface BaseShape {
  id: string
  type: 'rectangle' | 'circle' | 'line' | 'text'
  x: number
  y: number
  color: string
  zIndex: number
  createdBy: string
  createdAt: number
  selectedBy: string | null
  selectedAt: number | null
}

/**
 * Rectangle shape (from Phase 1/2/3A/3B)
 */
export interface Rectangle extends BaseShape {
  type: 'rectangle'
  width: number
  height: number
  updatedAt: number
}

/**
 * Circle shape (Phase 3C PR #5)
 */
export interface CircleShape extends BaseShape {
  type: 'circle'
  radius: number
}

/**
 * Line/Arrow shape (Phase 3C PR #6)
 */
export interface LineShape extends BaseShape {
  type: 'line'
  startX: number
  startY: number
  endX: number
  endY: number
  hasArrow: boolean
}

/**
 * Text shape (Phase 3C PR #7)
 */
export interface TextShape extends BaseShape {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  // PR #8 additions (BONUS):
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
}

/**
 * Discriminated union of all shape types
 * Use TypeScript's type narrowing to safely access shape-specific properties
 */
export type Shape = Rectangle | CircleShape | LineShape | TextShape

/**
 * Type guard to check if a shape is a rectangle
 */
export function isRectangle(shape: Shape): shape is Rectangle {
  return shape.type === 'rectangle'
}

/**
 * Type guard to check if a shape is a circle
 */
export function isCircle(shape: Shape): shape is CircleShape {
  return shape.type === 'circle'
}

/**
 * Type guard to check if a shape is a line
 */
export function isLine(shape: Shape): shape is LineShape {
  return shape.type === 'line'
}

/**
 * Type guard to check if a shape is text
 */
export function isText(shape: Shape): shape is TextShape {
  return shape.type === 'text'
}

/**
 * Shape type identifier
 */
export type ShapeType = Shape['type']

