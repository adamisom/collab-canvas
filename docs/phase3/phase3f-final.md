# Phase 3F: Final Features & Documentation

**Focus**: Documentation, AI Agent Enhancements, and Comments  
**PRs**: 16-18  
**Work Level**: High  
**Dependencies**: All previous phases complete (3A-3E)

> **⚠️ Before Implementation:** Review this plan and ask questions before proceeding. Consider whether any plans need to change first. Also re-read the sibling file README.md to ensure broader context.

---

## Phase Overview

Phase 3F adds the final documentation and polish features that complete CollabCanvas as a production-ready, feature-rich application ready for submission. These features require the full foundation built in Phases 3A-3E.

**Features added:**
- **PR #16**: Documentation & Demo - User docs, dev log, demo video
- **PR #17**: AI Agent Enhancements - Advanced AI capabilities  
- **PR #18**: Comments & Annotations - Collaborative feedback system

**Why these features?**
- Documentation enables users and evaluators to understand the project
- AI enhancements make the agent more powerful and user-friendly
- Comments enable asynchronous collaboration
- All are common in professional tools
- Final polish for production release and submission

---

## PR #16: Documentation & Demo

**Branch**: `feature/documentation`  
**Work Level**: Medium  
**Breaking Changes**: None

### Why This PR?
- Enable users to understand and use the application
- Document development process for evaluation
- Create demo video for submission
- Essential for project completion and submission
- Shows professionalism and attention to detail

### What This PR Delivers

**User Documentation:**
- Updated README with all Phase 3 features
- Comprehensive user guide
- Keyboard shortcuts reference
- Troubleshooting section

**Developer Documentation:**
- Architecture documentation (updated from Phase 2)
- Testing guide
- Deployment guide

**AI Development Log:**
- Detailed log of all AI interactions during Phase 3
- Decisions made, problems solved
- AI assistance patterns
- Reflection on AI collaboration

**Demo Video:**
- 3-5 minute walkthrough
- Shows all major features
- Multi-user collaboration demo
- AI agent demo
- Professional production quality

### Success Criteria
- ✅ All documentation complete and accurate
- ✅ AI development log is comprehensive
- ✅ Demo video is professional quality
- ✅ README is clear and inviting
- ✅ User guide helps users succeed
- ✅ Documentation ready for submission

> **Note**: See Phase 3E documentation PR (removed from that phase) for detailed implementation examples. This PR should update all docs to reflect Google-only auth, user initials, and all Phase 3 features.

---

## PR #17: AI Agent Enhancements

**Branch**: `feature/ai-enhancements`  
**Work Level**: Medium  
**Breaking Changes**: None

> **⚠️ SIMPLIFIED SCOPE:** Focus on command history, suggestions, and enhanced prompts. Voice input deferred. Canvas state snapshots removed (unnecessary for read-only history).

### Why This PR?
- Make AI agent more powerful and intelligent
- Improve user experience with AI
- Add features users expect from AI assistants
- Reduce friction in AI interactions
- Prepare for advanced use cases

### What This PR Delivers

**Enhanced AI Capabilities:**
1. **AI Suggestions** - Proactive suggestions based on context
2. **AI Command History** - Review past AI commands (read-only, no undo/redo)
3. **Voice Input** (BONUS) - Speak commands to AI

**Improved UX:**
- AI typing indicator (✅ **Already exists** - shows "Processing your command..." in AIChat.tsx)
- Better error messages with suggestions
- Command confirmation for destructive operations

**Advanced Features:**
- Batch operations (e.g., "Create 10 circles in a grid")
- Conditional operations (e.g., "Change all red shapes to blue")
- Relative positioning (e.g., "Create a circle above each rectangle")

### Implementation Strategy

**AI Suggestions:**
- Context-aware suggestions based on canvas state
- Show in AI chat panel
- Click to execute suggestion
- Examples:
  - "No shapes selected. Try creating one!"
  - "These shapes look misaligned. Want to align them?"
  - "Multiple similar shapes. Want to distribute them evenly?"

**Command History:**
- Simple read-only list of **last 10 commands only**
- Store user input and AI response (success/failure)
- **No canvas snapshots** - just the text commands and results
- No state snapshots or undo/redo (out of scope)
- Purpose: Learning tool, quick retry, command discovery, debugging

**Voice Input (TRULY BONUS - Skip for MVP):**
- Use Web Speech API (Chrome-only, limited browser support)
- Microphone button in AI chat
- Convert speech to text
- Send to AI agent
- **Recommendation:** Defer to future work due to browser compatibility concerns

### Files to Create

#### `/src/components/ai/AICommandHistory.tsx` (Updated - Read-only)
```typescript
import React, { useState } from 'react'
import './AICommandHistory.css'

interface AICommand {
  id: string
  timestamp: number
  userInput: string
  aiResponse: string
  success: boolean
}

interface AICommandHistoryProps {
  commands: AICommand[]
}

const AICommandHistory: React.FC<AICommandHistoryProps> = ({ commands }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="ai-command-history">
      <div className="history-header">
        <h3>Recent Commands</h3>
        <button onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="history-list">
          {commands.length === 0 ? (
            <div className="empty-state">
              No AI commands yet. Try asking the AI to create a shape!
            </div>
          ) : (
            commands.slice().reverse().slice(0, 10).map((command) => (
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
// import VoiceInput from './VoiceInput'  // SKIP FOR MVP
import { useAIHistory } from '../../contexts/AIHistoryContext'

const AIChat: React.FC = () => {
  const { addCommand } = useAIHistory()

  const handleSendMessage = async (message: string) => {
    try {
      const response = await sendToAI(message)
      
      // Add to history (simple - no canvas snapshots)
      addCommand({
        id: Date.now().toString(),
        timestamp: Date.now(),
        userInput: message,
        aiResponse: response.message,
        success: true
      })
    } catch (error) {
      // Add error to history
      addCommand({
        id: Date.now().toString(),
        timestamp: Date.now(),
        userInput: message,
        aiResponse: error.message,
        success: false
      })
    }
  }

  return (
    <div className="ai-chat">
      <AICommandHistory />
      
      <AISuggestions />
      
      <div className="chat-messages">
        {/* Existing chat UI - already has typing indicator */}
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          className="ai-input"
          placeholder="Ask AI to create, modify, or arrange shapes..."
        />
        {/* <VoiceInput onTranscript={handleSendMessage} /> SKIP FOR MVP */}
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

### Testing Checklist

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

**Manual Testing - AI Command Coverage (Test each major feature once):**

*Shape Creation & Types:*
- [ ] "Create a blue rectangle at 200, 300"
- [ ] "Create a red circle with radius 50"
- [ ] "Create a line from 100, 100 to 200, 200"
- [ ] "Add text saying Hello World"

*Multi-Select Operations:*
- [ ] "Select all rectangles"
- [ ] "Select the 3 blue shapes"
- [ ] "Deselect everything"

*Multi-Shape Batch Operations:*
- [ ] "Create 5 rectangles in a row"
- [ ] "Delete all the circles"
- [ ] "Change all red shapes to blue"
- [ ] "Make all rectangles 100 pixels wide"

*Rotation:*
- [ ] "Rotate the selected shape 45 degrees"
- [ ] "Rotate all selected shapes 90 degrees"

*Alignment & Distribution:*
- [ ] "Align all selected shapes to the left"
- [ ] "Center the selected shapes vertically"
- [ ] "Distribute the selected shapes horizontally"

*Text Formatting:*
- [ ] "Make the text bold"
- [ ] "Change font size to 24"
- [ ] "Make the text italic"

*Shape Manipulation:*
- [ ] "Move the rectangle to 400, 200"
- [ ] "Make it twice as big"
- [ ] "Duplicate the selected shapes"

*Conditional/Spatial (If AI can understand):*
- [ ] "Select all shapes in the top-left area"
- [ ] "Find all blue rectangles"

**Note:** ~20 focused commands hitting each major feature. Document which commands work, which need tool additions, and which need system prompt improvements.

### Success Criteria
- ✅ Command history works (last 10 commands, read-only)
- ✅ AI suggestions are helpful and context-aware
- ✅ AI command coverage tested (~20 commands hitting all features)
- ✅ Advanced AI features work (batch, conditional, relative)
- ✅ Better error messages and UX
- ✅ Real-time sync verified

### Future Work (Deferred)
- Voice input (Web Speech API - Chrome only)
- Command undo/redo (requires canvas state snapshots)
- AI learning from user corrections
- Natural language improvements over time

---

## PR #18: Comments & Annotations

**Branch**: `feature/comments-annotations`  
**Work Level**: Medium-High  
**Breaking Changes**: None

> **⚠️ MVP FOCUS:** Shape comments only (no canvas comments). Comment icon in info bar with color states (white/yellow) and unread indicator (red dot). Comments panel dropdown shows newest-first. No resolution, @mentions, threading, or editing. localStorage-based unread tracking (Option A - simple). Text validation: 1-500 chars.

### Why This PR?
- Essential for asynchronous collaboration
- Enable feedback and discussion
- Common in all professional design tools
- Completes the collaboration story
- Production-ready feature set

### What This PR Delivers

**Comments System:**
1. **Shape Comments** - Attach comments to specific shapes (rectangles, circles, lines, text)
2. **Comment Deletion** - Authors can delete their own comments
3. **Unread Indicator** - Red dot shows when unread comments exist

> **Note**: Canvas comments (not attached to shapes), threading/replies, @mentions, and comment resolution are out of scope for this phase (defer to future work). Each comment stands alone. Comment editing is also skipped - users should delete and repost instead.

**Annotations:**
1. **Sticky Notes** - Add notes to canvas *(Out of scope - future work)*
2. **Arrows/Callouts** - Point to specific areas *(Out of scope - future work)*
3. **Highlight Shapes** - Temporary visual emphasis *(Out of scope - future work)*

> **MVP Focus**: Ship basic comments first. Annotations can be added later.

**UI:**
- Comment icon in CanvasInfo bar (shows when shape is selected)
  - **White**: No comments yet
  - **Yellow**: Shape has comments
  - **Red dot** (top-right): Unread comments exist
- Comments dropdown panel (appears below info bar when icon clicked)
- Add comment input at top of panel
- Comments listed newest-first (reverse chronological)
**UI Design Diagram:**
- Clean, minimal design using initials and user colors

```
┌─────────────────────────────────────────────────────────┐
│  CanvasInfo Bar                                         │
│  [Zoom] [Pan] [Shape Count] ... [💬] ← Comment Icon    │
│                                    ↑                    │
│                                    └─ Yellow if comments│
│                                       White if none     │
│                                       Red dot if unread │
└─────────────────────────────────────────────────────────┘
                                    │
                                    │ Click icon
                                    ↓
                            ┌───────────────┐
                            │  Comments (5) │ ← Header with count
                            │       [X]     │    & close button
                            ├───────────────┤
                            │ [Add comment] │ ← Input at TOP
                            │ [Post] 0/500  │    (newest-first)
                            ├───────────────┤
                            │ 💬 Comment 3  │ ← Newest
                            │   "Great!"    │
                            │   [Delete]    │
                            ├───────────────┤
                            │ 💬 Comment 2  │
                            │   "Nice work" │
                            ├───────────────┤
                            │ 💬 Comment 1  │ ← Oldest
                            │   "Looks good"│
                            └───────────────┘
```

### Implementation Strategy

**Data Model:**
```typescript
// Define in /src/types/comment.ts
export interface Comment {
  id: string
  shapeId: string  // REQUIRED - always attached to a shape (no canvas comments)
  text: string     // Min 1 char, max 500 chars
  authorId: string
  authorName: string
  createdAt: number
  updatedAt: number
  // No authorAvatar - use initials system from Phase 3E instead
  // No resolved field - resolution concept removed
  // No mentions array - @mentions deferred to future work
  // No parentId - threading not supported
}

// Local storage for unread tracking (per user)
interface CommentReadState {
  lastViewedAt: { [shapeId: string]: number }
}
```

> **Note**: Comments are ALWAYS attached to shapes (no canvas comments). No resolution, threading, or @mentions in MVP.

**Firebase Structure:**
```
/comments
  /{commentId}
    - id
    - shapeId (required)
    - text (1-500 chars)
    - authorId
    - authorName
    - createdAt
    - updatedAt
```

**Real-Time Sync:**
- Comments sync in real-time across all users
- Unread indicator (red dot) appears when new comments arrive since last view
- Comment icon changes color (white → yellow) when comments exist

**Unread Tracking (Simple - Option A):**
- Store `lastViewedAt` timestamp in localStorage per shape
- Any comment with `createdAt > lastViewedAt[shapeId]` is "unread"
- When user opens comments panel for a shape, update `lastViewedAt[shapeId] = Date.now()`
- Show red dot if ANY comment for selected shape is unread

### Files to Create

#### `/src/components/comments/CommentBubble.tsx`
```typescript
import React from 'react'
import { Comment } from '../../types/comment'
import { getUserColor } from '../../utils/userColors'
import './CommentBubble.css'

interface CommentBubbleProps {
  comment: Comment
  onDelete: () => void
  isOwner: boolean
}

// Helper to derive initials (reuse from Phase 3E pattern)
const getInitials = (name: string): string => {
  if (!name) return '?'
  const initials = name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return initials || '?'
}

const CommentBubble: React.FC<CommentBubbleProps> = ({
  comment,
  onDelete,
  isOwner
}) => {
  const initials = getInitials(comment.authorName)
  const userColor = getUserColor(comment.authorId)

  return (
    <div className="comment-bubble">
      <div className="comment-header">
        <div 
          className="comment-avatar-initials"
          style={{ backgroundColor: userColor }}
        >
          {initials}
        </div>
        <div className="comment-info">
          <span className="author">{comment.authorName}</span>
          <span className="timestamp">
            {new Date(comment.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="comment-body">
        <p className="comment-text">{comment.text}</p>

        {isOwner && (
          <div className="comment-actions">
            <button onClick={onDelete} className="danger">Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CommentBubble
```

#### `/src/components/comments/CommentsPanel.tsx`
```typescript
import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useComments } from '../../contexts/CommentsContext'
import CommentBubble from './CommentBubble'
import './CommentsPanel.css'

interface CommentsPanelProps {
  shapeId: string
  onClose: () => void
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({ shapeId, onClose }) => {
  const { user } = useAuth()
  const { getCommentsForShape, addComment, deleteComment } = useComments()
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const shapeComments = getCommentsForShape(shapeId)
    .sort((a, b) => b.createdAt - a.createdAt)  // Newest first

  const handleSubmit = async () => {
    if (!commentText.trim() || commentText.length > 500 || isSubmitting) return

    setIsSubmitting(true)
    try {
      await addComment(shapeId, commentText.trim())
      setCommentText('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const charCount = commentText.length
  const isValid = charCount >= 1 && charCount <= 500

  return (
    <div className="comments-panel">
      <div className="panel-header">
        <h3>Comments ({shapeComments.length})</h3>
        <button onClick={onClose} className="close-button">✕</button>
      </div>

      {/* Add comment input at TOP */}
      <div className="comment-input-container">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          maxLength={500}
        />
        <div className="comment-input-actions">
          <span className={`comment-char-count ${!isValid && charCount > 0 ? 'error' : ''}`}>
            {charCount}/500
          </span>
          <button
            className="submit"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Comments list (newest first) */}
      <div className="comments-list">
        {shapeComments.length === 0 ? (
          <div className="empty-state">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          shapeComments.map(comment => (
            <CommentBubble
              key={comment.id}
              comment={comment}
              onDelete={() => deleteComment(comment.id)}
              isOwner={comment.authorId === user?.uid}
            />
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
import type { Comment } from '../types/comment'

interface CommentsContextType {
  comments: Comment[]
  addComment: (shapeId: string, text: string) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
  getCommentsForShape: (shapeId: string) => Comment[]
  hasUnreadComments: (shapeId: string) => boolean
  markShapeAsRead: (shapeId: string) => void
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

  const addComment = useCallback(async (shapeId: string, text: string) => {
    if (!user || !text.trim() || text.length > 500) return

    await commentsService.createComment({
      shapeId,
      text: text.trim(),
      authorId: user.uid,
      authorName: user.displayName || user.email?.split('@')[0] || 'User',
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }, [user])

  const deleteComment = useCallback(async (commentId: string) => {
    await commentsService.deleteComment(commentId)
  }, [])

  const getCommentsForShape = useCallback((shapeId: string) => {
    return comments.filter(c => c.shapeId === shapeId)
  }, [comments])

  // Unread tracking using localStorage (Option A - Simple)
  const hasUnreadComments = useCallback((shapeId: string) => {
    const lastViewed = commentsService.getLastViewedAt(shapeId)
    const shapeComments = comments.filter(c => c.shapeId === shapeId)
    return shapeComments.some(c => c.createdAt > lastViewed && c.authorId !== user?.uid)
  }, [comments, user])

  const markShapeAsRead = useCallback((shapeId: string) => {
    commentsService.updateLastViewedAt(shapeId, Date.now())
  }, [])

  return (
    <CommentsContext.Provider value={{
      comments,
      addComment,
      deleteComment,
      getCommentsForShape,
      hasUnreadComments,
      markShapeAsRead
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
```

#### `/src/services/commentsService.ts`
```typescript
import { dbRef, dbPush, dbSet, dbRemove, dbOnValue } from './firebaseService'
import type { Comment } from '../types/comment'

const LAST_VIEWED_KEY = 'collab-canvas-comments-last-viewed'

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

export const deleteComment = async (commentId: string): Promise<void> => {
  // Delete single comment (no threading, so no replies to worry about)
  const commentRef = dbRef(`comments/${commentId}`)
  await dbRemove(commentRef)
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

// === Unread Tracking (localStorage - Option A) ===

export const getLastViewedAt = (shapeId: string): number => {
  try {
    const data = localStorage.getItem(LAST_VIEWED_KEY)
    if (!data) return 0
    const parsed = JSON.parse(data)
    return parsed[shapeId] || 0
  } catch {
    return 0
  }
}

export const updateLastViewedAt = (shapeId: string, timestamp: number): void => {
  try {
    const data = localStorage.getItem(LAST_VIEWED_KEY)
    const parsed = data ? JSON.parse(data) : {}
    parsed[shapeId] = timestamp
    localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify(parsed))
  } catch (error) {
    console.error('Error updating last viewed timestamp:', error)
  }
}
```

### Files to Update

#### 1. Add comment icon to CanvasInfo bar
In `/src/components/canvas/CanvasInfo.tsx`:

```typescript
import { useComments } from '../../contexts/CommentsContext'
import CommentsPanel from '../comments/CommentsPanel'

const CanvasInfo: React.FC = () => {
  const { selectedShapes, getCommentsForShape, hasUnreadComments, markShapeAsRead } = useComments()
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false)
  
  // Get currently selected shape (single selection only)
  const selectedShape = /* logic to get single selected shape */
  const selectedShapeId = selectedShape?.id
  
  const commentCount = selectedShapeId ? getCommentsForShape(selectedShapeId).length : 0
  const hasComments = commentCount > 0
  const hasUnread = selectedShapeId ? hasUnreadComments(selectedShapeId) : false
  
  const handleCommentIconClick = () => {
    if (!selectedShapeId) return
    
    setCommentsPanelOpen(!commentsPanelOpen)
    
    // Mark as read when opening panel
    if (!commentsPanelOpen) {
      markShapeAsRead(selectedShapeId)
    }
  }

  return (
    <div className="canvas-info">
      {/* Existing info bar content */}
      
      {/* Comment icon (only show when shape is selected) */}
      {selectedShapeId && (
        <button
          className={`comment-icon-button ${hasComments ? 'has-comments' : ''}`}
          onClick={handleCommentIconClick}
          title={`Comments (${commentCount})`}
        >
          💬
          {hasUnread && <div className="comment-unread-indicator" />}
        </button>
      )}
      
      {/* Comments panel dropdown */}
      {commentsPanelOpen && selectedShapeId && (
        <CommentsPanel
          shapeId={selectedShapeId}
          onClose={() => setCommentsPanelOpen(false)}
        />
      )}
    </div>
  )
}
```

#### 2. Create /src/types/comment.ts
```typescript
export interface Comment {
  id: string
  shapeId: string
  text: string
  authorId: string
  authorName: string
  createdAt: number
  updatedAt: number
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
        ".validate": "newData.hasChildren(['id', 'shapeId', 'text', 'authorId', 'authorName', 'createdAt', 'updatedAt'])",
        "id": {
          ".validate": "newData.isString() && newData.val() === $commentId"
        },
        "shapeId": {
          ".validate": "newData.isString() && newData.val().length > 0"
        },
        "text": {
          ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 500"
        },
        "authorId": {
          ".validate": "newData.isString() && newData.val() === auth.uid"
        },
        "authorName": {
          ".validate": "newData.isString() && newData.val().length > 0"
        },
        "createdAt": {
          ".validate": "newData.isNumber() && (!data.exists() || newData.val() === data.val())"
        },
        "updatedAt": {
          ".validate": "newData.isNumber()"
        }
      }
    }
  }
}
```

> **Note**: `createdAt` is immutable after creation. `authorId` must match the authenticated user.

### CSS Files to Create

#### `/src/components/comments/CommentBubble.css`
```css
.comment-bubble {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s;
}

.comment-bubble:hover {
  background-color: #f9fafb;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.comment-avatar-initials {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}

.comment-info {
  flex: 1;
  min-width: 0;
}

.comment-info .author {
  font-weight: 600;
  font-size: 14px;
  color: #1f2937;
  display: block;
}

.comment-info .timestamp {
  font-size: 12px;
  color: #6b7280;
  display: block;
}

.comment-body {
  margin-top: 8px;
  padding-left: 42px;
}

.comment-text {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.comment-actions {
  display: flex;
  gap: 8px;
}

.comment-actions button {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.comment-actions button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.comment-actions button.danger {
  color: #dc2626;
  border-color: #fca5a5;
}

.comment-actions button.danger:hover {
  background: #fee2e2;
  border-color: #ef4444;
}
```

#### `/src/components/comments/CommentsPanel.css`
```css
.comments-panel {
  position: absolute;
  top: 60px;  /* Below info bar */
  right: 20px;
  width: 360px;
  max-height: 500px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.panel-header .close-button {
  background: none;
  border: none;
  font-size: 18px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s;
}

.panel-header .close-button:hover {
  color: #1f2937;
}

.comment-input-container {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.comment-input-container textarea {
  width: 100%;
  min-height: 60px;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 8px;
}

.comment-input-container textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.comment-input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-char-count {
  font-size: 12px;
  color: #6b7280;
}

.comment-char-count.error {
  color: #dc2626;
}

.comment-input-actions button {
  padding: 6px 16px;
  font-size: 13px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.comment-input-actions button.submit {
  background: #3b82f6;
  color: white;
}

.comment-input-actions button.submit:hover:not(:disabled) {
  background: #2563eb;
}

.comment-input-actions button.submit:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  max-height: 350px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}
```

#### `/src/components/canvas/CanvasInfo.css` (Additions)
Add to existing CanvasInfo.css:

```css
/* Comment icon button */
.comment-icon-button {
  position: relative;
  padding: 6px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: 8px;
  font-size: 16px;
}

.comment-icon-button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.comment-icon-button.has-comments {
  background: #fef3c7;
  border-color: #fbbf24;
  color: #92400e;
}

.comment-icon-button.has-comments:hover {
  background: #fde68a;
}

.comment-unread-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background: #ef4444;
  border: 2px solid white;
  border-radius: 50%;
}
```

### Testing Checklist

**Manual Testing - Comments UI:**
- [ ] Comment icon appears in info bar when shape is selected
- [ ] Icon is white when no comments exist
- [ ] Icon is yellow when comments exist
- [ ] Red dot appears when unread comments exist
- [ ] Clicking icon toggles comments panel
- [ ] Panel appears below info bar
- [ ] Panel shows correct comment count in header
- [ ] Add comment input at TOP of panel
- [ ] Comments listed newest-first (reverse chronological)
- [ ] User initials and colors display correctly

**Manual Testing - Comment Actions:**
- [ ] Can add comment (min 1 char, max 500 chars)
- [ ] Cannot submit empty comment
- [ ] Cannot submit comment over 500 chars
- [ ] Character count updates live
- [ ] Post button disabled when invalid
- [ ] Can delete own comment (no confirmation)
- [ ] Cannot delete others' comments (no delete button)
- [ ] Comments panel updates immediately after actions

**Manual Testing - Unread Tracking:**
- [ ] Red dot appears when new comment added by another user
- [ ] Red dot disappears when opening comments panel
- [ ] Red dot persists across page refreshes (localStorage)
- [ ] No red dot for own comments

**Manual Testing - Real-Time Sync:**
- [ ] Comments sync across users in real-time
- [ ] New comments appear immediately for all users
- [ ] Deleted comments disappear for all users
- [ ] Comment icon color updates for all users

**Manual Testing - Multi-Shape:**
- [ ] Comments work for rectangles
- [ ] Comments work for circles
- [ ] Comments work for lines
- [ ] Comments work for text
- [ ] Switching selected shape updates comment icon/panel correctly

**Integration Testing:**
- [ ] Comments system doesn't interfere with AI agent
- [ ] Can still use AI while comments panel open
- [ ] All features work together (selection, comments, AI, etc.)

### Success Criteria
- ✅ Comments system fully functional (create, delete)
- ✅ Comment icon in info bar with state indicators (white/yellow/red dot)
- ✅ Comments panel dropdown UI works correctly
- ✅ Real-time sync verified
- ✅ UI is intuitive (initials, user colors, newest-first ordering)
- ✅ Unread tracking works (localStorage-based)
- ✅ Text validation enforced (1-500 chars)
- ✅ Performance acceptable
- ✅ No console errors

### Future Work (Deferred)
- Canvas comments (not attached to shapes)
- Comment resolution/unresolved tracking
- @Mentions (user tagging and notifications)
- Comment threading/replies
- Comment editing (currently delete/repost only)
- Annotations: Sticky notes, arrows/callouts, shape highlighting
- Comment search/filter
- Rich text formatting in comments
- File attachments
- Comment history/audit log
- Comment reactions (emoji)
- Multi-device unread sync (database-based instead of localStorage)

---

## Phase 3F Completion Checklist

Before declaring Phase 3 complete, verify:

### Functionality
- [ ] All 3 PRs merged and tested (16, 17, 18)
- [ ] Documentation complete (README, user guide, dev log, demo video)
- [ ] AI enhancements working (history, suggestions, advanced features)
- [ ] Comments system working (comments, resolution, no threading)
- [ ] Voice input working (if implemented - bonus feature)
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

