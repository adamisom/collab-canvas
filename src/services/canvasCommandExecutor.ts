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
  CreateMultipleRectanglesParams
} from '../types/ai'
import { 
  DEFAULT_RECT, 
  RECTANGLE_CONSTRAINTS, 
  CANVAS_BOUNDS,
  VALID_AI_COLORS,
  AI_CONSTANTS
} from '../utils/constants'
import type { Rectangle } from './canvasService'

/**
 * CanvasContext methods interface (for dependency injection)
 */
export interface CanvasContextMethods {
  rectangles: Rectangle[]
  selectedRectangleId: string | null
  getViewportInfo: () => ViewportInfo | null
  createRectangle: (x: number, y: number) => Promise<Rectangle | null>
  updateRectangle: (rectangleId: string, updates: Partial<Rectangle>) => Promise<void>
  resizeRectangle: (rectangleId: string, width: number, height: number, x?: number, y?: number) => Promise<void>
  deleteRectangle: (rectangleId: string) => Promise<void>
  changeRectangleColor: (rectangleId: string, color: string) => Promise<void>
  selectRectangle: (rectangleId: string | null) => Promise<void>
  setSelectionLocked: (locked: boolean) => void
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
    const selectedId = this.context.selectedRectangleId
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

      case 'createMultipleRectangles':
        await this.executeCreateMultipleRectangles(parameters as CreateMultipleRectanglesParams)
        break

      default:
        throw new Error(`Unknown tool: ${tool}`)
    }
  }

  /**
   * Create a single rectangle
   */
  private async executeCreateRectangle(params: CreateRectangleParams): Promise<Rectangle | null> {
    const x = this.clampNumber(params.x, CANVAS_BOUNDS.MIN_X, CANVAS_BOUNDS.MAX_X)
    const y = this.clampNumber(params.y, CANVAS_BOUNDS.MIN_Y, CANVAS_BOUNDS.MAX_Y)
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

    // Validate color
    if (!this.isValidColor(params.color)) {
      throw new Error(`Invalid color: ${params.color}. Must be one of: ${VALID_AI_COLORS.join(', ')}`)
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
      color: params.color
    })

    return rect
  }

  /**
   * Change color of existing rectangle
   */
  private async executeChangeColor(params: ChangeColorParams, createdRectangleId?: string): Promise<void> {
    const shapeId = createdRectangleId || params.shapeId

    // Validate rectangle exists
    if (!this.rectangleExists(shapeId)) {
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
    const shapeId = createdRectangleId || params.shapeId

    // Validate rectangle exists
    if (!this.rectangleExists(shapeId)) {
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
    const shapeId = createdRectangleId || params.shapeId

    // Validate rectangle exists
    if (!this.rectangleExists(shapeId)) {
      throw new Error(`Rectangle ${shapeId} not found or was deleted`)
    }

    const width = this.clampNumber(
      params.width,
      RECTANGLE_CONSTRAINTS.MIN_WIDTH,
      RECTANGLE_CONSTRAINTS.MAX_WIDTH
    )
    const height = this.clampNumber(
      params.height,
      RECTANGLE_CONSTRAINTS.MIN_HEIGHT,
      RECTANGLE_CONSTRAINTS.MAX_HEIGHT
    )

    await this.context.resizeRectangle(shapeId, width, height)
  }

  /**
   * Delete existing rectangle
   */
  private async executeDeleteRectangle(params: DeleteRectangleParams, createdRectangleId?: string): Promise<void> {
    const shapeId = createdRectangleId || params.shapeId

    // Validate rectangle exists
    if (!this.rectangleExists(shapeId)) {
      throw new Error(`Rectangle ${shapeId} not found or was deleted`)
    }

    await this.context.deleteRectangle(shapeId)
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
    const positions = this.calculateBatchPositions(
      count,
      layout,
      startX,
      startY,
      DEFAULT_RECT.WIDTH,
      DEFAULT_RECT.HEIGHT,
      offsetPixels
    )

    // Create all rectangles
    for (const pos of positions) {
      const rect = await this.context.createRectangle(pos.x, pos.y)
      if (rect) {
        await this.context.updateRectangle(rect.id, { color: params.color })
      }
    }
  }

  /**
   * Calculate positions for batch rectangle creation
   */
  private calculateBatchPositions(
    count: number,
    layout: string,
    startX: number,
    startY: number,
    width: number,
    height: number,
    offset: number
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = []

    if (layout === 'row') {
      // Horizontal row
      for (let i = 0; i < count; i++) {
        positions.push({
          x: startX + i * (width + offset),
          y: startY
        })
      }
    } else if (layout === 'column') {
      // Vertical column
      for (let i = 0; i < count; i++) {
        positions.push({
          x: startX,
          y: startY + i * (height + offset)
        })
      }
    } else {
      // Grid layout
      const cols = Math.ceil(Math.sqrt(count))
      for (let i = 0; i < count; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        positions.push({
          x: startX + col * (width + offset),
          y: startY + row * (height + offset)
        })
      }
    }

    return positions
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
}

