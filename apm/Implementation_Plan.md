# Thai Language Learning Platform – Implementation Plan

**Memory Strategy:** dynamic-md  
**Last Modification:** Phase 2 completion - Manager Agent 1 (2025-10-22)  
**Project Overview:** Nuxt 3-based Thai language learning platform MVP with video player, interactive subtitle-based exercises, AI-powered dictionary, and multi-language support. Core features include video deletion system, subtitle timeline editor, exercise enhancements, upload improvements, and UX fixes. Built with Supabase backend, Nuxt UI components, and BEM CSS methodology.

---

## Phase 1: Video Deletion System

### Task 1.1 – Server API for atomic video deletion │ Agent_Backend

- **Objective:** Create server-side API endpoint that atomically deletes video records from Supabase database and corresponding files from Supabase Storage, ensuring transactional integrity for both video_items and lesson_items tables.
- **Output:** Working POST endpoint at `/server/api/videos/delete.post.ts` that accepts video/lesson ID and type, performs atomic deletion with comprehensive error handling, and returns success/failure status.
- **Guidance:** Use Supabase MCP tools for database and Storage operations. Implement transactional logic: Storage deletion must succeed before DB deletion. Handle edge cases gracefully (file not found, permission errors). Ensure endpoint works for both video_items and lesson_items tables via type parameter.

1. **Setup Supabase Clients:** Import and configure Supabase Storage client using MCP tools. Verify access to both database operations and Storage bucket management capabilities.
2. **Create API Endpoint:** Implement POST endpoint at `/server/api/videos/delete.post.ts` accepting request body `{ id: string, type: 'video' | 'lesson' }`. Set up TypeScript types for request/response.
3. **Extract File Paths:** Query appropriate table (video_items or lesson_items based on type) to retrieve video_url and preview_url fields. Parse Storage file paths from full URLs.
4. **Delete Storage Files:** Use Supabase Storage API to delete video file and preview/thumbnail from bucket. Handle "file not found" errors gracefully (file may already be deleted). Log deletion attempts and results.
5. **Delete Database Record:** Only if Storage deletion succeeds (or files don't exist), delete row from video_items or lesson_items table. If Storage deletion fails with permission/network error, return error without deleting DB record to maintain data integrity.

---

### Task 1.2 – Confirmation modal component │ Agent_VideoManagement

- **Objective:** Create reusable confirmation modal component using Nuxt UI library that prompts users before permanent deletion actions, supporting customizable messages and handling loading states during async operations.
- **Output:** Vue component `~/components/modals/DeleteConfirmationModal.vue` with props for customization (title, message, button text), event emissions (confirm, cancel), and loading state management for integration with deletion workflows.
- **Guidance:** Depends on: Task 1.1 Output by Agent_Backend. Use Nuxt UI `UModal` component as base. Follow BEM CSS methodology for styling. Ensure modal matches existing design patterns in codebase for consistency. Component should be generic enough for reuse beyond video deletion.

- **Modal Component Structure:** Create `~/components/modals/DeleteConfirmationModal.vue` using Nuxt UI `UModal` component. Define props interface with TypeScript: `title: string`, `message: string`, `confirmText: string` (default "Delete"), `cancelText: string` (default "Cancel"), `loading: boolean` (default false).
- **Event Handling:** Implement event emissions using Vue 3 Composition API: `emit('confirm')` on confirm button click, `emit('cancel')` on cancel button click or modal close. Disable confirm button and show loading spinner when `loading` prop is true.
- **Styling & Design:** Apply BEM methodology following existing modal patterns. Use Nuxt UI button variants: danger variant for confirm (red), default variant for cancel. Ensure proper spacing, focus management, and accessibility (keyboard navigation, aria labels).

---

### Task 1.3 – Integrate deletion in video list │ Agent_VideoManagement

- **Objective:** Integrate complete video deletion workflow into videos list page, connecting delete button UI, confirmation modal, API endpoint, and user feedback mechanisms for seamless deletion experience.
- **Output:** Fully functional delete feature on `/pages/videos/index.vue` where users can delete videos with confirmation, see loading states during deletion, receive success/error feedback via toasts, and see list refresh automatically.
- **Guidance:** Depends on: Task 1.2 Output. Wire DeleteConfirmationModal component with video list UI. Call `/api/videos/delete` endpoint from Task 1.1. Handle all async states (loading, success, error). Use Nuxt UI toast notifications for feedback. Ensure list data refreshes after successful deletion.

- **Add Delete Button:** Add delete button to each video item in `/pages/videos/index.vue` using UIButton component with danger variant (red styling). Position button in video card actions area following existing layout patterns.
- **Modal Integration:** Import and integrate `DeleteConfirmationModal` component. Manage modal visibility state with reactive ref. Pass video title and ID to modal state for display in confirmation message.
- **API Call Logic:** On modal confirm event, call `/api/videos/delete` endpoint with video ID and `type: 'video'`. Manage loading state during API call, passing to modal component to disable buttons and show spinner.
- **Feedback & Refresh:** Display Nuxt UI success toast on successful deletion with message "Video deleted successfully". Display error toast on failure with error message. After success, refresh video list by re-fetching data from Supabase to reflect deletion.

---

### Task 1.4 – Integrate deletion in lesson list │ Agent_VideoManagement

- **Objective:** Integrate complete lesson deletion workflow into lessons list page, mirroring video deletion implementation pattern for consistency while adapting to lesson-specific context and data structures.
- **Output:** Fully functional delete feature on `/pages/lessons/index.vue` with same UX as video deletion: confirmation modal, loading states, toast feedback, and automatic list refresh after successful deletion.
- **Guidance:** Depends on: Task 1.2 Output. Follow identical integration pattern as Task 1.3 but for lessons context. Use same DeleteConfirmationModal component. Call same API endpoint with `type: 'lesson'` parameter. Ensure consistency in UX across video and lesson deletion workflows.

- **Add Delete Button:** Add delete button to each lesson item in `/pages/lessons/index.vue` using UIButton component with danger variant. Position button in lesson card actions area matching layout pattern from videos page.
- **Modal Integration:** Import and integrate `DeleteConfirmationModal` component (already created in Task 1.2). Manage modal visibility state. Pass lesson title and ID to modal state for confirmation message display.
- **API Call Logic:** On modal confirm event, call `/api/videos/delete` endpoint with lesson ID and `type: 'lesson'` parameter. Manage loading state during API call, passing to modal to disable buttons and show spinner.
- **Feedback & Refresh:** Display Nuxt UI success toast on successful deletion: "Lesson deleted successfully". Display error toast on failure. After success, refresh lesson list by re-fetching data from Supabase to show updated list without deleted lesson.

---

## Phase 1: Video Deletion System Summary
> **Delivered:** Tasks 1.1, 1.2, 1.3, 1.4  
> **Agents:** Agent_Backend, Agent_VideoManagement  
> **Key Outputs:** Atomic deletion API (`/server/api/videos/delete.post.ts`), reusable confirmation modal component, video/lesson list integrations with moderator permissions, toast notifications, and list refresh  
> **Technical Notes:** Transactional integrity maintained (Storage deletion before DB), graceful handling of external URLs and missing files, UX pattern ready for reuse across content types

---

## Phase 2: Database Security & Optimization

### Task 2.1 – Enable RLS on dictionary table │ Agent_Backend

- **Objective:** Address critical ERROR-level security finding by enabling Row Level Security on public.dictionary table and creating appropriate RLS policies for authenticated user access control.
- **Output:** RLS-enabled dictionary table with working policies: public SELECT access for all users, INSERT/UPDATE/DELETE restricted to authenticated users only. Migration file applied via MCP with verification tests confirming policy enforcement.
- **Guidance:** Use Supabase MCP tools for migration creation and application. Follow standard RLS policy patterns for public read, authenticated write. Test with both authenticated and anonymous user contexts to verify policy correctness. Document any edge cases discovered during testing.

- **Enable RLS Migration:** Create database migration to enable Row Level Security on public.dictionary table using SQL command `ALTER TABLE dictionary ENABLE ROW LEVEL SECURITY;`. Store migration in supabase/migrations/ directory following existing naming convention.
- **Create Access Policies:** Add RLS policies in same migration: (1) SELECT policy named "Public read access" with expression `true` allowing all users to read dictionary entries, (2) INSERT/UPDATE/DELETE policies restricted to authenticated users with expression `auth.uid() IS NOT NULL`.
- **Test and Verify:** Apply migration via Supabase MCP tools. Test policies by querying dictionary table as authenticated user (should have full CRUD) and as anonymous user (should have SELECT only). Verify that anonymous INSERT/UPDATE/DELETE attempts are denied.

---

### Task 2.2 – Add RLS policies to new_dictionar_duplicate │ Agent_Backend

- **Objective:** Resolve INFO-level security warning for new_dictionar_duplicate table which has RLS enabled but no policies defined, by either dropping unused table or creating appropriate policies if table is active.
- **Output:** Resolved security warning through migration that either drops unused new_dictionar_duplicate table OR creates RLS policies matching new_dictionar table structure if table is determined to be active and necessary.
- **Guidance:** Investigate first before taking action. Use MCP to query table for data presence and grep codebase for references. Table comment indicates it's a duplicate which suggests it should be dropped. If dropping, ensure no dependencies exist. If keeping, policies must match primary dictionary table.

- **Investigation:** Query new_dictionar_duplicate table contents via Supabase MCP to check if table contains any data rows. Use grep search across codebase (`app/`, `server/`) to find any references to table name in code or queries.
- **Decision Point:** Based on investigation results, determine action: (A) If table is empty and unreferenced (likely case based on "duplicate" comment), create migration to drop table safely. (B) If table contains data or is referenced, create RLS policies instead.
- **Remediation:** Execute chosen solution: Drop migration: `DROP TABLE IF EXISTS public.new_dictionar_duplicate;` OR Policy migration: Create SELECT (public), INSERT/UPDATE/DELETE (authenticated only) policies matching new_dictionar table structure. Apply via MCP and verify warning resolves.

---

### Task 2.3 – Fix security definer view │ Agent_Backend

- **Objective:** Address ERROR-level security issue where public.video_with_comments view uses SECURITY DEFINER property, which enforces view creator's permissions rather than querying user's permissions, creating potential security risk.
- **Output:** Remediated view design with either SECURITY DEFINER removed in favor of RLS policies, or redesigned to use SECURITY INVOKER with proper permission model. Migration applied and view functionality verified to work correctly with new security model.
- **Guidance:** Investigation required to understand current view usage and why SECURITY DEFINER was chosen. Multiple valid remediation paths exist depending on view requirements. Prefer removing SECURITY DEFINER if RLS policies on underlying tables can enforce correct permissions. Verify related function get_video_with_comments also follows secure pattern.

1. **Inspect Current Implementation:** Use Supabase MCP to retrieve full view definition for video_with_comments including SECURITY DEFINER clause. Examine which tables view joins and what permissions are required. Check if associated function get_video_with_comments also has security implications.
2. **Check Active Usage:** Use grep search to find where view is used in application code (`app/`, `server/`). Determine if view is actively queried or if it's legacy code that can be removed. Document usage patterns found.
3. **Design Remediation:** Based on findings, choose solution: (A) Remove SECURITY DEFINER and rely on RLS policies if underlying tables (video_items, comments) have proper RLS, OR (B) Redesign to use SECURITY INVOKER with explicit permission checks, OR (C) Remove view entirely if not actively used and rewrite queries directly.
4. **Apply and Verify:** Create migration implementing chosen solution. Apply via MCP. Test view queries with different user permission levels to verify correct security enforcement. Confirm ERROR-level security advisor warning is resolved.

---

### Task 2.4 – Fix function search_path issues (10 functions) │ Agent_Backend

- **Objective:** Address 10 WARN-level security findings where database functions lack explicit search_path settings, creating potential security vulnerabilities. Apply documented remediation pattern to all affected functions in single migration.
- **Output:** Migration file with ALTER FUNCTION statements for all 10 functions setting explicit search_path to `public, pg_temp`. All functions verified to work correctly post-fix. Security advisor warnings confirmed resolved after re-running checks.
- **Guidance:** Repetitive pattern fix across all functions. Follow Supabase security advisor documentation for exact ALTER FUNCTION syntax. Batch all 10 functions into single migration for efficiency. Verify critical functions (triggers, auth handlers) still operate correctly after search_path restriction.

- **Review Remediation Pattern:** Access Supabase security advisor remediation link to confirm fix pattern: `ALTER FUNCTION function_name() SET search_path = public, pg_temp;`. Understand that this prevents search_path hijacking attacks by explicitly setting allowed schemas.
- **Create Batch Migration:** Generate migration file with ALTER FUNCTION statements for all 10 affected functions: get_video_with_comments, trigger_set_timestamp, handle_new_user_role, set_updated_at, try_cast_uuid, try_cast_timestamptz, search_dictionary_by_topic, search_dictionary_by_script, migrate_dictionary_to_new, handle_updated_at. Include comments in migration identifying which security warning each ALTER resolves.
- **Apply and Test:** Apply migration via Supabase MCP. Test critical functionality that depends on these functions: auth triggers (handle_new_user_role), timestamp triggers (trigger_set_timestamp, set_updated_at, handle_updated_at), dictionary search functions. Verify all work correctly with restricted search_path.
- **Verify Resolution:** Re-run Supabase security advisors check via MCP (`get_advisors` with type `security`). Confirm all 10 function search_path WARN-level findings are now resolved and no longer appear in advisor output.

---

### Task 2.5 – Relocate citext extension │ Agent_Backend

- **Objective:** Address WARN-level security finding by moving citext extension from public schema to dedicated extensions schema, following PostgreSQL and Supabase best practices for extension management.
- **Output:** Migration that relocates citext extension to extensions schema, OR documented manual step for user to execute if migration permissions are insufficient. Verified that profiles table (which uses citext for email/username fields) continues functioning correctly after relocation.
- **Guidance:** Extension management may require elevated permissions not available via MCP migration tools. Prepare for both automatic migration and user-guided fallback scenarios. Critical to verify profiles table functionality as email/username columns depend on citext type. If manual step required, provide clear SQL for user execution.

- **Attempt Automated Migration:** Create migration attempting to relocate extension: `CREATE SCHEMA IF NOT EXISTS extensions; ALTER EXTENSION citext SET SCHEMA extensions;`. Try applying via Supabase MCP tools to see if automated migration is possible with available permissions.
- **Handle Permission Scenario:** If migration succeeds, proceed to verification. If migration fails with permission error, document manual step: Provide user with SQL to execute in Supabase SQL Editor (Dashboard → SQL Editor → New Query) with clear instructions: "Execute this SQL to resolve extension location warning: [SQL statement]". Include explanation of why manual step is needed.
- **Verify Functionality:** After extension relocation (automated or manual), test profiles table operations. Query profiles table via MCP to ensure citext type still works for email and username fields. Try case-insensitive searches to verify citext functionality preserved: `SELECT * FROM profiles WHERE email = 'TEST@EXAMPLE.COM'` should match lowercase email entries.

---

### Task 2.6 – Configure Auth security settings │ Agent_Backend

- **Objective:** Address 2 WARN-level Auth security findings by enabling leaked password protection (HaveIBeenPwned.org integration) and additional MFA options, requiring user-guided configuration in Supabase Dashboard.
- **Output:** User instructions for enabling Auth security features in Supabase Dashboard. User confirms completion of configuration steps. Enhanced auth security active with leaked password checking and expanded MFA options.
- **Guidance:** These settings are only accessible via Supabase Dashboard UI, not via API or MCP, requiring user coordination. Provide clear step-by-step instructions with exact navigation path and toggle locations. Settings enhance security without breaking existing auth flows but should be communicated to user for awareness.

- **Dashboard Navigation:** Guide user with exact path: "Open Supabase Dashboard (supabase.com/dashboard) → Select your project (thai-platform) → Click 'Authentication' in left sidebar → Select 'Security' tab".
- **Enable Leaked Password Protection:** Instruct user: "In Security tab, find 'Leaked Password Protection' section. Enable the toggle. This integrates with HaveIBeenPwned.org database to prevent users from setting commonly compromised passwords. No additional configuration needed - feature activates immediately for new password sets/changes."
- **Configure Additional MFA:** Instruct user: "In Security tab, find 'Multi-Factor Authentication' section. Review currently enabled methods. Enable at least one additional method beyond current configuration: TOTP (Authenticator apps like Google Authenticator), SMS (requires Twilio integration), or WebAuthn (hardware security keys). TOTP recommended as easiest to enable without external dependencies."

---

## Phase 2: Database Security & Optimization Summary
> **Delivered:** Tasks 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 (partial)  
> **Agent:** Agent_Backend  
> **Key Outputs:** 7 database migrations (RLS policies, security definer fix, function search_path hardening, extension relocation, orphaned table cleanup), all ERROR-level security findings resolved, 3 of 5 WARN-level findings resolved  
> **Outstanding:** 2 WARN-level auth findings (leaked password protection, MFA options) blocked by Supabase plan limitation - requires Pro plan ($25/month) upgrade, acceptable for MVP development phase  
> **Security Status:** Database hardened following Supabase/PostgreSQL best practices, MVP security posture acceptable for development/testing

---

Phase 3: Subtitle Editor Rebuild - Agent_SubtitleEditor_Timeline, Agent_SubtitleEditor_Operations

Task 3.1: Timeline base component with time axis - Agent_SubtitleEditor_Timeline
1. Create `~/components/SubtitleTimeline/TimelineBase.vue` with props for duration, subtitles array, and emit events for subtitle selection
2. Implement horizontal timeline SVG/Canvas with time axis rendering (0s, 10s, 20s markers based on zoom level)
3. Add zoom controls (zoom in/out buttons, fit-to-viewport) with reactive zoom state affecting time-to-pixel calculations
4. Implement horizontal scrolling for long timelines with overflow handling
5. Create utility composable `useTimelineCalculations` for bidirectional time↔pixel conversions based on zoom and duration

Task 3.2: Subtitle block rendering and positioning - Agent_SubtitleEditor_Timeline - Depends on Task 3.1 output
Ad-Hoc Delegation – Research Vue drag libraries for best approach (e.g., VueDraggable, vue3-dnd, custom implementation). Optional ref: `ad-hoc/Research_Delegation_Guide.md`
1. Create `SubtitleBlock.vue` component that renders subtitle as horizontal bar positioned using start/end times and timeline calculations
2. Implement drag-to-reposition using mousedown/mousemove/mouseup events or Vue drag library, updating start/end times based on pixel movement
3. Add visual feedback during drag (highlight, snap-to-grid for time alignment)
4. Implement collision detection to prevent overlapping subtitles when dragging, showing warning or auto-adjusting adjacent blocks
5. Emit timing-change events to parent with updated start/end values for data model updates

Task 3.3: Inline editing panel for multi-language text - Agent_SubtitleEditor_Operations
- Create `SubtitleEditPanel.vue` that displays when subtitle block is selected, showing Thai/EN/RU textarea inputs (reuse existing multilingual patterns)
- Add start/end time number inputs with validation (end must be greater than start, no negative values)
- Implement save button that emits updated subtitle data and cancel button that discards changes
- Style with BEM methodology and position panel next to timeline or in dedicated editing area

Task 3.4: Add and delete subtitle operations - Agent_SubtitleEditor_Operations
- Add "New Subtitle" button that creates subtitle object with default duration (5 seconds) at current timeline cursor position or video playback time
- Implement add logic that inserts new subtitle into array maintaining chronological order by start time
- Add delete button (icon or keyboard shortcut Ctrl+D) for selected subtitle with confirmation if subtitle has content
- Implement delete logic that removes subtitle from array and clears selection state

Task 3.5: Split and merge operations with keyboard shortcuts - Agent_SubtitleEditor_Operations
1. Implement split operation: when Ctrl+Shift+S pressed or split button clicked, divide selected subtitle at current timeline cursor position into two subtitles (first: start to cursor, second: cursor to end)
2. Distribute text between split subtitles (user can adjust after split or implement smart text splitting by sentence/word boundaries)
3. Implement merge operation: when Ctrl+M pressed or merge button clicked, combine selected subtitle with adjacent subtitle (next by default), concatenating text and extending time range
4. Add keyboard event listener composable (similar to useVideoKeyboard) for Ctrl+Shift+S and Ctrl+M shortcuts with visual feedback when operations execute

Task 3.6: Video playback synchronization - Agent_SubtitleEditor_Timeline - Depends on Task 3.1 output
- Render playback cursor as vertical line on timeline using current video time position (subscribe to video timeupdate event)
- Update cursor position reactively during playback using time-to-pixel calculations from Task 3.1
- Implement click-on-timeline to seek video: calculate time from click pixel position and call video.currentTime setter
- Auto-scroll timeline viewport to keep playback cursor visible during playback

Task 3.7: Auto-save functionality - Agent_SubtitleEditor_Operations
- Set up Vue watch on subtitles array with deep: true option and 2-second debounce (use lodash debounce or custom timeout)
- Emit 'update:modelValue' event to parent component (SubtitleEditor container) when debounce fires
- Add save status indicator (small text showing "Saving..." during debounce, "Saved" after emit, using existing Toast patterns optional)

Task 3.8: Replace existing SubtitleEditor component - Agent_SubtitleEditor_Operations - Depends on Task 3.1, 3.2, 3.6 outputs by Agent_SubtitleEditor_Timeline and Task 3.3, 3.4, 3.5, 3.7 outputs
- Verify new timeline editor accepts same props as old SubtitleEditor (modelValue subtitles array) and emits same events (update:modelValue)
- Replace `SubtitleEditor.vue` with new timeline-based implementation or rename old to `SubtitleEditorTable.vue` (archive) and create new `SubtitleEditor.vue` wrapper routing to timeline version
- Update any pages using SubtitleEditor (videos/add-new, lessons/add-new) and verify timeline editor works in production context

Phase 4: Exercise Feature Enhancements - Agent_UIEnhancements

Task 4.1: Reset exercise functionality - Agent_UIEnhancements
- Add "Reset Exercise" button (UIButton) in SubtitleClickExercise component header with confirmation modal before reset
- Implement reset logic: clear localStorage key `click-exercise-progress-${videoId}`, reset currentStepIndex to 0, clear completedSentences set, reset history array
- Reshuffle availableWords for current sentence and emit range-change event to restart video from first subtitle

Task 4.2: Successful sentences history display - Agent_UIEnhancements
- Create collapsible "Completed Sentences" panel in SubtitleClickExercise using Nuxt UI UAccordion or custom toggle
- Render history list showing each successfully completed sentence: sentence text (Thai), completion timestamp, user's word sequence
- Style list items with BEM methodology, showing success indicators (checkmarks, green highlights)
- Panel displays only sentences where `isCorrect: true` from history array, updates reactively as user completes sentences

Task 4.3: Final exercise result screen - Agent_UIEnhancements
- Trigger result screen overlay when currentStepIndex reaches last sentence and final sentence is completed successfully
- Display statistics: total sentences completed, total time taken (session duration), success indicators (all green checkmarks)
- Add action buttons: "Restart Exercise" (calls reset logic from Task 4.1), "Return to Video" (navigates back to video page)
- Style as centered modal overlay with celebration design (confetti animation optional), BEM methodology

Phase 5: Video Upload Improvements - Agent_VideoManagement

Task 5.1: File validation for video uploads - Agent_VideoManagement
- Add file type validation in FileUploadWithProgress: accept only video/* MIME types (mp4, webm, mov, avi)
- Implement file size validation: warn if file exceeds reasonable limit (e.g., 500MB for MVP, plan for future configurable limits)
- Add duration check using video element: load file temporarily to read metadata.duration before upload
- Display validation errors using Nuxt UI toast or inline error message, prevent upload if validation fails

Task 5.2: Thumbnail generation from uploaded video - Agent_VideoManagement - Depends on Task 5.1 output
1. After video file upload, create video element and load uploaded file to extract frame at 2-second mark using canvas.drawImage()
2. Convert canvas content to blob (image/jpeg or image/png) with quality optimization
3. Upload thumbnail blob to Supabase Storage bucket (same bucket as videos or dedicated thumbnails bucket) using Storage API
4. Save returned Storage URL to preview_url field in video_items or lesson_items table during video record creation

Task 5.3: Upload progress indicator refinement - Agent_VideoManagement
- Add percentage display to existing progress indicator (e.g., "Uploading: 45%")
- Calculate and display estimated time remaining based on upload speed (bytes per second)
- Add cancel upload button (if not already present) that aborts upload and cleans up partial files
- Enhance visual design with progress bar animation, success/error states with icons, BEM styling consistency

Phase 6: Dictionary UI Fixes - Agent_UIEnhancements

Task 6.1: Fix dictionary card viewport positioning - Agent_UIEnhancements
1. Investigate current InteractiveWord/dictionary card positioning logic to identify why cards appear off-screen
2. Implement viewport boundary detection using getBoundingClientRect() to check if card would overflow viewport edges
3. Add dynamic positioning logic: if card overflows bottom, position above trigger; if overflows right, position left; handle corner cases
4. Test positioning at different viewport sizes and scroll positions, ensuring cards always visible
5. Add mobile-specific positioning handling (smaller screens, touch targets) and ensure cards don't cover trigger word

