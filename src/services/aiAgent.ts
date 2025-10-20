/**
 * AI Agent Service
 * Handles calling Cloud Function and executing AI-generated commands
 * 
 * FLOW:
 * 1. Capture immutable snapshot (canvas state, viewport, selection)
 * 2. Lock selection to prevent race conditions
 * 3. Call Cloud Function with snapshot
 * 4. Execute commands sequentially
 * 5. Handle auto-selection for single rectangle creation
 * 6. Unlock selection
 * 7. Report errors with retry classification
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../config/firebase'
import type {
  SelectedShape,
  ProcessAICommandRequest,
  ProcessAICommandResponse,
  AICommand,
  CommandSnapshot,
  CreateRectangleParams
} from '../shared/types'
import { CanvasCommandExecutor, type CanvasContextMethods } from './canvasCommandExecutor'
import { mapAIError, formatPartialSuccessMessage, type AIError } from '../utils/aiErrors'

export interface AIAgentResult {
  success: boolean
  message?: string
  error?: AIError
}

export class AIAgent {
  private executor: CanvasCommandExecutor
  private context: CanvasContextMethods

  constructor(context: CanvasContextMethods) {
    this.context = context
    this.executor = new CanvasCommandExecutor(context)
  }

  /**
   * Process AI command
   * Main entry point for executing AI commands
   */
  async processCommand(userMessage: string): Promise<AIAgentResult> {
    // Capture immutable snapshot at submission time
    const snapshot = this.captureSnapshot()

    // Validate snapshot
    if (!snapshot.viewportInfo) {
      return {
        success: false,
        error: {
          message: 'Canvas not ready. Please try again.',
          retryable: true
        }
      }
    }

    // Lock selection to prevent user changes during processing
    this.context.setSelectionLocked(true)

    try {
      // Call Cloud Function
      const response = await this.callCloudFunction(userMessage, snapshot)

      // Execute commands
      const result = await this.executeCommands(response.commands)

      // Return with optional AI message
      return {
        success: true,
        message: response.message || result.message
      }
    } catch (error) {
      console.error('AI command error:', error)
      const aiError = mapAIError(error)
      return {
        success: false,
        error: aiError
      }
    } finally {
      // Always unlock selection
      this.context.setSelectionLocked(false)
    }
  }

  /**
   * Capture immutable snapshot of canvas state at command submission
   */
  private captureSnapshot(): CommandSnapshot {
    const viewportInfo = this.executor.getViewportInfo()
    return {
      canvasState: this.executor.getCanvasState(),
      viewportInfo: viewportInfo || undefined,
      selectedShapeId: this.context.primarySelectionId,  // CHANGED: Use primary selection for AI
      selectedShapesCount: this.context.selectedShapes?.size || 0  // Total number of selected shapes
    }
  }

  /**
   * Call Cloud Function with snapshot
   */
  private async callCloudFunction(
    userMessage: string,
    snapshot: CommandSnapshot
  ): Promise<ProcessAICommandResponse> {
    const functions = getFunctions(app)
    const processAICommand = httpsCallable<ProcessAICommandRequest, ProcessAICommandResponse>(
      functions,
      'processAICommand'
    )

    // Build request with snapshot
    const request: ProcessAICommandRequest = {
      userMessage,
      canvasState: snapshot.canvasState,
      viewportInfo: snapshot.viewportInfo!,
      selectedShape: this.getSelectedShapeFromSnapshot(snapshot),
      selectedShapesCount: snapshot.selectedShapesCount  // Include multi-select count
    }

    const result = await processAICommand(request)
    return result.data
  }

  /**
   * Get selected shape info from snapshot
   * Searches across all shape types (rectangles, circles, lines, text)
   */
  private getSelectedShapeFromSnapshot(snapshot: CommandSnapshot): SelectedShape | null {
    if (!snapshot.selectedShapeId) return null

    // Search rectangles
    const rect = snapshot.canvasState.rectangles.find(
      r => r.id === snapshot.selectedShapeId
    )
    if (rect) {
      return {
        id: rect.id,
        type: 'rectangle',
        color: rect.color,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      }
    }

    // Search circles
    const circle = snapshot.canvasState.circles?.find(
      c => c.id === snapshot.selectedShapeId
    )
    if (circle) {
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

    // Search lines
    const line = snapshot.canvasState.lines?.find(
      l => l.id === snapshot.selectedShapeId
    )
    if (line) {
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

    // Search text
    const text = snapshot.canvasState.texts?.find(
      t => t.id === snapshot.selectedShapeId
    )
    if (text) {
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

    return null
  }

  /**
   * Execute commands sequentially with auto-selection logic
   */
  private async executeCommands(
    commands: AICommand[]
  ): Promise<{ message?: string }> {
    if (commands.length === 0) {
      return { message: 'No commands to execute' }
    }

    console.log('🤖 AI Commands received:', JSON.stringify(commands, null, 2))

    let createdShapeId: string | undefined

    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      
      console.log(`🔧 Executing command ${i + 1}/${commands.length}:`, command.tool, command.parameters)

      try {
        // Special handling for first shape creation command (any shape type)
        if (i === 0 && this.isShapeCreationCommand(command.tool)) {
          createdShapeId = await this.executeShapeCreationCommand(command)
        } else {
          // For subsequent commands, use createdShapeId if available
          await this.executor.executeCommand(command, createdShapeId)
        }
      } catch (error) {
        // Partial failure - some commands succeeded
        const aiError = mapAIError(error)
        const partialMessage = formatPartialSuccessMessage(
          commands.length,
          i + 1,
          aiError
        )
        
        return {
          message: partialMessage
        }
      }
    }

    return {}
  }

  /**
   * Check if a command is a shape creation command (single shape only, not batch)
   */
  private isShapeCreationCommand(tool: string): boolean {
    return tool === 'createRectangle' || tool === 'createCircle' || tool === 'createLine' || tool === 'createText'
  }

  /**
   * Execute shape creation command and return the created shape ID
   * Supports all shape types: rectangle, circle, line, text
   */
  private async executeShapeCreationCommand(command: AICommand): Promise<string | undefined> {
    switch (command.tool) {
      case 'createRectangle': {
        const rect = await this.executor['executeCreateRectangle'](command.parameters as CreateRectangleParams)
        if (!rect) throw new Error('Failed to create rectangle')
        return rect.id
      }
      case 'createCircle': {
        const circle = await this.executor['executeCreateCircle'](command.parameters as { x?: number; y?: number; radius?: number; color?: string })
        if (!circle) throw new Error('Failed to create circle')
        return circle.id
      }
      case 'createLine': {
        const line = await this.executor['executeCreateLine'](command.parameters as { x: number; y: number; endX: number; endY: number; color?: string })
        if (!line) throw new Error('Failed to create line')
        return line.id
      }
      case 'createText': {
        const text = await this.executor['executeCreateText'](command.parameters as { x?: number; y?: number; text: string; fontSize?: number; color?: string })
        if (!text) throw new Error('Failed to create text')
        return text.id
      }
      default:
        throw new Error(`Unknown shape creation command: ${command.tool}`)
    }
  }
}

