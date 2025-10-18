/**
 * Utility functions for handling DOM events in Konva components
 */

import type { KonvaEventObject } from 'konva/lib/Node'

/**
 * Aggressively stops event propagation and prevents default behavior
 * Used throughout Konva components to prevent unwanted event bubbling
 */
export const stopEventPropagation = (e: KonvaEventObject<Event>): void => {
  e.cancelBubble = true
  e.evt?.stopPropagation()
  e.evt?.preventDefault()
  e.evt?.stopImmediatePropagation?.()
}

/**
 * Higher-order function that wraps an event handler with event stopping logic
 * Reduces boilerplate in component event handlers
 */
export const withEventStop = <T extends unknown[]>(
  handler: (...args: T) => void
) => {
  return (e: KonvaEventObject<Event>, ...args: T) => {
    stopEventPropagation(e)
    handler(...args)
  }
}

/**
 * Sets cursor style on the Konva stage container
 * Safely handles cases where stage or container might not exist
 */
export const setStageCursor = (e: KonvaEventObject<Event>, cursor: string): void => {
  const container = e.target.getStage()?.container()
  if (container) {
    container.style.cursor = cursor
  }
}

/**
 * Resets cursor to default on the Konva stage container
 */
export const resetStageCursor = (e: KonvaEventObject<Event>): void => {
  setStageCursor(e, 'default')
}
