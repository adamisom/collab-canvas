# Phase 3F: Final Features

**Focus**: AI Agent Enhancements and Comments/Annotations  
**PRs**: 15-16  
**Work Level**: High  
**Dependencies**: All previous phases complete (3A-3E)

> **⚠️ Before Implementation:** Review this plan and ask questions before proceeding. Consider whether any plans need to change first.

---

## Phase Overview

Phase 3F adds the final polish features that elevate CollabCanvas from a solid collaborative tool to a production-ready, feature-rich application. These features are advanced and require the full foundation built in Phases 3A-3E.

**Features added:**
- **PR #15**: AI Agent Enhancements - Advanced AI capabilities
- **PR #16**: Comments & Annotations - Collaborative feedback system

**Why these features?**
- AI enhancements make the agent more powerful and user-friendly
- Comments enable asynchronous collaboration
- Both are common in professional tools
- Final polish for production release

---

## PR #15: AI Agent Enhancements

**Branch**: `feature/ai-enhancements`  
**Work Level**: Medium-High  
**Breaking Changes**: None

### Why This PR?
- Make AI agent more powerful and intelligent
- Improve user experience with AI
- Add features users expect from AI assistants
- Reduce friction in AI interactions
- Prepare for advanced use cases

### What This PR Delivers

**Enhanced AI Capabilities:**
1. **Undo/Redo AI Commands** - Rollback AI actions
2. **AI Command History** - Review past AI commands
3. **Multi-Step Command Preview** - Show what AI will do before executing
4. **AI Suggestions** - Proactive suggestions based on context
5. **Voice Input** (BONUS) - Speak commands to AI

**Improved UX:**
- AI typing indicator (show when AI is thinking)
- Better error messages with suggestions
- Command confirmation for destructive operations
- AI command shortcuts (templates)

**Advanced Features:**
- Batch operations (e.g., "Create 10 circles in a grid")
- Conditional operations (e.g., "Change all red shapes to blue")
- Relative positioning (e.g., "Create a circle above each rectangle")

### Implementation Strategy

**Undo/Redo:**
- Track AI command history with snapshots
- Store before/after states
- Implement undo/redo stack
- Keyboard shortcuts: Cmd+Z (undo), Cmd+Shift+Z (redo)

**Command Preview:**
- Dry-run mode for AI commands
- Show preview overlay on canvas
- User can approve or reject
- Useful for complex operations

**AI Suggestions:**
- Context-aware suggestions based on canvas state
- Show in AI chat panel
- Click to execute suggestion
- Examples:
  - "No shapes selected. Try creating one!"
  - "These shapes look misaligned. Want to align them?"
  - "Multiple similar shapes. Want to distribute them evenly?"

**Voice Input:**
- Use Web Speech API
- Microphone button in AI chat
- Convert speech to text
- Send to AI agent

### Files to Create

#### `/src/contexts/AIHistoryContext.tsx`
```typescript
import React, { createContext, useContext, useState, useCallback } from 'react'

interface AICommand {
  id: string
  timestamp: number
  userInput: string
  aiResponse: string
  canvasStateBefore: any  // Snapshot before command
  canvasStateAfter: any   // Snapshot after command
  success: boolean
}

interface AIHistoryContextType {
  commandHistory: AICommand[]
  addCommand: (command: AICommand) => void
  undoLastCommand: () => Promise<void>
  redoLastUndo: () => Promise<void>
  canUndo: boolean
  canRedo: boolean
}

const AIHistoryContext = createContext<AIHistoryContextType | undefined>(undefined)

export const AIHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [commandHistory, setCommandHistory] = useState<AICommand[]>([])
  const [undoStack, setUndoStack] = useState<AICommand[]>([])
  const [redoStack, setRedoStack] = useState<AICommand[]>([])

  const addCommand = useCallback((command: AICommand) => {
    setCommandHistory(prev => [...prev, command])
    setUndoStack(prev => [...prev, command])
    setRedoStack([])  // Clear redo stack on new command
  }, [])

  const undoLastCommand = useCallback(async () => {
    if (undoStack.length === 0) return

    const lastCommand = undoStack[undoStack.length - 1]
    
    // Restore canvas state to before command
    await restoreCanvasState(lastCommand.canvasStateBefore)
    
    setUndoStack(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, lastCommand])
  }, [undoStack])

  const redoLastUndo = useCallback(async () => {
    if (redoStack.length === 0) return

    const lastUndo = redoStack[redoStack.length - 1]
    
    // Restore canvas state to after command
    await restoreCanvasState(lastUndo.canvasStateAfter)
    
    setRedoStack(prev => prev.slice(0, -1))
    setUndoStack(prev => [...prev, lastUndo])
  }, [redoStack])

  return (
    <AIHistoryContext.Provider value={{
      commandHistory,
      addCommand,
      undoLastCommand,
      redoLastUndo,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0
    }}>
      {children}
    </AIHistoryContext.Provider>
  )
}

export const useAIHistory = () => {
  const context = useContext(AIHistoryContext)
  if (!context) {
    throw new Error('useAIHistory must be used within AIHistoryProvider')
  }
  return context
}

// Helper to restore canvas state
const restoreCanvasState = async (state: any) => {
  // Implementation depends on how state is structured
  // Would need to clear current canvas and recreate all shapes
}
```

#### `/src/components/ai/AICommandHistory.tsx`
```typescript
import React, { useState } from 'react'
import { useAIHistory } from '../../contexts/AIHistoryContext'
import './AICommandHistory.css'

const AICommandHistory: React.FC = () => {
  const { commandHistory, undoLastCommand, redoLastUndo, canUndo, canRedo } = useAIHistory()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="ai-command-history">
      <div className="history-header">
        <h3>AI Command History</h3>
        <button onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className="history-actions">
        <button
          onClick={undoLastCommand}
          disabled={!canUndo}
          title="Undo last AI command (Cmd+Z)"
        >
          ↶ Undo
        </button>
        <button
          onClick={redoLastUndo}
          disabled={!canRedo}
          title="Redo last undone command (Cmd+Shift+Z)"
        >
          ↷ Redo
        </button>
      </div>

      {isExpanded && (
        <div className="history-list">
          {commandHistory.length === 0 ? (
            <div className="empty-state">
              No AI commands yet. Try asking the AI to create a shape!
            </div>
          ) : (
            commandHistory.slice().reverse().map((command) => (
              <div
                key={command.id}
                className={`history-item ${command.success ? 'success' : 'error'}`}
              >
                <div className="command-timestamp">
                  {new Date(command.timestamp).toLocaleTimeString()}
                </div>
                <div className="command-user-input">
                  You: {command.userInput}
                </div>
                <div className="command-ai-response">
                  AI: {command.aiResponse}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default AICommandHistory
```

#### `/src/components/ai/AISuggestions.tsx`
```typescript
import React, { useEffect, useState } from 'react'
import { useCanvas } from '../../contexts/CanvasContext'
import './AISuggestions.css'

interface Suggestion {
  id: string
  text: string
  command: string
  icon: string
}

const AISuggestions: React.FC = () => {
  const {
    rectangles,
    circles,
    lines,
    texts,
    selectedRectangleIds,
    selectedCircleIds,
    selectedLineIds,
    selectedTextIds
  } = useCanvas()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  useEffect(() => {
    const newSuggestions: Suggestion[] = []

    // No shapes on canvas
    const totalShapes = rectangles.length + circles.length + lines.length + texts.length
    if (totalShapes === 0) {
      newSuggestions.push({
        id: 'create-first',
        text: 'Get started by creating your first shape',
        command: 'Create a blue rectangle in the center',
        icon: '🎨'
      })
    }

    // Multiple shapes, none selected
    const totalSelected = 
      selectedRectangleIds.size + 
      selectedCircleIds.size + 
      selectedLineIds.size + 
      selectedTextIds.size

    if (totalShapes > 3 && totalSelected === 0) {
      newSuggestions.push({
        id: 'select-all',
        text: 'Try selecting all shapes',
        command: 'Select all shapes',
        icon: '☑️'
      })
    }

    // Multiple selected
    if (totalSelected > 2) {
      newSuggestions.push({
        id: 'align',
        text: `Align ${totalSelected} selected shapes`,
        command: 'Align them to the left',
        icon: '⬅️'
      })
      
      if (totalSelected >= 3) {
        newSuggestions.push({
          id: 'distribute',
          text: `Distribute ${totalSelected} shapes evenly`,
          command: 'Distribute them evenly horizontally',
          icon: '↔️'
        })
      }
    }

    // Many shapes of same type
    if (rectangles.length > 5) {
      newSuggestions.push({
        id: 'color-rectangles',
        text: `Change color of all ${rectangles.length} rectangles`,
        command: 'Change all rectangles to blue',
        icon: '🎨'
      })
    }

    setSuggestions(newSuggestions.slice(0, 3))  // Show max 3 suggestions
  }, [
    rectangles,
    circles,
    lines,
    texts,
    selectedRectangleIds,
    selectedCircleIds,
    selectedLineIds,
    selectedTextIds
  ])

  if (suggestions.length === 0) return null

  return (
    <div className="ai-suggestions">
      <h4>Suggestions</h4>
      <div className="suggestions-list">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            className="suggestion-button"
            onClick={() => {
              // Send command to AI
              const aiInput = document.querySelector('.ai-input') as HTMLInputElement
              if (aiInput) {
                aiInput.value = suggestion.command
                // Trigger send
              }
            }}
          >
            <span className="suggestion-icon">{suggestion.icon}</span>
            <div className="suggestion-content">
              <div className="suggestion-text">{suggestion.text}</div>
              <div className="suggestion-command">"{suggestion.command}"</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default AISuggestions
```

#### `/src/components/ai/VoiceInput.tsx`
```typescript
import React, { useState, useCallback } from 'react'
import './VoiceInput.css'

interface VoiceInputProps {
  onTranscript: (text: string) => void
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const startListening = useCallback(() => {
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event: any) => {
      const current = event.resultIndex
      const transcriptText = event.results[current][0].transcript
      setTranscript(transcriptText)

      if (event.results[current].isFinal) {
        onTranscript(transcriptText)
      }
    }

    recognition.onerror = (event: any) => {
      setError(`Error: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }, [onTranscript])

  return (
    <div className="voice-input">
      <button
        className={`voice-button ${isListening ? 'listening' : ''}`}
        onClick={startListening}
        disabled={isListening}
        title="Voice input"
      >
        {isListening ? '🎤 Listening...' : '🎤'}
      </button>

      {transcript && (
        <div className="transcript">
          {transcript}
        </div>
      )}

      {error && (
        <div className="voice-error">
          {error}
        </div>
      )}
    </div>
  )
}

export default VoiceInput
```

### Files to Update

#### 1. `/src/components/ai/AIChat.tsx`
Add new features to AI chat:

```typescript
import AICommandHistory from './AICommandHistory'
import AISuggestions from './AISuggestions'
import VoiceInput from './VoiceInput'
import { useAIHistory } from '../../contexts/AIHistoryContext'

const AIChat: React.FC = () => {
  const { addCommand } = useAIHistory()
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = async (message: string) => {
    // Capture state before
    const stateBefore = captureCanvasSnapshot()
    
    setIsTyping(true)
    
    try {
      const response = await sendToAI(message)
      
      // Capture state after
      const stateAfter = captureCanvasSnapshot()
      
      // Add to history
      addCommand({
        id: Date.now().toString(),
        timestamp: Date.now(),
        userInput: message,
        aiResponse: response.message,
        canvasStateBefore: stateBefore,
        canvasStateAfter: stateAfter,
        success: true
      })
    } catch (error) {
      // Handle error
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="ai-chat">
      <AICommandHistory />
      
      <AISuggestions />
      
      <div className="chat-messages">
        {/* Messages */}
        
        {isTyping && (
          <div className="ai-typing">
            <span>AI is thinking</span>
            <span className="typing-dots">...</span>
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          className="ai-input"
          placeholder="Ask AI to create, modify, or arrange shapes..."
        />
        <VoiceInput onTranscript={(text) => handleSendMessage(text)} />
        <button onClick={() => handleSendMessage(inputValue)}>Send</button>
      </div>
    </div>
  )
}
```

#### 2. `/functions/src/index.ts`
Add advanced AI capabilities:

```typescript
// Add batch operations support
export const executeBatchCommands = tool({
  description: 'Execute multiple commands in sequence',
  parameters: z.object({
    commands: z.array(z.object({
      operation: z.string(),
      parameters: z.any()
    }))
  }),
  execute: async ({ commands }) => {
    // Execute commands in sequence
    return { success: true, count: commands.length }
  }
})

// Add conditional operations
export const conditionalOperation = tool({
  description: 'Perform operation on shapes matching condition',
  parameters: z.object({
    condition: z.object({
      property: z.enum(['color', 'type', 'size']),
      value: z.string()
    }),
    operation: z.string(),
    parameters: z.any()
  }),
  execute: async () => ({ success: true })
})
```

#### 3. `/functions/src/utils/systemPrompt.ts`
Enhance system prompt:

```typescript
// Add batch operations to system prompt
ADVANCED CAPABILITIES:
- Batch operations: Create multiple shapes at once (e.g., "Create 10 blue circles in a grid")
- Conditional operations: Apply changes to shapes matching criteria (e.g., "Change all red shapes to blue")
- Relative positioning: Position shapes relative to others (e.g., "Create a circle above each rectangle")

BEST PRACTICES:
- For batch operations, use loops and calculate positions systematically
- For conditional operations, filter shapes first, then apply operation
- Always provide clear feedback about what was done
- Suggest alternative approaches when user request is ambiguous
```

#### 4. Add keyboard shortcuts for undo/redo
In `/src/components/canvas/Canvas.tsx`:

```typescript
const { undoLastCommand, redoLastUndo, canUndo, canRedo } = useAIHistory()

const handleKeyDown = useCallback((e: KeyboardEvent) => {
  // ... existing shortcuts
  
  // Undo AI command: Cmd+Z (when AI history has items)
  if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
    if (canUndo) {
      e.preventDefault()
      undoLastCommand()
      return
    }
  }
  
  // Redo AI command: Cmd+Shift+Z
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
    if (canRedo) {
      e.preventDefault()
      redoLastUndo()
      return
    }
  }
}, [undoLastCommand, redoLastUndo, canUndo, canRedo])
```

### Testing Checklist

**Manual Testing - Undo/Redo:**
- [ ] Can undo AI commands with Cmd+Z
- [ ] Can redo undone commands with Cmd+Shift+Z
- [ ] Undo restores canvas to previous state
- [ ] Undo/redo stack managed correctly
- [ ] Cannot undo when stack is empty
- [ ] New command clears redo stack

**Manual Testing - Command History:**
- [ ] Command history shows all AI commands
- [ ] History displays timestamps correctly
- [ ] Success/error states shown clearly
- [ ] Can expand/collapse history

**Manual Testing - AI Suggestions:**
- [ ] Suggestions appear based on canvas state
- [ ] Clicking suggestion fills AI input
- [ ] Suggestions are relevant and helpful
- [ ] Max 3 suggestions shown at once

**Manual Testing - Voice Input (BONUS):**
- [ ] Microphone button works
- [ ] Speech recognized correctly
- [ ] Transcript shown while speaking
- [ ] Final transcript sent to AI
- [ ] Error handling works (no mic permission, etc.)

**Manual Testing - Advanced AI:**
- [ ] Batch operations work ("Create 10 circles")
- [ ] Conditional operations work ("Change all red to blue")
- [ ] Relative positioning works
- [ ] AI typing indicator shows
- [ ] Better error messages displayed

**AI Testing:**
- [ ] AI can create multiple shapes in patterns
- [ ] AI can perform conditional operations
- [ ] AI gives helpful suggestions
- [ ] All enhancements sync to all users

### Success Criteria
- ✅ Undo/redo AI commands works perfectly
- ✅ Command history is comprehensive
- ✅ AI suggestions are helpful
- ✅ Voice input works (if implemented)
- ✅ Advanced AI features work
- ✅ Better UX throughout
- ✅ Real-time sync verified

---

## PR #16: Comments & Annotations

**Branch**: `feature/comments-annotations`  
**Work Level**: High  
**Breaking Changes**: None

### Why This PR?
- Essential for asynchronous collaboration
- Enable feedback and discussion
- Common in all professional design tools
- Completes the collaboration story
- Production-ready feature set

### What This PR Delivers

**Comments System:**
1. **Shape Comments** - Attach comments to specific shapes
2. **Canvas Comments** - Place comments anywhere on canvas
3. **Comment Threads** - Reply to comments
4. **@Mentions** - Notify specific users
5. **Comment Resolution** - Mark comments as resolved

**Annotations:**
1. **Sticky Notes** - Add notes to canvas
2. **Arrows/Callouts** - Point to specific areas
3. **Highlight Shapes** - Temporary visual emphasis

**UI:**
- Comment indicator on shapes (count badge)
- Comment panel (sidebar)
- Inline comment bubbles on canvas
- Notification system for mentions

### Implementation Strategy

**Data Model:**
```typescript
interface Comment {
  id: string
  canvasId: string
  shapeId: string | null  // null for canvas comments
  x: number  // position for canvas comments
  y: number
  text: string
  authorId: string
  authorName: string
  authorAvatar: string
  createdAt: number
  updatedAt: number
  resolved: boolean
  parentId: string | null  // for replies
  mentions: string[]  // user IDs
}
```

**Firebase Structure:**
```
/comments
  /{commentId}
    - id
    - canvasId
    - shapeId
    - x, y
    - text
    - authorId
    - createdAt
    - resolved
    - parentId
```

**Real-Time Sync:**
- Comments sync in real-time
- Notifications for @mentions
- Visual indicators for unread comments

### Files to Create

#### `/src/components/comments/CommentBubble.tsx`
```typescript
import React, { useState } from 'react'
import { Comment } from '../../types/comment'
import './CommentBubble.css'

interface CommentBubbleProps {
  comment: Comment
  onReply: (text: string) => void
  onResolve: () => void
  onDelete: () => void
  isOwner: boolean
}

const CommentBubble: React.FC<CommentBubbleProps> = ({
  comment,
  onReply,
  onResolve,
  onDelete,
  isOwner
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [replyText, setReplyText] = useState('')

  return (
    <div className={`comment-bubble ${comment.resolved ? 'resolved' : ''}`}>
      <div className="comment-header" onClick={() => setIsExpanded(!isExpanded)}>
        <img src={comment.authorAvatar} alt={comment.authorName} className="avatar" />
        <div className="comment-info">
          <span className="author">{comment.authorName}</span>
          <span className="timestamp">
            {new Date(comment.createdAt).toLocaleString()}
          </span>
        </div>
        {comment.resolved && <span className="resolved-badge">✓ Resolved</span>}
      </div>

      {isExpanded && (
        <div className="comment-body">
          <p className="comment-text">{comment.text}</p>

          <div className="comment-actions">
            {!comment.resolved && (
              <button onClick={onResolve}>Resolve</button>
            )}
            {isOwner && (
              <button onClick={onDelete} className="danger">Delete</button>
            )}
          </div>

          <div className="reply-section">
            <input
              type="text"
              placeholder="Reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && replyText.trim()) {
                  onReply(replyText)
                  setReplyText('')
                }
              }}
            />
            <button
              onClick={() => {
                if (replyText.trim()) {
                  onReply(replyText)
                  setReplyText('')
                }
              }}
            >
              Reply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommentBubble
```

#### `/src/components/comments/CommentsPanel.tsx`
```typescript
import React, { useState, useEffect } from 'react'
import { useComments } from '../../contexts/CommentsContext'
import CommentBubble from './CommentBubble'
import './CommentsPanel.css'

const CommentsPanel: React.FC = () => {
  const {
    comments,
    addComment,
    replyToComment,
    resolveComment,
    deleteComment,
    unresolvedCount
  } = useComments()
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all')

  const filteredComments = comments.filter(comment => {
    if (filter === 'unresolved') return !comment.resolved
    if (filter === 'resolved') return comment.resolved
    return true
  })

  // Group comments by thread (parent comments with replies)
  const threads = filteredComments
    .filter(c => !c.parentId)
    .map(parent => ({
      parent,
      replies: filteredComments.filter(c => c.parentId === parent.id)
    }))

  return (
    <div className="comments-panel">
      <div className="panel-header">
        <h3>
          Comments
          {unresolvedCount > 0 && (
            <span className="unresolved-badge">{unresolvedCount}</span>
          )}
        </h3>
        
        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'unresolved' ? 'active' : ''}
            onClick={() => setFilter('unresolved')}
          >
            Unresolved
          </button>
          <button
            className={filter === 'resolved' ? 'active' : ''}
            onClick={() => setFilter('resolved')}
          >
            Resolved
          </button>
        </div>
      </div>

      <div className="comments-list">
        {threads.length === 0 ? (
          <div className="empty-state">
            No comments yet. Click on a shape to add a comment!
          </div>
        ) : (
          threads.map(thread => (
            <div key={thread.parent.id} className="comment-thread">
              <CommentBubble
                comment={thread.parent}
                onReply={(text) => replyToComment(thread.parent.id, text)}
                onResolve={() => resolveComment(thread.parent.id)}
                onDelete={() => deleteComment(thread.parent.id)}
                isOwner={thread.parent.authorId === currentUserId}
              />
              
              {thread.replies.map(reply => (
                <div key={reply.id} className="reply-comment">
                  <CommentBubble
                    comment={reply}
                    onReply={(text) => replyToComment(reply.id, text)}
                    onResolve={() => resolveComment(reply.id)}
                    onDelete={() => deleteComment(reply.id)}
                    isOwner={reply.authorId === currentUserId}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CommentsPanel
```

#### `/src/contexts/CommentsContext.tsx`
```typescript
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import * as commentsService from '../services/commentsService'

interface Comment {
  id: string
  canvasId: string
  shapeId: string | null
  x: number
  y: number
  text: string
  authorId: string
  authorName: string
  authorAvatar: string
  createdAt: number
  updatedAt: number
  resolved: boolean
  parentId: string | null
  mentions: string[]
}

interface CommentsContextType {
  comments: Comment[]
  unresolvedCount: number
  addComment: (shapeId: string | null, x: number, y: number, text: string) => Promise<void>
  replyToComment: (parentId: string, text: string) => Promise<void>
  resolveComment: (commentId: string) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
  getCommentsForShape: (shapeId: string) => Comment[]
}

const CommentsContext = createContext<CommentsContextType | undefined>(undefined)

export const CommentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])

  // Listen to comments collection
  useEffect(() => {
    if (!user) {
      setComments([])
      return
    }

    const unsubscribe = commentsService.onCommentsChange((newComments) => {
      setComments(newComments)
    })

    return unsubscribe
  }, [user])

  const addComment = useCallback(async (
    shapeId: string | null,
    x: number,
    y: number,
    text: string
  ) => {
    if (!user) return

    // Extract mentions from text (@username)
    const mentions = extractMentions(text)

    await commentsService.createComment({
      canvasId: 'default',  // In multi-canvas app, use actual canvas ID
      shapeId,
      x,
      y,
      text,
      authorId: user.uid,
      authorName: user.displayName || 'User',
      authorAvatar: user.photoURL || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolved: false,
      parentId: null,
      mentions
    })

    // Send notifications for mentions
    if (mentions.length > 0) {
      await commentsService.sendMentionNotifications(mentions, text)
    }
  }, [user])

  const replyToComment = useCallback(async (parentId: string, text: string) => {
    if (!user) return

    const parent = comments.find(c => c.id === parentId)
    if (!parent) return

    const mentions = extractMentions(text)

    await commentsService.createComment({
      canvasId: parent.canvasId,
      shapeId: parent.shapeId,
      x: parent.x,
      y: parent.y,
      text,
      authorId: user.uid,
      authorName: user.displayName || 'User',
      authorAvatar: user.photoURL || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolved: false,
      parentId,
      mentions
    })

    if (mentions.length > 0) {
      await commentsService.sendMentionNotifications(mentions, text)
    }
  }, [user, comments])

  const resolveComment = useCallback(async (commentId: string) => {
    await commentsService.updateComment(commentId, {
      resolved: true,
      updatedAt: Date.now()
    })
  }, [])

  const deleteComment = useCallback(async (commentId: string) => {
    await commentsService.deleteComment(commentId)
  }, [])

  const getCommentsForShape = useCallback((shapeId: string) => {
    return comments.filter(c => c.shapeId === shapeId && !c.parentId)
  }, [comments])

  const unresolvedCount = comments.filter(c => !c.resolved && !c.parentId).length

  return (
    <CommentsContext.Provider value={{
      comments,
      unresolvedCount,
      addComment,
      replyToComment,
      resolveComment,
      deleteComment,
      getCommentsForShape
    }}>
      {children}
    </CommentsContext.Provider>
  )
}

export const useComments = () => {
  const context = useContext(CommentsContext)
  if (!context) {
    throw new Error('useComments must be used within CommentsProvider')
  }
  return context
}

// Helper to extract @mentions from text
const extractMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g
  const matches = text.matchAll(mentionRegex)
  return Array.from(matches, m => m[1])
}
```

#### `/src/services/commentsService.ts`
```typescript
import { dbRef, dbPush, dbSet, dbUpdate, dbRemove, dbOnValue, dbGet } from './firebaseService'
import type { Comment } from '../contexts/CommentsContext'

export const createComment = async (comment: Omit<Comment, 'id'>): Promise<Comment | null> => {
  try {
    const commentsRef = dbRef('comments')
    const newCommentRef = dbPush(commentsRef)

    const fullComment: Comment = {
      ...comment,
      id: newCommentRef.key!
    }

    await dbSet(newCommentRef, fullComment)
    return fullComment
  } catch (error) {
    console.error('Error creating comment:', error)
    throw error
  }
}

export const updateComment = async (
  commentId: string,
  updates: Partial<Comment>
): Promise<void> => {
  const commentRef = dbRef(`comments/${commentId}`)
  await dbUpdate(commentRef, updates)
}

export const deleteComment = async (commentId: string): Promise<void> => {
  // Delete comment and all replies
  const commentsRef = dbRef('comments')
  const snapshot = await dbGet(commentsRef)
  
  if (snapshot.exists()) {
    const toDelete: string[] = [commentId]
    
    // Find all replies
    snapshot.forEach((child) => {
      const comment = child.val()
      if (comment.parentId === commentId) {
        toDelete.push(comment.id)
      }
    })
    
    // Delete all
    for (const id of toDelete) {
      await dbRemove(dbRef(`comments/${id}`))
    }
  }
}

export const onCommentsChange = (callback: (comments: Comment[]) => void): (() => void) => {
  const commentsRef = dbRef('comments')
  
  return dbOnValue(commentsRef, (snapshot) => {
    const comments: Comment[] = []
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        comments.push(child.val())
      })
    }
    callback(comments)
  })
}

export const sendMentionNotifications = async (
  mentionedUsernames: string[],
  commentText: string
): Promise<void> => {
  // Implementation depends on notification system
  // Could use Firebase Cloud Messaging, email, or in-app notifications
  console.log('Sending notifications to:', mentionedUsernames)
}
```

### Files to Update

#### 1. Update shape components to show comment indicators
In `/src/components/canvas/Rectangle.tsx` (and similar for other shapes):

```typescript
import { useComments } from '../../contexts/CommentsContext'

const { getCommentsForShape } = useComments()
const commentCount = getCommentsForShape(rectangle.id).length

// Render comment badge
{commentCount > 0 && (
  <Circle
    x={rectangle.width - 10}
    y={10}
    radius={8}
    fill="#3b82f6"
  />
  <Text
    x={rectangle.width - 13}
    y={5}
    text={commentCount.toString()}
    fontSize={10}
    fill="white"
  />
)}
```

#### 2. Add comment mode to Canvas
In `/src/components/canvas/Canvas.tsx`:

```typescript
const [commentMode, setCommentMode] = useState(false)
const { addComment } = useComments()

const handleCanvasClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
  if (commentMode) {
    const pos = e.target.getStage()!.getPointerPosition()
    if (pos) {
      const canvasPos = transformToCanvasCoords(pos)
      // Show comment input dialog
      showCommentDialog(null, canvasPos.x, canvasPos.y)
    }
  }
}, [commentMode, transformToCanvasCoords])

// Keyboard shortcut: C for comment mode
if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
  setCommentMode(!commentMode)
}
```

#### 3. Update database rules
In `/database.rules.json`:

```json
{
  "rules": {
    "comments": {
      ".read": "auth != null",
      "$commentId": {
        ".write": "auth != null && (!data.exists() || data.child('authorId').val() === auth.uid)",
        ".validate": "newData.hasChildren(['id', 'text', 'authorId', 'createdAt'])"
      }
    }
  }
}
```

### Testing Checklist

**Manual Testing - Comments:**
- [ ] Can add comment to shape
- [ ] Can add comment to canvas
- [ ] Can reply to comment
- [ ] Can resolve comment
- [ ] Can delete own comment
- [ ] Cannot delete others' comments
- [ ] Comment count badge shows on shapes
- [ ] Comments panel shows all comments
- [ ] Filter buttons work (all/unresolved/resolved)

**Manual Testing - Threads:**
- [ ] Replies grouped with parent comment
- [ ] Thread structure maintained
- [ ] Deleting parent deletes all replies
- [ ] Threading works correctly

**Manual Testing - @Mentions:**
- [ ] Can @mention users in comments
- [ ] Mentions extracted correctly
- [ ] Notifications sent (if implemented)

**Manual Testing - Real-Time Sync:**
- [ ] Comments sync across users in real-time
- [ ] New comments appear immediately
- [ ] Resolved comments update for all users
- [ ] Deleted comments disappear for all users

**AI Testing:**
- [ ] Comments system doesn't interfere with AI agent
- [ ] Can still use AI while comments panel open
- [ ] All features work together

### Success Criteria
- ✅ Comments system fully functional
- ✅ Threading works correctly
- ✅ Real-time sync verified
- ✅ UI is intuitive
- ✅ Performance acceptable
- ✅ No console errors

---

## Phase 3F Completion Checklist

Before declaring Phase 3 complete, verify:

### Functionality
- [ ] Both PRs merged and tested
- [ ] AI enhancements working (undo/redo, history, suggestions)
- [ ] Comments system working (comments, threads, resolution)
- [ ] Voice input working (if implemented)
- [ ] All features integrated smoothly

### Quality
- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Performance is excellent
- [ ] Real-time sync is reliable
- [ ] UI/UX is polished

### Documentation
- [ ] All features documented
- [ ] User guide updated
- [ ] Demo video includes new features

### Production Readiness
- [ ] Application is feature-complete
- [ ] Ready for production deployment
- [ ] Ready for submission/demo

---

## Phase 3 Complete! 🎉

**Congratulations!** With Phase 3F complete, CollabCanvas is now a production-ready, feature-rich collaborative canvas application with:

- ✅ Real-time collaboration
- ✅ AI agent with advanced capabilities
- ✅ Multiple shape types
- ✅ Professional design tools
- ✅ Authentication & security
- ✅ Comments & feedback system
- ✅ Comprehensive documentation
- ✅ Testing & quality assurance

## Final Steps

1. **Final Testing**: Run complete test suite
2. **Performance Audit**: Ensure everything is optimized
3. **Documentation Review**: Verify all docs are accurate
4. **Demo Preparation**: Practice demo walkthrough
5. **Deployment**: Deploy to production
6. **Launch**: Share with users!

---

**Project Status**: ✅ **COMPLETE**

CollabCanvas is ready for production use and submission. Great work!

