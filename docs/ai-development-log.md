# AI Development Log
*Building CollabCanvas with Claude Sonnet - What I Learned*

## Working with an AI Coding Partner

After building this entire collaborative canvas app with Claude, I've got some thoughts on what works and what doesn't. The biggest surprise? It really does feel like pair programming with a very capable but quirky colleague.

The main thing I figured out is that context is absolutely everything. Claude needs the full picture upfront - I learned to always start with "Read this PRD carefully and let me know if you have any questions." Without that foundation, you get generic solutions that miss the mark.

Quality control became my responsibility pretty quickly. Claude cranks out functional code fast, but it doesn't self-correct for bloat or bad patterns. I had to explicitly ask it to "check for bloat or anything that's not best practices" to catch the 415-line Canvas component that was doing way too much.

The PR-based approach (breaking into 9 discrete chunks) saved my sanity. When Claude misunderstood what I wanted - like implementing movement when I actually needed resizing - I could course-correct without losing momentum.

## What Claude Does Well (And Not So Well)

On the positive side, Claude is genuinely impressive at rapid implementation. It generated complete React/TypeScript components with Firebase integration faster than I could have written them myself. The pattern recognition is solid too - once I established the contexts/services/hooks structure, it consistently followed that approach throughout.

The debugging skills surprised me most. When we hit that gnarly React-Konva compatibility issue and the event handling conflicts with drag operations, Claude methodically worked through the problems. It also writes better unit tests than I do, with proper mocking and edge cases I wouldn't have thought of.

But there are some clear blind spots. Claude doesn't naturally think about separation of concerns - it'll happily create a 415-line component that handles pan/zoom, rectangle operations, keyboard controls, and rendering all in one file. It accumulates technical debt without noticing, repeating patterns and creating redundancy.

The biggest limitation is how literally it interprets requirements. When I said "implement PR 7 tasks," it focused on the exact wording rather than understanding what I actually needed. I learned to be very specific about the intent behind requests.

## Prompting Patterns That Actually Work

Through trial and error, I found a few approaches that consistently get better results:

**Start with the big picture.** My go-to opener became "Read this PRD carefully and let me know if you have any questions." Claude needs comprehensive context upfront, then I'd follow up with specific clarifications like "Let's use Firebase Anonymous Auth" or "throttle cursor updates every 16ms." This eliminated most of the back-and-forth.

**Be specific when correcting course.** When Claude went off track, vague feedback didn't help. Instead of saying "this isn't right," I'd be explicit: "You're right that rectangle movement is implemented. The missing functionality is rectangle resizing." Concrete corrections with examples worked way better than general guidance.

**Give permission to critique.** Claude won't naturally suggest improvements to its own work. I had to explicitly ask: "Check each file for bloat or anything that's not best practices... Focus on files greater than 300 lines." It needed permission to be critical of code it had written.

**Reference existing task lists.** "Please implement the tasks for PR 7" worked better than re-explaining requirements. When paired with todo tracking, this kept everything focused and accountable.

**Copy-paste errors exactly.** For debugging, nothing beats: "For the code present, we get this error: Cannot find name 'vi'. How can I resolve this? If you propose a fix, please make it concise." Exact error messages with requests for concise solutions got targeted fixes fast.

The pattern that emerged: establish context upfront, use systematic task tracking, give specific feedback when things go sideways, and explicitly request quality checks. This kept Claude's speed advantage while maintaining human oversight on architecture and quality decisions.
