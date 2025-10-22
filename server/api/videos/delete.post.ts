import { createClient } from '@supabase/supabase-js';
import { defineEventHandler, readBody, setHeaders, setResponseStatus } from 'h3';
import { useRuntimeConfig } from '#imports';

interface DeleteVideoRequest {
  id: string;
  type: 'video' | 'lesson';
}

interface DeleteVideoResponse {
  ok: boolean;
  message: string;
  deleted?: {
    files: string[];
    record: string;
  };
  error?: string;
}

export default defineEventHandler(async (event): Promise<DeleteVideoResponse> => {
  try {
    const body = await readBody<DeleteVideoRequest>(event);

    // Validate request body
    if (!body || typeof body !== 'object') {
      setResponseStatus(event, 400);
      return {
        ok: false,
        message: 'Invalid request body',
        error: 'Request body must be an object',
      };
    }

    if (!body.id || typeof body.id !== 'string') {
      setResponseStatus(event, 400);
      return {
        ok: false,
        message: 'Invalid or missing id',
        error: 'id must be a non-empty string',
      };
    }

    if (!body.type || !['video', 'lesson'].includes(body.type)) {
      setResponseStatus(event, 400);
      return {
        ok: false,
        message: 'Invalid type parameter',
        error: 'type must be either "video" or "lesson"',
      };
    }

    // Initialize Supabase client
    const config = useRuntimeConfig();
    const supabaseUrl = config.public?.supabase?.url;
    const supabaseKey = (config as any).supabaseServiceKey || config.public?.supabase?.key;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 3: Extract file paths from database
    const tableName = body.type === 'video' ? 'video_items' : 'lesson_items';

    // Query database for video_url and preview_url
    const { data: record, error: fetchError } = await supabase
      .from(tableName)
      .select('id, video_url, preview_url')
      .eq('id', body.id)
      .maybeSingle();

    if (fetchError) {
      console.error(`Database fetch error for ${tableName}:`, fetchError);
      setResponseStatus(event, 500);
      setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
      return {
        ok: false,
        message: 'Failed to fetch record from database',
        error: fetchError.message,
      };
    }

    if (!record) {
      setResponseStatus(event, 404);
      setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
      return {
        ok: false,
        message: `Record not found in ${tableName}`,
        error: `No ${body.type} found with id: ${body.id}`,
      };
    }

    // Parse Storage file paths from URLs
    const extractStoragePath = (url: string | null): { bucket: string; path: string } | null => {
      if (!url || typeof url !== 'string') {
        return null;
      }

      try {
        // Pattern: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
        // Or: https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{path}
        const storageMatch = url.match(/\/storage\/v1\/object\/(public|sign)\/([^/]+)\/(.+)/);

        if (storageMatch) {
          const bucket = storageMatch[2];
          const path = storageMatch[3];
          return { bucket, path };
        }

        // Fallback: Try to extract from different URL patterns
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const storageIndex = pathParts.indexOf('storage');

        if (storageIndex !== -1 && pathParts.length > storageIndex + 4) {
          const bucket = pathParts[storageIndex + 4];
          const path = pathParts.slice(storageIndex + 5).join('/');
          return { bucket, path };
        }

        console.warn('Could not parse storage path from URL:', url);
        return null;
      } catch (err) {
        console.error('Error parsing URL:', url, err);
        return null;
      }
    };

    const videoStoragePath = extractStoragePath(record.video_url);
    const previewStoragePath = extractStoragePath(record.preview_url);

    console.log('Extracted storage paths:', {
      video: videoStoragePath,
      preview: previewStoragePath,
    });

    // Step 4: Delete Storage files
    const deletedFiles: string[] = [];
    const deletionErrors: string[] = [];
    let criticalStorageError = false;

    // Delete video file
    if (videoStoragePath) {
      try {
        console.log(
          `Attempting to delete video file: ${videoStoragePath.bucket}/${videoStoragePath.path}`
        );

        const { data: videoDeleteData, error: videoDeleteError } = await supabase.storage
          .from(videoStoragePath.bucket)
          .remove([videoStoragePath.path]);

        if (videoDeleteError) {
          // Check if it's a "file not found" error (graceful handling)
          if (
            videoDeleteError.message?.includes('not found') ||
            videoDeleteError.message?.includes('does not exist')
          ) {
            console.warn(`Video file not found (may be already deleted): ${videoStoragePath.path}`);
            deletionErrors.push(`Video file not found: ${videoStoragePath.path}`);
          } else {
            // Critical error (permission/network)
            console.error('Critical error deleting video file:', videoDeleteError);
            criticalStorageError = true;
            deletionErrors.push(`Failed to delete video: ${videoDeleteError.message}`);
          }
        } else {
          console.log('Video file deleted successfully:', videoStoragePath.path);
          deletedFiles.push(`${videoStoragePath.bucket}/${videoStoragePath.path}`);
        }
      } catch (err: any) {
        console.error('Exception deleting video file:', err);
        criticalStorageError = true;
        deletionErrors.push(`Exception deleting video: ${err.message}`);
      }
    } else {
      console.log('No valid video storage path to delete');
      deletionErrors.push('video_url: null or malformed');
    }

    // Delete preview file
    if (previewStoragePath) {
      try {
        console.log(
          `Attempting to delete preview file: ${previewStoragePath.bucket}/${previewStoragePath.path}`
        );

        const { data: previewDeleteData, error: previewDeleteError } = await supabase.storage
          .from(previewStoragePath.bucket)
          .remove([previewStoragePath.path]);

        if (previewDeleteError) {
          // Check if it's a "file not found" error (graceful handling)
          if (
            previewDeleteError.message?.includes('not found') ||
            previewDeleteError.message?.includes('does not exist')
          ) {
            console.warn(
              `Preview file not found (may be already deleted): ${previewStoragePath.path}`
            );
            deletionErrors.push(`Preview file not found: ${previewStoragePath.path}`);
          } else {
            // Critical error (permission/network)
            console.error('Critical error deleting preview file:', previewDeleteError);
            criticalStorageError = true;
            deletionErrors.push(`Failed to delete preview: ${previewDeleteError.message}`);
          }
        } else {
          console.log('Preview file deleted successfully:', previewStoragePath.path);
          deletedFiles.push(`${previewStoragePath.bucket}/${previewStoragePath.path}`);
        }
      } catch (err: any) {
        console.error('Exception deleting preview file:', err);
        criticalStorageError = true;
        deletionErrors.push(`Exception deleting preview: ${err.message}`);
      }
    } else {
      console.log('No valid preview storage path to delete');
      deletionErrors.push('preview_url: null or malformed');
    }

    // If critical storage error occurred, do NOT proceed to database deletion
    if (criticalStorageError) {
      setResponseStatus(event, 500);
      setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
      return {
        ok: false,
        message:
          'Critical storage deletion error - database record NOT deleted to maintain integrity',
        error: deletionErrors.join('; '),
      };
    }

    console.log('Storage deletion summary:', {
      deleted: deletedFiles,
      errors: deletionErrors,
      criticalError: criticalStorageError,
    });

    // Step 5: Delete database record (only if storage deletion succeeded or files don't exist)
    console.log(`Attempting to delete database record from ${tableName}: ${body.id}`);

    const { error: dbDeleteError } = await supabase.from(tableName).delete().eq('id', body.id);

    if (dbDeleteError) {
      console.error('Database deletion error:', dbDeleteError);
      setResponseStatus(event, 500);
      setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
      return {
        ok: false,
        message: 'Storage files deleted but database record deletion failed',
        error: `Database error: ${dbDeleteError.message}. Storage files deleted: ${deletedFiles.join(', ')}`,
      };
    }

    console.log(`Database record deleted successfully: ${tableName}.${body.id}`);

    // Success response
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    setResponseStatus(event, 200);

    const successMessage =
      deletionErrors.length > 0
        ? `${body.type} deleted successfully with warnings: ${deletionErrors.join(', ')}`
        : `${body.type} deleted successfully`;

    return {
      ok: true,
      message: successMessage,
      deleted: {
        files: deletedFiles.length > 0 ? deletedFiles : ['No storage files found to delete'],
        record: `${tableName}.${body.id}`,
      },
    };
  } catch (err: any) {
    console.error('Delete video error:', err);
    setResponseStatus(event, 500);
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    return {
      ok: false,
      message: 'Internal server error',
      error: err?.message || 'Unknown error occurred',
    };
  }
});
