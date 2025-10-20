/**
 * Canvas Command Executor Service
 * Executes AI-generated commands on the canvas
 * 
 * CRITICAL: This service ONLY calls CanvasContext methods
 * It NEVER writes directly to Firebase (delegation pattern)
 */

import type { 
  CanvasState, 
  ViewportInfo, 
  SelectedShape, 
  AICommand,
  CreateRectangleParams,
  ChangeColorParams,
  MoveRectangleParams,
  ResizeRectangleParams,
  DeleteRectangleParams,
  DuplicateRectangleParams,
  BringToFrontParams,
  SendToBackParams,
  CreateMultipleRectanglesParams
} from '../shared/types'
import type { CircleShape, LineShape, TextShape, Shape } from '../shared/shapes'
import { 
  DEFAULT_RECT, 
  RECTANGLE_CONSTRAINTS, 
  CANVAS_BOUNDS,
  VALID_AI_COLORS,
  AI_CONSTANTS
} from '../utils/constants'
import { calculateBatchLayout } from '../utils/batchLayoutCalculator'
import type { Rectangle } from './canvasService'

/**
 * CanvasContext methods interface (for dependency injection)
 */
export interface CanvasContextMethods {
  rectangles: Rectangle[]
  circles: CircleShape[]  // Phase 3F
  lines: LineShape[]  // Phase 3F
  texts: TextShape[]  // Phase 3F
  primarySelectionId: string | null  // CHANGED: AI operates on primary selection
  primarySelectionType: 'rectangle' | 'circle' | 'line' | 'text' | null  // Phase 3D
  selectedShapes: Map<string, 'rectangle' | 'circle' | 'line' | 'text'>  // Phase 3D
  getViewportInfo: () => ViewportInfo | null
  createRectangle: (x: number, y: number) => Promise<Rectangle | null>
  updateRectangle: (rectangleId: string, updates: Partial<Rectangle>) => Promise<void>
  resizeRectangle: (rectangleId: string, width: number, height: number, x?: number, y?: number) => Promise<void>
  deleteRectangle: (rectangleId: string) => Promise<void>
  duplicateRectangle: (rectangleId: string) => Promise<Rectangle | null>
  bringToFront: (rectangleId: string) => Promise<void>
  sendToBack: (rectangleId: string) => Promise<void>
  changeRectangleColor: (rectangleId: string, color: string) => Promise<void>
  selectRectangle: (rectangleId: string, additive?: boolean) => Promise<void>  // CHANGED: selectRectangle no longer takes null
  setSelectionLocked: (locked: boolean) => void
  // Circle operations
  updateCircle: (circleId: string, updates: Partial<CircleShape>) => Promise<void>
  deleteCircle: (circleId: string) => Promise<void>
  // Line operations
  updateLine: (lineId: string, updates: Partial<LineShape>) => Promise<void>
  deleteLine: (lineId: string) => Promise<void>
  // Text operations
  deleteText: (textId: string) => Promise<void>
  // Phase 3D: Alignment, Selection, Rotation
  alignShapes: (alignType: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom' | 'distribute-horizontal' | 'distribute-vertical') => Promise<void>
  selectAllOfType: (shapeType: 'rectangle' | 'circle' | 'line' | 'text') => Promise<void>
  selectShape: (shapeId: string, shapeType: 'rectangle' | 'circle' | 'line' | 'text', additive?: boolean) => Promise<void>
  clearSelection: () => Promise<void>
  rotateShape: (shapeId: string, shapeType: 'rectangle' | 'circle' | 'line' | 'text', rotation: number) => Promise<void>
  // Batch operations
  deleteSelectedShapes: () => Promise<void>
  changeSelectedShapesColor: (color: string) => Promise<void>
  // Shape operations (all types)
  duplicateShape: (shapeId: string, shapeType: 'rectangle' | 'circle' | 'line' | 'text') => Promise<boolean>
  // Phase 3F: Shape creation
  createCircle: (x: number, y: number, radius: number, color: string) => Promise<CircleShape | null>
  createLine: (x: number, y: number, endX: number, endY: number, hasArrow: boolean, color: string) => Promise<LineShape | null>
  createText: (x: number, y: number, text: string, fontSize: number, color: string) => Promise<TextShape | null>
  updateText: (textId: string, updates: Partial<TextShape>) => Promise<void>
  changeTextFontSize: (textId: string, fontSize: number) => Promise<void>
  toggleTextBold: (textId: string) => Promise<void>
  toggleTextItalic: (textId: string) => Promise<void>
}

export class CanvasCommandExecutor {
  private context: CanvasContextMethods

  constructor(context: CanvasContextMethods) {
    this.context = context
  }

  /**
   * Get current canvas state (all rectangles)
   */
  getCanvasState(): CanvasState {
    return {
      rectangles: this.context.rectangles.map(r => ({
        id: r.id,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        color: r.color
      })),
      circles: (this.context.circles || []).map(c => ({
        id: c.id,
        x: c.x,
        y: c.y,
        radius: c.radius,
        color: c.color
      })),
      lines: (this.context.lines || []).map(l => ({
        id: l.id,
        x: l.x,
        y: l.y,
        endX: l.endX,
        endY: l.endY,
        color: l.color
      })),
      texts: (this.context.texts || []).map(t => ({
        id: t.id,
        x: t.x,
        y: t.y,
        text: t.text,
        fontSize: t.fontSize,
        color: t.color,
        measuredWidth: t.measuredWidth,
        measuredHeight: t.measuredHeight
      }))
    }
  }

  /**
   * Get current viewport info from CanvasContext
   */
  getViewportInfo(): ViewportInfo | null {
    return this.context.getViewportInfo()
  }

  /**
   * Get selected shape info (or null if none selected)
   */
  getSelectedShape(): SelectedShape | null {
    const selectedId = this.context.primarySelectionId
    const selectedType = this.context.primarySelectionType
    
    if (!selectedId || !selectedType) return null

    // Use primarySelectionType to check the correct array
    switch (selectedType) {
      case 'rectangle': {
        const rectangle = this.context.rectangles.find(r => r.id === selectedId)
        if (!rectangle) return null
        return {
          id: rectangle.id,
          type: 'rectangle',
          color: rectangle.color,
          x: rectangle.x,
          y: rectangle.y,
          width: rectangle.width,
          height: rectangle.height
        }
      }

      case 'circle': {
        const circle = this.context.circles.find(c => c.id === selectedId)
        if (!circle) return null
        return {
          id: circle.id,
          type: 'circle',
          color: circle.color,
          x: circle.x,
          y: circle.y,
          width: circle.radius * 2,
          height: circle.radius * 2
        }
      }

      case 'line': {
        const line = this.context.lines.find(l => l.id === selectedId)
        if (!line) return null
        return {
          id: line.id,
          type: 'line',
          color: line.color,
          x: line.x,
          y: line.y,
          width: Math.abs(line.endX - line.x),
          height: Math.abs(line.endY - line.y)
        }
      }

      case 'text': {
        const text = this.context.texts.find(t => t.id === selectedId)
        if (!text) return null
        return {
          id: text.id,
          type: 'text',
          color: text.color,
          x: text.x,
          y: text.y,
          width: text.measuredWidth || 100,
          height: text.measuredHeight || 20
        }
      }

      default:
        return null
    }
  }

  /**
   * Execute a single AI command
   * Validates parameters and delegates to CanvasContext
   */
  async executeCommand(command: AICommand, createdRectangleId?: string): Promise<void> {
    const { tool, parameters } = command

    switch (tool) {
      case 'createRectangle':
        await this.executeCreateRectangle(parameters as CreateRectangleParams)
        break

      case 'changeColor':
        await this.executeChangeColor(parameters as ChangeColorParams, createdRectangleId)
        break

      case 'moveShape': // Renamed from moveRectangle - now works on all shapes
        await this.executeMoveShape(parameters as MoveRectangleParams, createdRectangleId)
        break

      case 'resizeRectangle': // Still rectangle-only
        await this.executeResizeRectangle(parameters as ResizeRectangleParams, createdRectangleId)
        break

      case 'deleteShape': // Renamed from deleteRectangle - now works on all shapes
        await this.executeDeleteShape(parameters as DeleteRectangleParams, createdRectangleId)
        break

      case 'duplicateShape': // Renamed from duplicateRectangle - now works on all shapes
        await this.executeDuplicateShape(parameters as DuplicateRectangleParams, createdRectangleId)
        break

      case 'bringToFront':
        await this.executeBringToFront(parameters as BringToFrontParams, createdRectangleId)
        break

      case 'sendToBack':
        await this.executeSendToBack(parameters as SendToBackParams, createdRectangleId)
        break

      case 'createMultipleRectangles':
        await this.executeCreateMultipleRectangles(parameters as CreateMultipleRectanglesParams)
        break

      case 'alignShapes':
        await this.executeAlignShapes(parameters as { alignType: string })
        break

      case 'selectAllOfType':
        await this.executeSelectAllOfType(parameters as { shapeType: string })
        break

      case 'selectShapesByColor':
        await this.executeSelectShapesByColor(parameters as { color: string })
        break

      case 'clearSelection':
        await this.executeClearSelection()
        break

      case 'rotateShape':
        await this.executeRotateShape(parameters as { angle: number })
        break

      case 'changeColorBatch':
        await this.executeChangeColorBatch(parameters as { color: string })
        break

      case 'resizeBatch':
        await this.executeResizeBatch(parameters as { width?: number; height?: number })
        break

      case 'deleteBatch':
        await this.executeDeleteBatch()
        break

      case 'rotateBatch':
        await this.executeRotateBatch(parameters as { angle: number })
        break

      case 'moveBatch':
        await this.executeMoveBatch(parameters as { dx: number; dy: number })
        break

      case 'createCircle':
        await this.executeCreateCircle(parameters as { x?: number; y?: number; radius?: number; color?: string })
        break

      case 'createLine':
        await this.executeCreateLine(parameters as { x: number; y: number; endX: number; endY: number; color?: string })
        break

      case 'createText':
        await this.executeCreateText(parameters as { x?: number; y?: number; text: string; fontSize?: number; color?: string })
        break

      case 'updateTextContent':
        await this.executeUpdateTextContent(parameters as { text: string })
        break

      case 'updateTextFontSize':
        await this.executeUpdateTextFontSize(parameters as { fontSize: number })
        break

      case 'toggleTextBold':
        await this.executeToggleTextBold()
        break

      case 'toggleTextItalic':
        await this.executeToggleTextItalic()
        break

      default:
        throw new Error(`Unknown tool: ${tool}`)
    }
  }

  /**
   * Create a single rectangle
   */
  private async executeCreateRectangle(params: CreateRectangleParams): Promise<Rectangle | null> {
    // Get viewport info for default positioning
    const viewportInfo = this.getViewportInfo()
    if (!viewportInfo) {
      throw new Error('Viewport info not available')
    }

    // Use provided coordinates or default to slightly left and above viewport center
    const defaultX = viewportInfo.centerX - 100
    const defaultY = viewportInfo.centerY - 70
    
    const x = this.clampNumber(
      params.x ?? defaultX,
      CANVAS_BOUNDS.MIN_X,
      CANVAS_BOUNDS.MAX_X
    )
    const y = this.clampNumber(
      params.y ?? defaultY,
      CANVAS_BOUNDS.MIN_Y,
      CANVAS_BOUNDS.MAX_Y
    )
    const width = this.clampNumber(
      params.width || DEFAULT_RECT.WIDTH, 
      RECTANGLE_CONSTRAINTS.MIN_WIDTH, 
      RECTANGLE_CONSTRAINTS.MAX_WIDTH
    )
    const height = this.clampNumber(
      params.height || DEFAULT_RECT.HEIGHT,
      RECTANGLE_CONSTRAINTS.MIN_HEIGHT,
      RECTANGLE_CONSTRAINTS.MAX_HEIGHT
    )

    // Use provided color or default to blue
    const color = params.color || DEFAULT_RECT.FILL
    
    // Validate color
    if (!this.isValidColor(color)) {
      throw new Error(`Invalid color: ${color}. Must be one of: ${VALID_AI_COLORS.join(', ')}`)
    }

    // Create rectangle via CanvasContext
    const rect = await this.context.createRectangle(x, y)
    
    if (!rect) {
      throw new Error('Failed to create rectangle')
    }

    // Update with correct dimensions and color
    await this.context.updateRectangle(rect.id, {
      width,
      height,
      color
    })

    return rect
  }

  /**
   * Change color of existing rectangle
   */
  private async executeChangeColor(params: ChangeColorParams, createdRectangleId?: string): Promise<void> {
    // Use provided shapeId, or createdRectangleId from multi-step, or fall back to selected shape
    const shapeId = createdRectangleId || params.shapeId || this.context.primarySelectionId

    // Validate shapeId exists
    if (!shapeId) {
      throw new Error('No shape ID provided')
    }

    // Get shape type
    const shapeType = this.context.primarySelectionType

    // Only validate existence if not using createdRectangleId (to avoid race condition)
    if (!createdRectangleId && !shapeType) {
      throw new Error(`Shape ${shapeId} not found or was deleted`)
    }

    // Validate color
    if (!this.isValidColor(params.color)) {
      throw new Error(`Invalid color: ${params.color}`)
    }

    // Call the appropriate color change method based on shape type
    switch (shapeType) {
      case 'rectangle':
        await this.context.changeRectangleColor(shapeId, params.color)
        break
      case 'circle':
        await this.context.updateCircle(shapeId, { color: params.color })
        break
      case 'line':
        await this.context.updateLine(shapeId, { color: params.color })
        break
      case 'text':
        await this.context.updateText(shapeId, { color: params.color })
        break
      default:
        throw new Error(`Unknown shape type: ${shapeType}`)
    }
  }

  /**
   * Move shape to new absolute position (works for all shape types)
   */
  private async executeMoveShape(params: MoveRectangleParams, createdRectangleId?: string): Promise<void> {
    // Use provided shapeId, or createdRectangleId from multi-step, or fall back to selected shape
    const shapeId = createdRectangleId || params.shapeId || this.context.primarySelectionId

    // Validate shapeId exists
    if (!shapeId) {
      throw new Error('No shape ID provided')
    }

    const x = this.clampNumber(params.x, CANVAS_BOUNDS.MIN_X, CANVAS_BOUNDS.MAX_X)
    const y = this.clampNumber(params.y, CANVAS_BOUNDS.MIN_Y, CANVAS_BOUNDS.MAX_Y)

    // Determine shape type and update accordingly
    const shapeType = this.context.primarySelectionType
    
    switch (shapeType) {
      case 'rectangle':
        await this.context.updateRectangle(shapeId, { x, y })
        break
      case 'circle':
        await this.context.updateCircle(shapeId, { x, y })
        break
      case 'line': {
        const line = this.context.lines.find(l => l.id === shapeId)
        if (line) {
          const dx = x - line.x
          const dy = y - line.y
          await this.context.updateLine(shapeId, { x, y, endX: line.endX + dx, endY: line.endY + dy })
        }
        break
      }
      case 'text':
        await this.context.updateText(shapeId, { x, y })
        break
      default:
        throw new Error(`Unknown shape type: ${shapeType}`)
    }
  }

  /**
   * Resize existing rectangle
   */
  private async executeResizeRectangle(params: ResizeRectangleParams, createdRectangleId?: string): Promise<void> {
    // Use provided shapeId, or createdRectangleId from multi-step, or fall back to selected rectangle
    const shapeId = createdRectangleId || params.shapeId || this.context.primarySelectionId

    // Validate shapeId exists
    if (!shapeId) {
      throw new Error('No rectangle ID provided')
    }

    // Only validate existence if not using createdRectangleId (to avoid race condition)
    if (!createdRectangleId && !this.rectangleExists(shapeId)) {
      throw new Error(`Rectangle ${shapeId} not found or was deleted`)
    }

    // Get current rectangle to use as defaults if dimensions not provided
    const currentRect = this.context.rectangles.find(r => r.id === shapeId)
    
    const width = this.clampNumber(
      params.width ?? currentRect?.width ?? DEFAULT_RECT.WIDTH,
      RECTANGLE_CONSTRAINTS.MIN_WIDTH,
      RECTANGLE_CONSTRAINTS.MAX_WIDTH
    )
    const height = this.clampNumber(
      params.height ?? currentRect?.height ?? DEFAULT_RECT.HEIGHT,
      RECTANGLE_CONSTRAINTS.MIN_HEIGHT,
      RECTANGLE_CONSTRAINTS.MAX_HEIGHT
    )

    await this.context.resizeRectangle(shapeId, width, height)
  }

  /**
   * Delete existing shape (works for all shape types)
   */
  private async executeDeleteShape(params: DeleteRectangleParams, createdRectangleId?: string): Promise<void> {
    // Use provided shapeId, or createdRectangleId from multi-step, or fall back to selected shape
    const shapeId = createdRectangleId || params.shapeId || this.context.primarySelectionId

    // Validate shapeId exists
    if (!shapeId) {
      throw new Error('No shape ID provided')
    }

    // Determine shape type and delete accordingly
    const shapeType = this.context.primarySelectionType
    
    switch (shapeType) {
      case 'rectangle':
        await this.context.deleteRectangle(shapeId)
        break
      case 'circle':
        await this.context.deleteCircle(shapeId)
        break
      case 'line':
        await this.context.deleteLine(shapeId)
        break
      case 'text':
        await this.context.deleteText(shapeId)
        break
      default:
        throw new Error(`Unknown shape type: ${shapeType}`)
    }
  }

  /**
   * Duplicate existing shape (works for all shape types)
   */
  private async executeDuplicateShape(params: DuplicateRectangleParams, createdRectangleId?: string): Promise<void> {
    // Use provided shapeId, or createdRectangleId from multi-step, or fall back to selected shape
    const shapeId = createdRectangleId || params.shapeId || this.context.primarySelectionId

    // Validate shapeId exists
    if (!shapeId) {
      throw new Error('No shape selected to duplicate')
    }

    // Determine shape type and duplicate accordingly
    const shapeType = this.context.primarySelectionType
    
    if (!shapeType) {
      throw new Error('Unknown shape type for duplication')
    }

    await this.context.duplicateShape(shapeId, shapeType)
  }

  /**
   * Bring rectangle to front
   */
  private async executeBringToFront(params: BringToFrontParams, createdRectangleId?: string): Promise<void> {
    // Use provided shapeId, or createdRectangleId from multi-step, or fall back to selected shape
    const shapeId = createdRectangleId || params.shapeId || this.context.primarySelectionId

    // Validate shapeId exists
    if (!shapeId) {
      throw new Error('No shape selected to bring to front')
    }

    // Get shape type for validation
    const shapeType = this.context.primarySelectionType

    // Only validate existence if not using createdRectangleId (to avoid race condition)
    if (!createdRectangleId && !shapeType) {
      throw new Error(`Shape ${shapeId} not found or was deleted`)
    }

    await this.context.bringToFront(shapeId)
  }

  /**
   * Send rectangle to back
   */
  private async executeSendToBack(params: SendToBackParams, createdRectangleId?: string): Promise<void> {
    // Use provided shapeId, or createdRectangleId from multi-step, or fall back to selected shape
    const shapeId = createdRectangleId || params.shapeId || this.context.primarySelectionId

    // Validate shapeId exists
    if (!shapeId) {
      throw new Error('No shape selected to send to back')
    }

    // Get shape type for validation
    const shapeType = this.context.primarySelectionType

    // Only validate existence if not using createdRectangleId (to avoid race condition)
    if (!createdRectangleId && !shapeType) {
      throw new Error(`Shape ${shapeId} not found or was deleted`)
    }

    await this.context.sendToBack(shapeId)
  }

  /**
   * Create multiple rectangles with automatic spacing
   */
  private async executeCreateMultipleRectangles(params: CreateMultipleRectanglesParams): Promise<void> {
    const count = Math.min(params.count, AI_CONSTANTS.MAX_BATCH_COUNT)
    const layout = params.layout || 'row'
    const offsetPixels = this.clampNumber(
      params.offsetPixels || AI_CONSTANTS.DEFAULT_BATCH_OFFSET,
      AI_CONSTANTS.MIN_BATCH_OFFSET,
      AI_CONSTANTS.MAX_BATCH_OFFSET
    )

    // Validate color
    if (!this.isValidColor(params.color)) {
      throw new Error(`Invalid color: ${params.color}`)
    }

    // Get viewport center
    const viewportInfo = this.getViewportInfo()
    if (!viewportInfo) {
      throw new Error('Viewport info not available')
    }

    const startX = viewportInfo.centerX
    const startY = viewportInfo.centerY

    // Calculate positions based on layout
    const positions = calculateBatchLayout({
      count,
      layout,
      startX,
      startY,
      width: DEFAULT_RECT.WIDTH,
      height: DEFAULT_RECT.HEIGHT,
      offset: offsetPixels
    })

    // Create all rectangles
    for (const pos of positions) {
      const rect = await this.context.createRectangle(pos.x, pos.y)
      if (rect) {
        await this.context.updateRectangle(rect.id, { color: params.color })
      }
    }
  }

  /**
   * Validate color is in allowed list
   */
  private isValidColor(color: string): color is typeof VALID_AI_COLORS[number] {
    return VALID_AI_COLORS.includes(color as typeof VALID_AI_COLORS[number])
  }

  /**
   * Check if rectangle exists in current canvas state
   */
  private rectangleExists(id: string): boolean {
    return this.context.rectangles.some(r => r.id === id)
  }

  /**
   * Clamp number to valid range
   */
  private clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  /**
   * Phase 3D: Align selected shapes
   */
  private async executeAlignShapes(params: { alignType: string }): Promise<void> {
    const { alignType } = params

    // Validate alignment type
    const validTypes = ['left', 'center-horizontal', 'right', 'top', 'center-vertical', 'bottom', 'distribute-horizontal', 'distribute-vertical']
    if (!validTypes.includes(alignType)) {
      throw new Error(`Invalid alignment type: ${alignType}`)
    }

    // Require 2+ shapes selected
    if (this.context.selectedShapes.size < 2) {
      throw new Error('Alignment requires at least 2 shapes selected')
    }

    // Distribute requires 3+ shapes
    if ((alignType === 'distribute-horizontal' || alignType === 'distribute-vertical') && this.context.selectedShapes.size < 3) {
      throw new Error('Distribution requires at least 3 shapes selected')
    }

    await this.context.alignShapes(alignType as 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom')
  }

  /**
   * Phase 3D: Select all shapes of a specific type
   */
  private async executeSelectAllOfType(params: { shapeType: string }): Promise<void> {
    const { shapeType } = params

    // Validate shape type
    const validTypes = ['rectangle', 'circle', 'line', 'text']
    if (!validTypes.includes(shapeType)) {
      throw new Error(`Invalid shape type: ${shapeType}`)
    }

    await this.context.selectAllOfType(shapeType as 'rectangle' | 'circle' | 'line' | 'text')
  }

  /**
   * Phase 3D: Rotate the primary selected shape
   */
  private async executeRotateShape(params: { angle: number }): Promise<void> {
    const { angle } = params

    // Require a shape to be selected
    if (!this.context.primarySelectionId || !this.context.primarySelectionType) {
      throw new Error('Rotation requires a shape to be selected')
    }

    // Validate angle is a number
    if (typeof angle !== 'number' || isNaN(angle)) {
      throw new Error('Rotation angle must be a valid number')
    }

    // Normalize angle to 0-360 range
    let normalizedAngle = angle % 360
    if (normalizedAngle < 0) {
      normalizedAngle += 360
    }

    await this.context.rotateShape(
      this.context.primarySelectionId,
      this.context.primarySelectionType,
      normalizedAngle
    )
  }

  /**
   * Batch: Change color of all selected shapes
   */
  private async executeChangeColorBatch(params: { color: string }): Promise<void> {
    const { color } = params

    // Require at least one shape to be selected
    if (this.context.selectedShapes.size === 0) {
      throw new Error('No shapes selected. Please select one or more shapes first.')
    }

    // Validate color (use type assertion for includes check with readonly const array)
    if (!(VALID_AI_COLORS as readonly string[]).includes(color)) {
      throw new Error(`Invalid color: ${color}. Must be one of: ${VALID_AI_COLORS.join(', ')}`)
    }

    // Safe to pass after validation
    await this.context.changeSelectedShapesColor(color)
  }

  /**
   * Batch: Resize all selected rectangles
   */
  private async executeResizeBatch(params: { width?: number; height?: number }): Promise<void> {
    const { width, height } = params

    // Require at least one shape to be selected
    if (this.context.selectedShapes.size === 0) {
      throw new Error('No shapes selected. Please select one or more rectangles first.')
    }

    // Require at least width or height
    if (width === undefined && height === undefined) {
      throw new Error('Must specify at least width or height for batch resize')
    }

    // Validate dimensions if provided
    if (width !== undefined) {
      if (width < RECTANGLE_CONSTRAINTS.MIN_WIDTH || width > RECTANGLE_CONSTRAINTS.MAX_WIDTH) {
        throw new Error(`Width must be between ${RECTANGLE_CONSTRAINTS.MIN_WIDTH} and ${RECTANGLE_CONSTRAINTS.MAX_WIDTH}`)
      }
    }
    if (height !== undefined) {
      if (height < RECTANGLE_CONSTRAINTS.MIN_HEIGHT || height > RECTANGLE_CONSTRAINTS.MAX_HEIGHT) {
        throw new Error(`Height must be between ${RECTANGLE_CONSTRAINTS.MIN_HEIGHT} and ${RECTANGLE_CONSTRAINTS.MAX_HEIGHT}`)
      }
    }

    // Resize each selected rectangle
    const promises: Promise<void>[] = []
    for (const [id, type] of this.context.selectedShapes.entries()) {
      if (type === 'rectangle') {
        const rect = this.context.rectangles.find(r => r.id === id)
        if (rect) {
          const newWidth = width !== undefined ? width : rect.width
          const newHeight = height !== undefined ? height : rect.height
          promises.push(this.context.resizeRectangle(id, newWidth, newHeight))
        }
      }
    }

    await Promise.all(promises)
  }

  /**
   * Batch: Delete all selected shapes
   */
  private async executeDeleteBatch(): Promise<void> {
    // Require at least one shape to be selected
    if (this.context.selectedShapes.size === 0) {
      throw new Error('No shapes selected. Please select one or more shapes first.')
    }

    await this.context.deleteSelectedShapes()
  }

  /**
   * Phase 3F: Rotate all selected shapes (Batch)
   */
  private async executeRotateBatch(params: { angle: number }): Promise<void> {
    const { angle } = params

    // Require at least one shape to be selected
    if (this.context.selectedShapes.size === 0) {
      throw new Error('No shapes selected. Please select one or more shapes first.')
    }

    // Rotate all selected shapes
    for (const [shapeId, shapeType] of this.context.selectedShapes.entries()) {
      await this.context.rotateShape(shapeId, shapeType, angle)
    }
  }

  /**
   * Phase 3F: Move all selected shapes by offset (Batch)
   */
  private async executeMoveBatch(params: { dx: number; dy: number }): Promise<void> {
    const { dx, dy } = params

    if (this.context.selectedShapes.size === 0) {
      throw new Error('No shapes selected. Please select one or more shapes first.')
    }

    const updates = []
    for (const [shapeId, shapeType] of this.context.selectedShapes.entries()) {
      // Find the actual shape object to get its current position
      let shape: Shape | undefined
      switch (shapeType) {
        case 'rectangle':
          shape = this.context.rectangles.find(r => r.id === shapeId)
          if (shape) updates.push(this.context.updateRectangle(shape.id, { x: shape.x + dx, y: shape.y + dy }))
          break
        case 'circle':
          shape = this.context.circles.find(c => c.id === shapeId)
          if (shape) updates.push(this.context.updateCircle(shape.id, { x: shape.x + dx, y: shape.y + dy }))
          break
        case 'line':
          shape = this.context.lines.find(l => l.id === shapeId)
          if (shape) {
            const line = shape as LineShape
            updates.push(this.context.updateLine(shape.id, { x: line.x + dx, y: line.y + dy, endX: line.endX + dx, endY: line.endY + dy }))
          }
          break
        case 'text':
          shape = this.context.texts.find(t => t.id === shapeId)
          if (shape) updates.push(this.context.updateText(shape.id, { x: shape.x + dx, y: shape.y + dy }))
          break
      }
    }
    await Promise.all(updates)
  }

  /**
   * Phase 3F: Select shapes by color
   */
  private async executeSelectShapesByColor(params: { color: string }): Promise<void> {
    const { color } = params

    // Validate color
    if (!(VALID_AI_COLORS as readonly string[]).includes(color)) {
      throw new Error(`Invalid color: ${color}. Must be one of: ${VALID_AI_COLORS.join(', ')}`)
    }

    // Get all shapes of this color across all types
    const shapesToSelect: Array<{ id: string; type: 'rectangle' | 'circle' | 'line' | 'text' }> = []

    this.context.rectangles.filter(r => r.color === color).forEach(r => shapesToSelect.push({ id: r.id, type: 'rectangle' }))
    this.context.circles.filter(c => c.color === color).forEach(c => shapesToSelect.push({ id: c.id, type: 'circle' }))
    this.context.lines.filter(l => l.color === color).forEach(l => shapesToSelect.push({ id: l.id, type: 'line' }))
    this.context.texts.filter(t => t.color === color).forEach(t => shapesToSelect.push({ id: t.id, type: 'text' }))

    if (shapesToSelect.length === 0) {
      throw new Error(`No shapes found with color ${color}`)
    }

    // Clear current selection
    await this.context.clearSelection()

    // Select all shapes of this color
    for (const { id, type } of shapesToSelect) {
      await this.context.selectShape(id, type, true) // additive = true
    }
  }

  /**
   * Phase 3F: Clear selection / deselect all
   */
  private async executeClearSelection(): Promise<void> {
    await this.context.clearSelection()
  }

  /**
   * Phase 3F: Create a circle
   */
  private async executeCreateCircle(params: { x?: number; y?: number; radius?: number; color?: string }): Promise<CircleShape | null> {
    const viewportInfo = this.getViewportInfo()
    if (!viewportInfo) {
      throw new Error('Viewport info not available')
    }

    const defaultX = viewportInfo.centerX
    const defaultY = viewportInfo.centerY

    const x = params.x ?? defaultX
    const y = params.y ?? defaultY
    const radius = params.radius ?? 50
    const color = params.color ?? '#3b82f6'

    return await this.context.createCircle(x, y, radius, color)
  }

  /**
   * Phase 3F: Create a line
   */
  private async executeCreateLine(params: { x: number; y: number; endX: number; endY: number; color?: string }): Promise<LineShape | null> {
    const { x, y, endX, endY } = params
    const color = params.color ?? '#3b82f6'

    return await this.context.createLine(x, y, endX, endY, false, color) // hasArrow = false
  }

  /**
   * Phase 3F: Create text
   */
  private async executeCreateText(params: { x?: number; y?: number; text: string; fontSize?: number; color?: string }): Promise<TextShape | null> {
    const viewportInfo = this.getViewportInfo()
    if (!viewportInfo) {
      throw new Error('Viewport info not available')
    }

    const defaultX = viewportInfo.centerX
    const defaultY = viewportInfo.centerY

    const x = params.x ?? defaultX
    const y = params.y ?? defaultY
    const fontSize = params.fontSize ?? 16
    const color = params.color ?? '#3b82f6'

    return await this.context.createText(x, y, params.text, fontSize, color)
  }

  /**
   * Phase 3F: Update text content
   */
  private async executeUpdateTextContent(params: { text: string }): Promise<void> {
    if (!this.context.primarySelectionId || this.context.primarySelectionType !== 'text') {
      throw new Error('Please select a text shape first')
    }

    const textShape = this.context.texts.find(t => t.id === this.context.primarySelectionId)
    if (!textShape) {
      throw new Error('Selected text shape not found')
    }

    await this.context.updateText(textShape.id, { text: params.text })
  }

  /**
   * Phase 3F: Update text font size
   */
  private async executeUpdateTextFontSize(params: { fontSize: number }): Promise<void> {
    if (!this.context.primarySelectionId || this.context.primarySelectionType !== 'text') {
      throw new Error('Please select a text shape first')
    }

    await this.context.changeTextFontSize(this.context.primarySelectionId, params.fontSize)
  }

  /**
   * Phase 3F: Toggle text bold
   */
  private async executeToggleTextBold(): Promise<void> {
    if (!this.context.primarySelectionId || this.context.primarySelectionType !== 'text') {
      throw new Error('Please select a text shape first')
    }

    await this.context.toggleTextBold(this.context.primarySelectionId)
  }

  /**
   * Phase 3F: Toggle text italic
   */
  private async executeToggleTextItalic(): Promise<void> {
    if (!this.context.primarySelectionId || this.context.primarySelectionType !== 'text') {
      throw new Error('Please select a text shape first')
    }

    await this.context.toggleTextItalic(this.context.primarySelectionId)
  }
}

