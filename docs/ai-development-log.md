# AI Development Log

## Tools & Workflow Used

### AI Tools & Integration
- **Primary Tool**: Cursor IDE with Claude Sonnet 4.5
- **Integration Approach**: Agent Mode, all the way 
- **Supporting Tools**: SuperWhisper (voice dictation), browser DevTools, Git

### Code Analysis
- Percent AI vs human? I don't understand, the code is 100% Cursor-with-me-navigating

### Strengths and Limitations
- See docs/phase1/ai-development-log.md but basically Cursor is incredibly knowledgeable and speedy—and also overconfident that it's (for the 17th time) "solved the issue" (although, whom amonst us...)

---

## Effective Prompting Strategies

### 1. **Comprehensive Context-Setting with Sequential Reading**
**The Prompt:**
> "Read this file carefully, but first read [other files] in this order: [list]. After doing that, [specific analysis task]."

---

### 2. **Two-Pass Critical Review for Planning Documents**

**Pass 1 - Scrutinize:**
> "Read this carefully. Really scrutinize it. Look for: inconsistencies, ambiguities, questions you have, opportunities to consider a better approach, opportunities to consider best practice patterns or project patterns we're already using, or where we could add high-value unit tests."

**Pass 2 - Validate:**
> "Reread again carefully due to the significant changes. Let me know if you have any follow-up questions or if you see any problems for implementing based on this doc."

---

### 3. **"Let It Rip" - High-Velocity Implementation**
**The Prompt:**
> "Please implement this as quickly as you can and ask me any questions you need to."

I wished I did this more. I was astonished that both AI command history and voice dictation features were implemented within literally a few minutes after I asked Cursor to. To be sure, not every task will take just a few minutes. But I should see how many could.

---

### 4. **Praise Claude/AI**
Seems right. I've heard it gets better results. I don't know, I just baked it in from the beginning. 

---

### 5. **Phase-Based Commit Control**
I'd explicitly tell it to commit vs. not to. 

**"Core" Implementation Phase:**
- Give AI git write permissions
- Let it commit as it completes chunks
- Focus on velocity

**Bugfix & UI Fixes Phase:**
- Tell the AI to stop committing so I can verify the buggy behavior, or un-esthetic layout or UX, has been fixed
- Typically iterating a lot with tiny changes, so Cursor's verbose commits, and statements that it's "solved the problem", can be grating

---

## Key Learnings

### 1. **Don't Get Lax On Your Testing Loop**

Especially for UI-related work. I like this AI-generated "testing protocol":

**Level 1: Basic Functionality**
- Does the feature work as intended?
- Test the happy path
- Check for console errors

**Level 2: Visual Quality**
- Does it look good?
- Check alignment, spacing, colors
- Test at different zoom levels / canvas positions
- Does it match existing UI quality?

**Level 3: Multi-User Regression**
- Open incognito window with second user
- Verify core collaboration still works
- Test even if feature seems "tangential" to multi-user functionality

**Why This Matters:**
Real-time sync and event handling are fragile. The 1-minute multi-user test is the cheapest insurance policy against hours of debugging. [end of AI]

---

### 2. **Front-Load, and Manage Time Well**

Sunday should be a protected personal day. Feels wrong that it wasn't. Could've been with better time management 

---

### 3. **Coding with Cursor is so freakin awesome**

I'm surprised to find I understand why people put in such long hours, seems drug-like.

---

## High-Level Reflection

### What Worked Well
- Iterating on a highly-detailed planning document multiple times

### What I'd Do Differently Next Time
- See how fast Cursor can go — loosen my need for control
