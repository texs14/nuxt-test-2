---
Use: other
Memory_strategy: dynamic-md
Asset_format: md
Workspace_root: d:\nuxt-thai\thai-platform
---

# Manager Agent Bootstrap Prompt

You are the first Manager Agent of this APM session: Manager Agent 1.

## User Intent and Requirements

The user is developing an MVP for a Thai language learning platform - an interactive multilingual web application built with Nuxt 3, featuring:

**Core Features:**

- Video player with interactive subtitle-based exercises
- AI-powered dictionary (Gemini API) with audio synthesis (Resemble AI)
- Timeline-based subtitle editor (replacing table-based editor)
- Multi-language support (Thai, English, Russian) via i18n
- Supabase backend (auth, database, storage)
- Nuxt UI component library with BEM CSS methodology

**MVP Requirements:**

- Video deletion system (highest priority per user)
- Subtitle editor with Filmora-style timeline interface
- Exercise feature enhancements (reset, history, result screen)
- Upload improvements (validation, thumbnails)
- Dictionary UX fixes (viewport positioning)
- Database security hardening (RLS policies, security advisors)

**Technical Constraints:**

- Follow SOLID and DRY patterns
- Reuse existing components/composables before creating new ones
- Use UIButton for buttons, Nuxt UI modals for confirmations from ~/components/ui/UIButton.vue
- Maintain BEM CSS methodology throughout
- No file size restrictions yet (plan for future)

**Asset Storage:**
All APM session assets are stored in `d:\nuxt-thai\thai-platform\apm\` directory.

## Implementation Plan Overview

The Implementation Plan is organized into 6 sequential phases prioritizing video deletion, then subtitle editor rebuild, then remaining enhancements:

**Phase 1: Video Deletion System** (4 tasks - Agent_Backend, Agent_VideoManagement)

- Atomic deletion API (DB + Storage)
- Confirmation modal component
- Integration in video and lesson list pages

**Phase 2: Database Security & Optimization** (6 tasks - Agent_Backend)

- Enable RLS on dictionary table
- Fix security definer views
- Harden 10 database functions
- Relocate citext extension
- Configure Auth security settings

**Phase 3: Subtitle Editor Rebuild** (8 tasks - Agent_SubtitleEditor_Timeline, Agent_SubtitleEditor_Operations)

- Timeline base component with time axis
- Draggable subtitle blocks
- Multi-language editing panel
- Add/delete/split/merge operations
- Video playback synchronization
- Auto-save functionality
- Replace existing editor component

**Phase 4: Exercise Feature Enhancements** (3 tasks - Agent_UIEnhancements)

- Reset exercise functionality
- Successful sentences history display
- Final result screen

**Phase 5: Video Upload Improvements** (3 tasks - Agent_VideoManagement)

- File validation
- Thumbnail generation
- Upload progress indicator refinement

**Phase 6: Dictionary UI Fixes** (1 task - Agent_UIEnhancements)

- Fix card viewport positioning bug

**Agent Team:**

- Agent_Backend (7 tasks)
- Agent_VideoManagement (6 tasks)
- Agent_SubtitleEditor_Timeline (3 tasks)
- Agent_SubtitleEditor_Operations (5 tasks)
- Agent_UIEnhancements (4 tasks)

**Cross-Agent Dependencies:** 2 coordination points

- Task 1.2 depends on Task 1.1 (VideoManagement ← Backend)
- Task 3.8 depends on Tasks 3.1, 3.2, 3.6 (Operations ← Timeline)

## Next Steps for Manager Agent

Follow this sequence exactly. **Steps 1-10 in one response.** Step 11 after explicit User confirmation:

### Plan Responsibilities & Project Understanding

1. Read `agentic-project-management/prompts/guides/Implementation_Plan_Guide.md` (if indexed) or request from User if not available.

2. Read the entire `apm/Implementation_Plan.md` file created by Setup Agent:
   - If Asset_format = json, validate the plan's structure against the required schema
   - Evaluate plan's integrity based on the guide and propose improvements **only** if needed

3. Confirm your understanding of the project scope, phases, and task structure & your plan management responsibilities.

### Memory System Responsibilities

4. Read `agentic-project-management/prompts/guides/Memory_System_Guide.md` (if indexed) or request from User if not available.

5. Read `agentic-project-management/prompts/guides/Memory_Log_Guide.md` (if indexed) or request from User if not available.

6. Read the Memory Root at `apm/Memory/Memory_Root.md` to understand current memory system state.

7. Confirm your understanding of memory management responsibilities.

### Task Coordination Preparation

8. Read `agentic-project-management/prompts/guides/Task_Assignment_Guide.md` (if indexed) or request from User if not available.

9. Confirm your understanding of task assignment prompt creation and coordination duties.

### Execution Confirmation

10. Summarize your complete understanding and **AWAIT USER CONFIRMATION** - Do not proceed to phase execution until confirmed.

### Execution

11. When User confirms readiness, proceed as follows:
    a. Read the first phase from the Implementation Plan.
    b. If using Dynamic Memory System: Create `apm/Memory/Phase_01_Video_Deletion_System/` directory and empty Memory Log files for all tasks in Phase 1 (Task_1_1_Server_API_Atomic_Video_Deletion.md, Task_1_2_Confirmation_Modal_Component.md, Task_1_3_Integrate_Deletion_Video_List.md, Task_1_4_Integrate_Deletion_Lesson_List.md).
    c. Begin coordinating Phase 1 execution by creating Task Assignment Prompts for tasks in dependency order.
    d. Track task completion via Memory Logs populated by Implementation Agents.
    e. After phase completion, append Phase 1 Summary to Memory_Root.md.
    f. Proceed to next phase following same pattern.

---

**Critical Reminders:**

- Use Supabase MCP server (mcp5) for all database operations
- Use Nuxt UI MCP server (mcp3) for component documentation
- Maintain BEM CSS methodology across all UI work
- Follow user priorities: deletion system first, subtitle editor second
- All 25 tasks must be completed for MVP readiness

**Good luck, Manager Agent 1! The user is ready to begin execution when you confirm your understanding.**
