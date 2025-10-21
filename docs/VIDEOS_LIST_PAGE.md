# Videos Listing Page (`app/pages/videos/index.vue`)

## Responsibilities
- **Render localized metadata**: Title, page title, description, loading, and error messages come from `useI18n()` keys (e.g., `videos.title`).
- **List video catalogue entries**: Delegates visual rendering to `ContentListPage` while the page supplies data and state flags.
- **Bridge navigation flows**: Supplies `routePrefix="/videos/"` so cards route to `app/pages/videos/[id].vue` and exposes an "Add" CTA for moderators via `addNewLink`.

## Data Flow & Fetching Strategy
- **Source**: `useSupabaseCrud({ table: 'video_items' })` wraps Supabase queries against the `video_items` table defined in `types/supabase.ts`.
- **Client-only execution**: `useLazyAsyncData('video-items', async () => {...})` runs on the client to ensure the Supabase session token is included for RLS policies.
- **Projection**: Requests `id, title, description, level, preview_url, duration, status` and maps rows to the shared `VideoItem` interface from `app/types/content.ts` to keep content cards schema-aligned.
- **Sorting**: Orders ascending by `id`. RLS filters status per user role (regular users receive only `approved` entries, moderators see all statuses).

## State Management
- **Pending flag**: `pending = asyncPending || crudLoading` merges Nuxt async state with composable loading so the page stays reactive during prefetch and manual refetch scenarios.
- **Error aggregation**: Wraps `asyncError` and `crudError` into a unified `Error | null` instance. `ContentListPage` reads it to format the human message via the `errorMessagePrefix` prop.
- **Items exposure**: The resolved `items` ref is passed straight to `<ContentListPage />`, which expects `BaseContentItem[]` and handles empty states internally.

## Component Composition
- **`ContentListPage`**: Provides header actions, intro copy, loading/error/empty placeholders, and a grid of `ContentCard` tiles. It internally uses `useLocalizedContent()` and `useUserRole()`.
- **CTA wiring**: `addNewLink` is derived through `useSafeLocalePath({ name: 'videos-add-new' })`; this avoids router initialization errors on hydration. The prop `add-new-button-text` surfaces the localized label.

## Role & Permission Touchpoints
- **`useUserRole()`**: Exposed on the page (currently unused directly). `ContentListPage` checks `canModerate` to decide whether to show the "Add" action, aligning with moderation workflows.
- **RLS alignment**: Because fetching happens client-side with the authenticated Supabase session, the server enforces which `status` values each user receives. No additional client filtering is required.

## Localization & Routing
- **Locale-aware URLs**: `useSafeLocalePath()` wraps `useLocalePath()` to guard against runtime errors during hydration; every navigation link (`routePrefix`, `addNewLink`) respects the active locale.
- **Copy keys**: All textual content draws from `locales/*.json`, keeping the page fully translatable.

## Error Handling Principles
- **Graceful fallback**: If Supabase returns `null`, the page throws an `Error` with either `crudError.value` or a generic message so `useLazyAsyncData` moves into the error state.
- **Display strategy**: `ContentListPage` concatenates the `errorMessagePrefix` (e.g., `t('videos.error')`) with the actual `Error.message`, giving users contextual feedback.

## Extension Points & Considerations
- **Filtering & search**: Additional filters can be passed to `select(filters, options)` without altering the page skeleton; consider exposing UI controls that call `refresh()` on the lazy async data.
- **Pagination**: `useSupabaseCrud` already supports `limit` and `offset`. Introduce them in the `select` options when scaling the catalogue.
- **Moderator tooling**: The computed `canModerate` on the page can be reused for guard logic (e.g., hiding `status` chips) if future requirements arise.
- **Server-side SEO**: Current client-only fetch is required for RLS. If server-side pre-render becomes necessary, explore Supabase service-role tokens or cached middle-tier endpoints while preserving RLS compliance.

## Related Assets
- **`app/components/ContentListPage.vue`**: Layout and state presentation for catalogue pages.
- **`docs/SUPABASE_CRUD_USAGE.md`**: Shared CRUD composable usage patterns.
- **`docs/VIDEO_PLAYER_STRUCTURE.md` & `app/pages/videos/[id].vue`**: Downstream detail pages that consume the links emitted from this list.
