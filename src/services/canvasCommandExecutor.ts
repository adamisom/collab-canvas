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
  // Phase 3D: Alignment, Selection, Rotation
  alignShapes: (alignType: 'left' | 'center-horizontal' | 'right' | 'top' | 'center-vertical' | 'bottom' | 'distribute-horizontal' | 'distribute-vertical') => Promise<void>
  selectAllOfType: (shapeType: 'rectangle' | 'circle' | 'line' | 'text') => Promise<void>
  rotateShape: (shapeId: string, shapeType: 'rectangle' | 'circle' | 'line' | 'text', rotation: number) => Promise<void>
  // Batch operations
  deleteSelectedShapes: () => Promise<void>
  changeSelectedShapesColor: (color: string) => Promise<void>
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
    if (!selectedId) return null

    const rectangle = this.context.rectangles.find(r => r.id === selectedId)
    if (!rectangle) return null

    return {
      id: rectangle.id,
      color: rectangle.color,
      x: rectangle.x,
      y: rectangle.y,
      width: rectangle.width,
      height: rectangle.height
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

      case 'moveRectangle':
        await this.executeMoveRectangle(parameters as MoveRectangleParams, createdRectangleId)
        break

      case 'resizeRectangle':
        await this.executeResizeRectangle(parameters as ResizeRectangleParams, createdRectangleId)
        break

      case 'deleteRectangle':
        await this.executeDeleteRectangle(parameters as DeleteRectangleParams, createdRectangleId)
        break

      case 'duplicateRectangle':
        await this.executeDuplicateRectangle(parameters as DuplicateRectangleParams, createdRectangleId)
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

    // Validate color
    if (!this.isValidColor(params.color)) {
      throw new Error(`Invalid color: ${params.color}`)
    }

    await this.context.changeRectangleColor(shapeId, params.color)
  }

  /**
   * Move rectangle to new position
   */
  private async executeMoveRectangle(params: MoveRectangleParams, createdRectangleId?: string): Promise<void> {
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

    const x = this.clampNumber(params.x, CANVAS_BOUNDS.MIN_X, CANVAS_BOUNDS.MAX_X)
    const y = this.clampNumber(params.y, CANVAS_BOUNDS.MIN_Y, CANVAS_BOUNDS.MAX_Y)

    await this.context.updateRectangle(shapeId, { x, y })
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
   * Delete existing rectangle
   */
  private async executeDeleteRectangle(params: DeleteRectangleParams, createdRectangleId?: string): Promise<void> {
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

    await this.context.deleteRectangle(shapeId)
  }

  /**
   * Duplicate existing rectangle
   */
  private async executeDuplicateRectangle(params: DuplicateRectangleParams, createdRectangleId?: string): Promise<void> {
    // Use provided shapeId, or createdRectangleId from multi-step, or fall back to selected rectangle
    const shapeId = createdRectangleId || params.shapeId || this.context.primarySelectionId

    // Validate shapeId exists
    if (!shapeId) {
      throw new Error('No rectangle selected to duplicate')
    }

    // Only validate existence if not using createdRectangleId (to avoid race condition)
    if (!createdRectangleId && !this.rectangleExists(shapeId)) {
      throw new Error(`Rectangle ${shapeId} not found or was deleted`)
    }

    await this.context.duplicateRectangle(shapeId)
  }

  /**
   * Bring rectangle to front
   */
  private async executeBringToFront(params: BringToFrontParams, createdRectangleId?: string): Promise<void> {
    // Use provided shapeId, or createdRectangleId from multi-step, or fall back to selected rectangle
    const shapeId = createdRectangleId || params.shapeId || this.context.primarySelectionId

    // Validate shapeId exists
    if (!shapeId) {
      throw new Error('No rectangle selected to bring to front')
    }

    // Only validate existence if not using createdRectangleId (to avoid race condition)
    if (!createdRectangleId && !this.rectangleExists(shapeId)) {
      throw new Error(`Rectangle ${shapeId} not found or was deleted`)
    }

    await this.context.bringToFront(shapeId)
  }

  /**
   * Send rectangle to back
   */
  private async executeSendToBack(params: SendToBackParams, createdRectangleId?: string): Promise<void> {
    // Use provided shapeId, or createdRectangleId from multi-step, or fall back to selected rectangle
    const shapeId = createdRectangleId || params.shapeId || this.context.primarySelectionId

    // Validate shapeId exists
    if (!shapeId) {
      throw new Error('No rectangle selected to send to back')
    }

    // Only validate existence if not using createdRectangleId (to avoid race condition)
    if (!createdRectangleId && !this.rectangleExists(shapeId)) {
      throw new Error(`Rectangle ${shapeId} not found or was deleted`)
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

    // Validate color
    if (!VALID_AI_COLORS.includes(color)) {
      throw new Error(`Invalid color: ${color}. Must be one of: ${VALID_AI_COLORS.join(', ')}`)
    }

    await this.context.changeSelectedShapesColor(color as typeof VALID_AI_COLORS[number])
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
}

