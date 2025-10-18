# Phase 3 Implementation Guide

This directory contains detailed implementation plans for Phase 3 of CollabCanvas development, organized by sub-phase for maximum clarity and manageability.

---

## Phase Overview

Phase 3 consists of **6 sub-phases** with **16 Pull Requests** total:

| Phase | Focus | PRs | Work Level | Documents |
|-------|-------|-----|------------|-----------|
| **3A** | Polish & Quick Wins | 1-3 | Low-Medium | [`phase3a-polish.md`](./phase3a-polish.md) |
| **3B** | Multi-Select Refactor | 4 | Medium-High | [`phase3b-multiselect.md`](./phase3b-multiselect.md) |
| **3C** | Shape Expansion | 5-8 | High | [`phase3c-shapes.md`](./phase3c-shapes.md) |
| **3D** | Advanced Features | 9-11 | Medium-High | [`phase3d-advanced.md`](./phase3d-advanced.md) |
| **3E** | Infrastructure & Docs | 12-14 | High | [`phase3e-infrastructure.md`](./phase3e-infrastructure.md) |
| **3F** | Final Features | 15-16 | High | [`phase3f-final.md`](./phase3f-final.md) |

---

## Complete PR List

| PR # | Title | Phase | Work | Breaking |
|------|-------|-------|------|----------|
| 1 | Duplicate + Copy/Paste | 3A | Low | No |
| 2 | Enhanced Color Picker + Shortcuts | 3A | Low | No |
| 3 | Layering & Z-Index | 3A | Medium | No |
| 4 | Multi-Select Implementation | 3B | Med-High | ⚠️ Yes |
| 5 | Circle Shape | 3C | Medium | No |
| 6 | Line/Arrow Shape | 3C | Medium | No |
| 7 | Basic Text Shape | 3C | Med-High | No |
| 8 | Text Enhancements (BONUS) | 3C | Medium | No |
| 9 | Alignment Tools | 3D | Medium | No |
| 10 | Selection Tools | 3D | Medium | No |
| 11 | Rotate Operation | 3D | Med-High | No |
| 12 | Authentication Migration | 3E | High | ⚠️ Yes |
| 13 | Testing & Performance | 3E | Medium | No |
| 14 | Documentation, Dev Log & Demo | 3E | Medium | No |
| 15 | AI Agent Enhancements | 3F | Med-High | No |
| 16 | Comments & Annotations | 3F | High | No |

---

## Critical Path & Dependencies

```
Phase 3A (PR 1,2,3) - Polish & Quick Wins
    ↓
Phase 3B (PR 4) - Multi-Select Refactor ← Must complete before 3D
    ↓
Phase 3C (PR 5,6,7,8) - Shape Expansion ← Can run parallel with 3D after 3B
    ↓
Phase 3D (PR 9,10,11) - Advanced Features ← Depends on 3B complete
    ↓
Phase 3E (PR 12,13,14) - Infrastructure & Docs ← Must complete before 3F
    ↓
Phase 3F (PR 15,16) - Final Features
```

### Key Dependencies
- **PR #4** (Multi-Select) must complete before **PR #9-11** (Advanced Features)
- **PR #4** (Multi-Select) must complete before full testing of **PR #5-8** (Shapes with AI)
- **PR #12** (Auth Migration) can be done independently/parallel to other work
- **PR #14** (Documentation) must be last in Phase 3E
- **Phase 3F** requires all previous phases complete

### Parallelization Opportunities
- Phases 3C and 3D can partially overlap after 3B is complete
- PR #12 (Auth) can be done anytime, doesn't block other work
- PRs within Phase 3C (5,6,7,8) are independent and can be parallelized

---

## How to Use These Documents

### Start Here: Phase 3A
**Document**: [`phase3a-polish.md`](./phase3a-polish.md)

Begin with Phase 3A - it has no dependencies and provides immediate value. These are warm-up tasks that polish existing rectangle functionality.

### Document Structure
Each phase document contains:
1. **Phase Overview** - Goals, work level, PRs included
2. **Detailed PR Specs** - For each PR:
   - Branch name, work level, breaking changes
   - Why this PR (context and value)
   - Implementation strategy
   - Files to create/update with code samples
   - Testing checklist (manual + AI)
   - Success criteria
3. **Phase Completion Checklist** - What to verify before moving on

### Work Through Sequentially
1. Read the phase document thoroughly
2. Implement each PR in order
3. Test thoroughly (checklist provided)
4. Complete phase checklist
5. Move to next phase

### Breaking Changes (⚠️)
Two PRs have breaking changes and require extra care:
- **PR #4** (Multi-Select): Changes selection model from single to multi
- **PR #12** (Authentication): Migrates from Firebase Anonymous to third-party auth

These are isolated in their own phases (3B and 3E) for focused attention.

---

## Progress Tracking

Current state (from `todo.md`):
- Section 1 (Core Collaborative Infrastructure): 90% complete
- Section 2 (Canvas Features & Performance): 65% complete  
- Section 3 (Advanced Figma-Inspired Features): 15% complete
- Section 4 (AI Canvas Agent): 67% complete
- Section 5 (Technical Implementation): 80% complete
- Section 6 (Documentation & Submission Quality): 80% complete

After Phase 3 completion, all sections will be 95-100% complete.

---

## Key Architectural Decisions

### Shape Architecture (Phase 3C)
**Decision**: Use **separate collections** approach (simplest)
- `rectangles`, `circles`, `lines`, `texts` as separate Firebase collections
- No database migration needed
- Can refactor to unified `shapes` collection later if needed
- Keeps Phase 3C PRs independent and non-breaking

**Rationale**: Simplicity NOW (current constraint), can refactor later (no production users yet)

### Multi-Select Pattern (Phase 3B)
**Decision**: Breaking change to selection model
- Change from `selectedRectangleId: string | null` to `selectedRectangleIds: Set<string>`
- Add `primarySelectionId: string | null` for resize handles
- Isolated in Phase 3B to contain risk

**Rationale**: Essential foundation for advanced features (alignment, distribution, bulk operations)

### Text Support (Phase 3C)
**Decision**: Basic first, formatting as BONUS
- PR #7: Single-line text, no formatting (core functionality)
- PR #8: Size, bold/italic (if time permits)

**Rationale**: Text is high-value despite complexity. Basic version delivers most value, formatting is enhancement.

---

## Questions or Issues?

If you encounter ambiguities or have questions while implementing:
1. Check the specific phase document for details
2. Reference the architecture decisions above
3. Consult Phase 2 architecture docs in `docs/phase2/architecture.md`
4. Look at existing patterns in the codebase

---

## Ready to Start?

👉 **Begin with [Phase 3A: Polish & Quick Wins](./phase3a-polish.md)**

This phase has 3 PRs that build on existing rectangle functionality with no breaking changes. Perfect warm-up for Phase 3!

