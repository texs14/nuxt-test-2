import { ref, readonly, type Ref } from 'vue';
import { useSupabaseClient, useSupabaseUser, useToast, useI18n } from '#imports';
import type { Database } from '~~/types/supabase';
import { useUserRole } from '~/composables/useUserRole';

/**
 * Available status values for video items.
 */
type VideoStatus = Database['public']['Tables']['video_items']['Row']['status'];

type MaybeStatus = VideoStatus | null | undefined;

interface VideoApprovalMessages {
  success: string;
  genericError: string;
  unauthorized: string;
  invalidStatus: string;
  alreadyApproved: string;
  notFound: string;
  rejected: string;
  alreadyRejected: string;
}

export interface VideoApprovalResult {
  id: string;
  status: VideoStatus;
  updated_at: string | null;
}

export interface UseVideoApprovalOptions {
  /** Reactive reference to keep status in sync with approval result. */
  statusRef?: Ref<MaybeStatus>;
  /** Post-success hook invoked after optimistic state updates complete. */
  onApproved?: (result: VideoApprovalResult) => void | Promise<void>;
  /** Optional callback executed after a successful rejection */
  onRejected?: (result: VideoApprovalResult) => void | Promise<void>;
  /** Override toast and error copy when integrating in different contexts. */
  toastMessages?: Partial<VideoApprovalMessages>;
}

interface UpdateResponse {
  data: VideoApprovalResult | null;
  error: { message?: string } | null;
}

const APPROVAL_COLUMNS = 'id, status, updated_at';
const FALLBACK_COLUMNS = 'id, status, updated_at';

function isApprovalMetadataError(err: { message?: string } | null): boolean {
  if (!err?.message) return false;
  return /approved_(at|by)/i.test(err.message);
}

/**
 * Centralises admin/moderator approval logic for video items.
 *
 * @example
 * ```ts
 * const { approveVideo, isApproving, approvalError } = useVideoApproval({
 *   statusRef: mediaItem.status,
 *   onApproved: () => refreshList(),
 * });
 *
 * await approveVideo(videoId, mediaItem.status.value);
 * ```
 */
export function useVideoApproval(options: UseVideoApprovalOptions = {}) {
  const { statusRef, onApproved, onRejected, toastMessages } = options;

  const { t } = useI18n();
  const toast = useToast();
  const supabase = useSupabaseClient<Database>();
  const supabaseUser = useSupabaseUser();
  const { canModerate } = useUserRole();

  const isApproving = ref(false);
  const approvalError = ref('');
  const approvalSuccess = ref(false);
  const lastResult = ref<VideoApprovalResult | null>(null);

  const defaultMessages: VideoApprovalMessages = {
    success: t('videos.addNew.approveSuccess'),
    genericError: t('videos.addNew.saveError', 'Failed to approve video'),
    unauthorized: t('common.errors.forbidden', 'You do not have permission to approve this video'),
    invalidStatus: t('videos.status.moderation', 'Video must be in moderation status to approve'),
    alreadyApproved: t('videos.status.approved', 'Video has already been approved'),
    notFound: t('videos.addNew.loadError', 'Video entry not found'),
    rejected: t('videos.status.rejected', 'Video rejected'),
    alreadyRejected: t('videos.status.rejected', 'Video has already been rejected'),
  };

  const messages: VideoApprovalMessages = {
    success: toastMessages?.success || defaultMessages.success,
    genericError: toastMessages?.genericError || defaultMessages.genericError,
    unauthorized: toastMessages?.unauthorized || defaultMessages.unauthorized,
    invalidStatus: toastMessages?.invalidStatus || defaultMessages.invalidStatus,
    alreadyApproved: toastMessages?.alreadyApproved || defaultMessages.alreadyApproved,
    notFound: toastMessages?.notFound || defaultMessages.notFound,
    rejected: toastMessages?.rejected || defaultMessages.rejected,
    alreadyRejected: toastMessages?.alreadyRejected || defaultMessages.alreadyRejected,
  };

  const reset = () => {
    approvalError.value = '';
    approvalSuccess.value = false;
    lastResult.value = null;
  };

  const runUpdate = async (
    videoId: string,
    payload: Record<string, any>,
    columns: string
  ): Promise<UpdateResponse> => {
    return supabase
      .from('video_items')
      .update(payload)
      .eq('id', videoId)
      .eq('status', 'moderation')
      .select(columns)
      .maybeSingle();
  };

  const approveVideo = async (
    videoId: string,
    currentStatus?: MaybeStatus
  ): Promise<boolean> => {
    if (!videoId) {
      approvalError.value = messages.notFound;
      return false;
    }

    if (!canModerate.value) {
      approvalError.value = messages.unauthorized;
      toast.add({ title: messages.genericError, description: messages.unauthorized, color: 'red' });
      return false;
    }

    const effectiveStatus = currentStatus ?? statusRef?.value ?? null;
    if (effectiveStatus && effectiveStatus !== 'moderation') {
      approvalError.value = effectiveStatus === 'approved' ? messages.alreadyApproved : messages.invalidStatus;
      toast.add({
        title: messages.genericError,
        description: approvalError.value,
        color: 'orange',
      });
      return false;
    }

    if (isApproving.value) {
      return false;
    }

    isApproving.value = true;
    approvalError.value = '';
    approvalSuccess.value = false;

    const nowIso = new Date().toISOString();
    const approverId = supabaseUser.value?.id || null;

    const basePayload: Record<string, any> = {
      status: 'approved',
      updated_at: nowIso,
    };

    let response = await runUpdate(videoId, basePayload, APPROVAL_COLUMNS);

    if (response.error && isApprovalMetadataError(response.error)) {
      response = await runUpdate(videoId, { status: 'approved', updated_at: nowIso }, FALLBACK_COLUMNS);
    }

    if (response.error) {
      const errorMessage = response.error.message || messages.genericError;
      approvalError.value = errorMessage;
      toast.add({ title: messages.genericError, description: errorMessage, color: 'red' });
      isApproving.value = false;
      return false;
    }

    if (!response.data) {
      approvalError.value = effectiveStatus === 'approved' ? messages.alreadyApproved : messages.notFound;
      toast.add({ title: messages.genericError, description: approvalError.value, color: 'red' });
      isApproving.value = false;
      return false;
    }

    lastResult.value = response.data;
    approvalSuccess.value = true;
    toast.add({ title: messages.success, color: 'green' });

    if (statusRef) {
      statusRef.value = 'approved';
    }

    try {
      await onApproved?.(response.data);
    } catch (callbackError) {
      console.error('useVideoApproval onApproved callback failed:', callbackError);
    }

    isApproving.value = false;
    return true;
  };

  const rejectVideo = async (
    videoId: string,
    currentStatus?: MaybeStatus
  ): Promise<boolean> => {
    if (!videoId) {
      approvalError.value = messages.notFound;
      return false;
    }

    if (!canModerate.value) {
      approvalError.value = messages.unauthorized;
      toast.add({ title: messages.genericError, description: messages.unauthorized, color: 'red' });
      return false;
    }

    const effectiveStatus = currentStatus ?? statusRef?.value ?? null;
    if (effectiveStatus && effectiveStatus !== 'moderation') {
      approvalError.value = effectiveStatus === 'rejected' ? messages.alreadyRejected : messages.invalidStatus;
      toast.add({ title: messages.genericError, description: approvalError.value, color: 'orange' });
      return false;
    }

    if (isApproving.value) {
      return false;
    }

    isApproving.value = true;
    approvalError.value = '';
    approvalSuccess.value = false;

    try {
      const { data, error } = await supabase
        .from('video_items')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', videoId)
        .eq('status', 'moderation')
        .select('id, status, updated_at')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        approvalError.value = messages.notFound;
        toast.add({ title: messages.genericError, description: messages.notFound, color: 'red' });
        return false;
      }

      lastResult.value = data;
      toast.add({ title: messages.rejected, color: 'orange' });

      if (statusRef) {
        statusRef.value = 'rejected';
      }

      await onRejected?.(data);
      return true;
    } catch (err: any) {
      const message = err?.message || messages.genericError;
      approvalError.value = message;
      toast.add({ title: messages.genericError, description: message, color: 'red' });
      return false;
    } finally {
      isApproving.value = false;
    }
  };

  return {
    approveVideo,
    rejectVideo,
    reset,
    isApproving: readonly(isApproving),
    approvalError: readonly(approvalError),
    approvalSuccess: readonly(approvalSuccess),
    lastResult: readonly(lastResult),
  };
}
