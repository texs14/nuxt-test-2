---
task_ref: "Task 1.3"
task_name: "Integrate Deletion in Video List"
agent: "Agent_VideoManagement"
phase: "Phase_01_Video_Deletion_System"
status: "completed"
created: "2025-10-21"
completed: "2025-10-21"
dependencies:
  - "Task_1_1_API_Endpoint"
  - "Task_1_2_Confirmation_Modal_Component"
files_modified:
  - "app/pages/videos/index.vue"
---

# Task 1.3 - Integrate Deletion in Video List

## Objective
Integrate complete video deletion workflow into videos list page, connecting delete button UI, confirmation modal, API endpoint, and user feedback mechanisms for seamless deletion experience.

## Implementation Summary

### Modified Files
- **app/pages/videos/index.vue**: Complete rewrite to replace `ContentListPage` wrapper with custom implementation supporting delete functionality

### Key Changes

#### 1. Custom Page Implementation
Replaced `ContentListPage` component usage with direct implementation to support video card actions:
- Renders video cards directly with embedded card styles
- Added `video-card-wrapper` container for each video item
- Positioned delete button below each video card in actions section

#### 2. Delete Button Integration
- **Component**: UIButton with `variant="danger"` and `size="sm"`
- **Visibility**: Only shown to moderators (`v-if="canModerate"`)
- **Position**: Below video card in `video-card-wrapper__actions` flex container
- **Behavior**: Opens confirmation modal with selected video data on click

#### 3. Modal Integration
- **Component**: `DeleteConfirmationModal` imported and rendered at page level
- **State Management**:
  - `showDeleteModal` (ref): Controls modal visibility
  - `selectedVideo` (ref): Stores `{ id: string, title: string }` of video to delete
  - `isDeleting` (ref): Tracks deletion in progress state
- **Modal Props**:
  - `v-model:open="showDeleteModal"`: Two-way binding for visibility
  - `title="Delete Video"`: Static modal title
  - `:message="deleteMessage"`: Computed message with video title
  - `:loading="isDeleting"`: Loading state during API call
- **Event Handlers**:
  - `@confirm="handleDeleteConfirm"`: Triggers deletion API call
  - `@cancel="handleDeleteCancel"`: Closes modal and resets state

#### 4. API Call Logic
**Function**: `handleDeleteConfirm()`
- Uses `$fetch` for API call (Nuxt 3 pattern)
- **Endpoint**: `POST /api/videos/delete`
- **Payload**: `{ id: selectedVideo.value.id, type: 'video' }`
- **Loading State**: Sets `isDeleting = true` before call, `false` in finally block
- **Success Flow**:
  - Shows success toast with API response message
  - Closes modal (`showDeleteModal = false`)
  - Resets selected video (`selectedVideo = null`)
  - Refreshes video list using `refresh()` from `useLazyAsyncData`
- **Error Flow**:
  - Shows error toast with error message from response or exception
  - Keeps modal open for retry
  - Resets loading state

#### 5. User Feedback
**Toast Notifications** using `useToast()` composable:
- **Success**: Green toast with API message or "Video deleted successfully"
- **API Error**: Red toast with `response.error || response.message`
- **Network Error**: Red toast with exception message or "Network error occurred"

**Visual Feedback**:
- Modal shows loading spinner during deletion
- Modal buttons disabled during deletion
- Modal cannot be dismissed during deletion

#### 6. List Refresh
**Strategy**: Re-fetch from database using `refresh()` function
- Preserves RLS policies (moderators see all, users see approved only)
- Updates UI immediately after successful deletion
- Maintains current sort order and filters

#### 7. Error Handling
Comprehensive error handling for all scenarios:
- **Network errors**: Caught in try-catch, shows generic error toast
- **Validation errors** (400): Shown via API response.error
- **Not found errors** (404): Shown via API response.error
- **Server errors** (500): Shown via API response.error
- **API response errors**: Checked via `response.ok` flag

### Technical Implementation Details

#### State Management
```typescript
const showDeleteModal = ref(false);
const selectedVideo = ref<{ id: string; title: string } | null>(null);
const isDeleting = ref(false);
```

#### Computed Message
```typescript
const deleteMessage = computed(() => {
  if (!selectedVideo.value) return '';
  return `Are you sure you want to delete '${getLocalizedValue(selectedVideo.value.title)}'? This action cannot be undone.`;
});
```

#### Modal Workflow Functions
```typescript
function openDeleteModal(item: VideoItem) {
  selectedVideo.value = { id: item.id, title: item.title };
  showDeleteModal.value = true;
}

function handleDeleteCancel() {
  showDeleteModal.value = false;
  selectedVideo.value = null;
}
```

#### Deletion Handler
```typescript
async function handleDeleteConfirm() {
  if (!selectedVideo.value) return;
  isDeleting.value = true;
  
  try {
    const response = await $fetch('/api/videos/delete', {
      method: 'POST',
      body: { id: selectedVideo.value.id, type: 'video' },
    });

    if (response.ok) {
      toast.add({
        title: 'Success',
        description: response.message || 'Video deleted successfully',
        color: 'green',
      });
      showDeleteModal.value = false;
      selectedVideo.value = null;
      await refresh();
    } else {
      toast.add({
        title: 'Error',
        description: response.error || response.message || 'Failed to delete video',
        color: 'red',
      });
    }
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err.message || 'Network error occurred',
      color: 'red',
    });
  } finally {
    isDeleting.value = false;
  }
}
```

#### Styling
- **BEM Methodology**: All classes follow BEM pattern (`.video-card-wrapper__actions`)
- **Responsive Layout**: Video cards use CSS Grid via content-page layout
- **Action Positioning**: Flex layout with `justify-content: flex-end` for right-aligned button
- **Dark Mode Support**: Included dark mode styles for content card

### Integration with Dependencies

#### Task 1.1 - API Endpoint
- **Endpoint**: `POST /api/videos/delete`
- **Request Format**: `{ id: string, type: 'video' }`
- **Response Format**: `{ ok: boolean, message: string, error?: string }`
- **Error Handling**: Checks `response.ok` flag and displays appropriate messages

#### Task 1.2 - Confirmation Modal
- **Component Path**: `app/components/modals/DeleteConfirmationModal.vue`
- **Props Used**: `v-model:open`, `title`, `message`, `loading`
- **Events Used**: `@confirm`, `@cancel`
- **Pattern**: Two-way binding with loading state management

### Testing Checklist
- [x] Delete button appears only for moderators
- [x] Clicking delete opens modal with video title
- [x] Modal shows loading state during API call
- [x] Successful deletion shows success toast
- [x] Successful deletion refreshes video list
- [x] Failed deletion shows error toast
- [x] Failed deletion keeps modal open
- [x] Network errors handled gracefully
- [x] Modal cannot be dismissed during loading
- [x] Video list updates immediately after deletion

## Success Criteria Met
✅ Delete button appears on each video item with danger styling  
✅ Clicking delete opens confirmation modal with video title  
✅ Modal shows loading state during API call (buttons disabled, spinner visible)  
✅ Successful deletion shows success toast and refreshes list  
✅ Errors show error toast with descriptive message  
✅ Video list updates immediately after deletion  
✅ User cannot interact with modal during loading  

## Notes
- **Architecture Decision**: Replaced `ContentListPage` wrapper with custom implementation for better control over card actions
- **Styling Approach**: Copied ContentCard component styles directly into page to maintain consistent appearance
- **Refresh Strategy**: Uses `refresh()` from `useLazyAsyncData` to re-fetch data, preserving RLS policies
- **UX Consideration**: Modal stays open on error to allow user to retry without re-selecting video
- **Localization**: Video title in delete message uses `getLocalizedValue()` for i18n support

## Related Tasks
- **Task 1.1**: Provides deletion API endpoint
- **Task 1.2**: Provides reusable confirmation modal component
- **Future**: Similar pattern can be applied to lessons list page
