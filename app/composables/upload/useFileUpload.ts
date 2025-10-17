import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

export interface UploadOptions {
  webhookUrl?: string;
  onProgress?: (progress: number) => void;
  onSuccess?: (response: any) => void;
  onError?: (error: string) => void;
}

export interface UploadedFiles {
  videoUrl?: string;
  audioUrl?: string;
  previewUrl?: string;
  resembleUuid?: string;
}

export function useFileUpload(options: UploadOptions = {}) {
  const { t } = useI18n();

  const webhookUrl = options.webhookUrl || '/api/webhook-upload';

  const videoFile = ref<File | null>(null);
  const subtitlesFile = ref<File | null>(null);
  const isUploading = ref(false);
  const uploadProgress = ref(0);
  const serverMessage = ref('');
  const errorMessage = ref('');

  const uploadedFiles = ref<UploadedFiles>({});

  const videoName = computed(() => videoFile.value?.name ?? '');
  const subsName = computed(() => subtitlesFile.value?.name ?? '');

  function buildFormData(): FormData {
    const fd = new FormData();
    if (videoFile.value) fd.append('video', videoFile.value, videoFile.value.name);
    if (subtitlesFile.value) fd.append('subtitles', subtitlesFile.value, subtitlesFile.value.name);
    return fd;
  }

  function uploadWithProgress(formData: FormData): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', webhookUrl, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          uploadProgress.value = progress;
          options.onProgress?.(progress);
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          try {
            const contentType = xhr.getResponseHeader('Content-Type') || '';
            if (contentType.includes('application/json')) {
              resolve(JSON.stringify(JSON.parse(xhr.responseText), null, 2));
            } else {
              resolve(xhr.responseText);
            }
          } catch (err) {
            resolve(xhr.responseText);
          } finally {
            isUploading.value = false;
            uploadProgress.value = 100;
          }
        }
      };

      xhr.onerror = () => {
        isUploading.value = false;
        reject(new Error(t('videos.addNew.networkError')));
      };

      isUploading.value = true;
      uploadProgress.value = 0;
      xhr.send(formData);
    });
  }

  async function uploadNow() {
    errorMessage.value = '';
    serverMessage.value = '';

    try {
      const fd = buildFormData();
      const respText = await uploadWithProgress(fd);
      serverMessage.value = respText || t('videos.addNew.emptyResponse');

      try {
        const data = JSON.parse(respText);

        uploadedFiles.value = {
          videoUrl: data?.video?.url,
          audioUrl: data?.audio?.url,
          previewUrl: data?.preview?.url,
          resembleUuid: data?.resemble?.uuid ? String(data.resemble.uuid) : undefined,
        };

        options.onSuccess?.(data);
      } catch (parseError) {
        console.error('Failed to parse upload response:', parseError);
      }
    } catch (e: any) {
      const error = e?.message || t('videos.addNew.uploadError');
      errorMessage.value = error;
      options.onError?.(error);
    } finally {
      isUploading.value = false;
    }
  }

  function setVideoFile(file: File | null) {
    videoFile.value = file;
    serverMessage.value = '';
    errorMessage.value = '';
  }

  function setSubtitlesFile(file: File | null) {
    subtitlesFile.value = file;
  }

  function reset() {
    videoFile.value = null;
    subtitlesFile.value = null;
    isUploading.value = false;
    uploadProgress.value = 0;
    serverMessage.value = '';
    errorMessage.value = '';
    uploadedFiles.value = {};
  }

  return {
    videoFile,
    subtitlesFile,
    isUploading,
    uploadProgress,
    serverMessage,
    errorMessage,
    uploadedFiles,
    videoName,
    subsName,
    setVideoFile,
    setSubtitlesFile,
    uploadNow,
    reset,
  };
}
