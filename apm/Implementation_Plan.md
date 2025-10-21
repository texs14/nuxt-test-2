Phase 1: Video Deletion System - Agent_Backend, Agent_VideoManagement

Task 1.1: Server API for atomic video deletion - Agent_Backend
1. Set up Supabase Storage client and import necessary MCP tools
2. Create POST endpoint at `/server/api/videos/delete.post.ts` that accepts `{ id: string, type: 'video' | 'lesson' }`
3. Extract video_url/preview_url from DB record to get Storage file paths
4. Delete files from Storage bucket using extracted paths (handle "file not found" gracefully)
5. Delete DB row from appropriate table (video_items or lesson_items) only if Storage deletion succeeded

Task 1.2: Confirmation modal component - Agent_VideoManagement - Depends on Task 1.1 output by Agent_Backend
- Create `~/components/modals/DeleteConfirmationModal.vue` using Nuxt UI `UModal` component with props for title, message, confirmText, cancelText
- Implement confirm/cancel event emissions and loading state for confirm action
- Style with BEM methodology following existing modal patterns in codebase

Task 1.3: Integrate deletion in video list - Agent_VideoManagement - Depends on Task 1.2 output
- Add delete button (UIButton with danger variant) to each video item in `/pages/videos/index.vue`
- Integrate `DeleteConfirmationModal` with video title/ID state management
- Call `/api/videos/delete` endpoint on confirmation, handle loading state
- Display success toast and refresh video list on successful deletion, show error toast on failure

Task 1.4: Integrate deletion in lesson list - Agent_VideoManagement - Depends on Task 1.2 output
- Add delete button (UIButton with danger variant) to each lesson item in `/pages/lessons/index.vue`
- Integrate `DeleteConfirmationModal` with lesson title/ID state management
- Call `/api/videos/delete` endpoint with `type: 'lesson'` on confirmation, handle loading state
- Display success toast and refresh lesson list on successful deletion, show error toast on failure

Phase 2: Database Security & Optimization - Agent_Backend

Task 2.1: Enable RLS on dictionary table - Agent_Backend
- Create migration to enable RLS on public.dictionary table using `ALTER TABLE dictionary ENABLE ROW LEVEL SECURITY;`
- Add policies for authenticated users: SELECT policy for public read access, INSERT/UPDATE/DELETE policies restricted to authenticated users
- Test policies by querying dictionary table as authenticated and anonymous users via MCP

Task 2.2: Add RLS policies to new_dictionar_duplicate - Agent_Backend
- Query new_dictionar_duplicate table via MCP to check if it contains data or is referenced by application code
- If table is unused (comment says "duplicate"), create migration to drop it and resolve the warning
- If table is active, create RLS policies matching those from new_dictionar table (SELECT for public, authenticated-only for mutations)

Task 2.3: Fix security definer view - Agent_Backend
1. Inspect video_with_comments view definition and identify why SECURITY DEFINER is used
2. Check if view/function is actively used in application code via grep search
3. Determine remediation: either remove SECURITY DEFINER and rely on RLS policies, or redesign to use SECURITY INVOKER with proper permissions
4. Apply chosen solution via migration and verify view access patterns work correctly

Task 2.4: Fix function search_path issues (10 functions) - Agent_Backend
- Review Supabase security advisor remediation link for search_path fix pattern: `ALTER FUNCTION function_name() SET search_path = public, pg_temp;`
- Create migration with ALTER statements for all 10 affected functions: get_video_with_comments, trigger_set_timestamp, handle_new_user_role, set_updated_at, try_cast_uuid, try_cast_timestamptz, search_dictionary_by_topic, search_dictionary_by_script, migrate_dictionary_to_new, handle_updated_at
- Apply migration via MCP and verify functions still work correctly
- Re-run security advisors check to confirm all function search_path warnings resolved

Task 2.5: Relocate citext extension - Agent_Backend
- Attempt to create migration that moves citext extension: `CREATE SCHEMA IF NOT EXISTS extensions; ALTER EXTENSION citext SET SCHEMA extensions;`
- If migration fails due to permissions, document the manual step for user to execute in Supabase SQL Editor
- Verify profiles table (which uses citext for email/username) still functions correctly after relocation

Task 2.6: Configure Auth security settings - Agent_Backend
- Guide user to Supabase Dashboard → Project Settings → Authentication → Security tab
- Instruct user to enable "Leaked Password Protection" toggle (integrates HaveIBeenPwned.org checking)
- Instruct user to review MFA options and enable at least one additional method (TOTP, SMS, or WebAuthn) beyond current configuration

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

