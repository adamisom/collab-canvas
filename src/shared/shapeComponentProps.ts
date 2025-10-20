/**
 * Shared prop interfaces for shape components
 * 
 * REFACTORED (Post-3C): Provides consistent type contracts for all shape components
 * Makes it easier to add new shapes and ensures uniform behavior
 */

/**
 * Base props that all shape components should accept
 * Provides consistent selection, interaction, and event handling interfaces
 */
export interface BaseShapeProps<TShape> {
  /** The shape data to render */
  shape: TShape
  
  /** Whether this shape is selected by the current user */
  isSelected: boolean
  
  /** Whether this is the primary selection (shows resize handles/controls) */
  isPrimary: boolean
  
  /** Whether Shift key is currently pressed (disables dragging for selection box) */
  isShiftPressed: boolean
  
  /** Click handler - called when shape is clicked */
  onClick: (id: string) => void
  
  /** Drag start handler - called when dragging begins */
  onDragStart: () => void
  
  /** Drag end handler - called when dragging ends with new position */
  onDragEnd: (id: string, x: number, y: number) => void
  
  /** Resize start handler (optional) - called when resizing begins */
  onResizeStart?: () => void
  
  /** Resize end handler (optional) - called when resizing ends */
  onResizeEnd?: () => void
}

/**
 * Props for Rectangle component
 */
export interface RectangleComponentProps extends BaseShapeProps<{
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  zIndex: number
  selectedBy: string | null
  selectedByUsername?: string | null
}> {
  /** Resize handler for width/height changes */
  onResize?: (
    rectangle: { id: string },
    newWidth: number,
    newHeight: number,
    newX?: number,
    newY?: number
  ) => void
}

/**
 * Props for Circle component
 */
export interface CircleComponentProps extends BaseShapeProps<{
  id: string
  x: number
  y: number
  radius: number
  color: string
  zIndex: number
  selectedBy: string | null
  selectedByUsername?: string | null
}> {
  /** Resize handler for radius changes */
  onResize: (id: string, radius: number, x: number, y: number) => void
  onResizeStart: () => void  // Required for Circle
  onResizeEnd: () => void    // Required for Circle
}

/**
 * Props for Line component
 */
export interface LineComponentProps extends BaseShapeProps<{
  id: string
  x: number
  y: number
  endX: number
  endY: number
  color: string
  strokeWidth: number
  hasArrow: boolean
  zIndex: number
  selectedBy: string | null
  selectedByUsername?: string | null
}> {
  /** Handler for endpoint position changes */
  onEndpointsChange: (id: string, endX: number, endY: number) => void
  onResizeStart: () => void  // Required for Line (endpoint dragging)
  onResizeEnd: () => void    // Required for Line (endpoint dragging)
}

/**
 * Props for Text component
 */
export interface TextComponentProps extends BaseShapeProps<{
  id: string
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily: string
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  color: string
  zIndex: number
  selectedBy: string | null
  selectedByUsername?: string | null
}> {
  /** Handler for text content changes */
  onTextChange: (id: string, newText: string) => void
  
  /** Handler for editing state changes (disables panning) */
  onEditingChange: (editing: boolean) => void
}

