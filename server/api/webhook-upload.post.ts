import { createClient } from '@supabase/supabase-js';
import { defineEventHandler, readMultipartFormData, setHeaders, setResponseStatus } from 'h3';
import { useRuntimeConfig } from '#imports';

// Проксирование multipart-запроса и серверная обработка: выгрузка в Supabase, извлечение аудио и запуск Transgate
// const WEBHOOK_URL =
//   'https://optimizationsonline.org/webhook-test/b9adfbe2-8129-44d8-a437-6e4f9531b76b';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const supabaseUrl = config.public?.supabase?.url;
    const supabaseKey = (config as any).supabaseServiceKey || config.public?.supabase?.key;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase конфигурация отсутствует');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const parts = await readMultipartFormData(event);

    // Ищем загруженное видео
    const videoPart = parts?.find((p) => p.name === 'video' && p.filename);
    if (!videoPart) {
      throw new Error('Видео не прикреплено (ожидается поле "video")');
    }

    // Динамически импортируем нужные модули Node и ffmpeg-static
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const crypto = await import('node:crypto');
    const cp = await import('node:child_process');
    const ffmpegModule = await import('ffmpeg-static');
    const ffmpegPath = (ffmpegModule as any).default || (ffmpegModule as any);
    if (!ffmpegPath) {
      throw new Error('ffmpeg не найден. Установите зависимость ffmpeg-static');
    }

    // Готовим временные файлы
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nuxt-upload-'));
    const inName = crypto.randomBytes(8).toString('hex') + '-' + (videoPart.filename || 'input');
    const outName = crypto.randomBytes(8).toString('hex') + '.mp3';
    const inPath = path.join(tmpDir, inName);
    const outPath = path.join(tmpDir, outName);

    // Записываем исходное видео во временный файл
    await fs.writeFile(inPath, videoPart.data);

    // Запускаем ffmpeg для извлечения аудио в MP3
    await new Promise<void>((resolve, reject) => {
      cp.execFile(
        ffmpegPath as string,
        ['-y', '-i', inPath, '-vn', '-acodec', 'libmp3lame', '-b:a', '192k', outPath],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Читаем получившийся аудиофайл
    const audioBuffer = await fs.readFile(outPath);

    // Создаём buckets при необходимости (игнорируем ошибку, если уже есть)
    try {
      await supabase.storage.createBucket('Videos', { public: false });
    } catch {}
    try {
      await supabase.storage.createBucket('Audios', { public: false });
    } catch {}

    // Загружаем исходное видео в Supabase Storage
    const videoBlob = new Blob([videoPart.data], {
      type: videoPart.type || 'application/octet-stream',
    });
    const videoExt = (videoPart.filename?.split('.').pop() || 'mp4').toLowerCase();
    const videoPath = `uploads/videos/${crypto.randomBytes(12).toString('hex')}.${videoExt}`;
    const { error: upVideoErr } = await supabase.storage
      .from('Videos')
      .upload(videoPath, videoBlob, {
        contentType: videoPart.type || 'video/mp4',
        upsert: false,
      });
    if (upVideoErr) throw upVideoErr;

    // Загружаем аудио в Supabase Storage
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioPath = `uploads/audios/${crypto.randomBytes(12).toString('hex')}.mp3`;
    const { error: upAudioErr } = await supabase.storage
      .from('Audios')
      .upload(audioPath, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: false,
      });
    if (upAudioErr) throw upAudioErr;

    // Генерируем превью-изображение (кадр) через ffmpeg
    const thumbName = crypto.randomBytes(8).toString('hex') + '.jpg';
    const thumbPath = path.join(tmpDir, thumbName);
    await new Promise<void>((resolve, reject) => {
      cp.execFile(
        ffmpegPath as string,
        ['-y', '-ss', '00:00:01', '-i', inPath, '-frames:v', '1', '-q:v', '2', thumbPath],
        (err) => (err ? reject(err) : resolve())
      );
    });

    const thumbBuffer = await fs.readFile(thumbPath);
    const thumbBlob = new Blob([thumbBuffer], { type: 'image/jpeg' });
    const previewPath = `uploads/previews/${crypto.randomBytes(12).toString('hex')}.jpg`;
    const { error: upThumbErr } = await supabase.storage
      .from('Videos')
      .upload(previewPath, thumbBlob, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    if (upThumbErr) throw upThumbErr;

    // Подготовим ссылки (пробуем подписанные ссылки на 30 дней)
    const audioSigned = await supabase.storage
      .from('Audios')
      .createSignedUrl(audioPath, 60 * 60 * 24 * 30);
    const videoSigned = await supabase.storage
      .from('Videos')
      .createSignedUrl(videoPath, 60 * 60 * 24 * 30);
    const previewSigned = await supabase.storage
      .from('Videos')
      .createSignedUrl(previewPath, 60 * 60 * 24 * 30);
    const audioUrl =
      audioSigned.data?.signedUrl ||
      supabase.storage.from('Audios').getPublicUrl(audioPath).data.publicUrl;
    const videoUrl =
      videoSigned.data?.signedUrl ||
      supabase.storage.from('Videos').getPublicUrl(videoPath).data.publicUrl;
    const previewUrl =
      previewSigned.data?.signedUrl ||
      supabase.storage.from('Videos').getPublicUrl(previewPath).data.publicUrl;

    // Отправляем аудио-файл как файл в n8n WebHook
    // ! Webhook пока не нужен
    // const fd = new FormData()
    // const audioName = (videoPart.filename?.replace(/\.[^/.]+$/, '') || 'audio') + '.mp3'
    // fd.append('audio', audioBlob, audioName)
    // if (videoPart.filename) fd.append('source_filename', videoPart.filename)
    // fd.append('audio_url', audioUrl)
    // fd.append('video_url', videoUrl)
    // const webhookRes = await fetch(WEBHOOK_URL, { method: 'POST', body: fd })
    // const webhookText = await webhookRes.text().catch(() => '')

    // Предварительно проверим, что audioUrl доступен публично (HEAD/Range)
    let audioReachable = true;
    try {
      const head = await fetch(audioUrl, { method: 'HEAD' });
      if (!head.ok) {
        const range = await fetch(audioUrl, { method: 'GET', headers: { Range: 'bytes=0-0' } });
        audioReachable = range.ok;
      }
    } catch {
      audioReachable = false;
    }
    if (!audioReachable) {
      throw new Error('Audio URL is not publicly accessible for Resemble.AI');
    }

    // Запускаем транскрибацию через Resemble.AI
    const resembleProjectUuid = (config as any).resembleProjectUuid;
    const transcribePayload: Record<string, any> = {
      audio_url: audioUrl,
    };
    if (resembleProjectUuid) {
      transcribePayload.project_uuid = resembleProjectUuid;
    }

    let resembleUuid: string | undefined;
    let resembleStatus = '';
    try {
      const transcribeRes = await fetch(`${getRequestURL(event).origin}/api/resemble/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transcribePayload),
      });

      if (!transcribeRes.ok) {
        const errorText = await transcribeRes.text().catch(() => '');
        throw new Error(`Resemble.AI transcription failed: ${errorText || 'unknown error'}`);
      }

      const transcribeData = (await transcribeRes.json()) as any;
      resembleUuid = transcribeData?.uuid;
      resembleStatus = transcribeData?.status || 'queued';
    } catch (err: any) {
      throw new Error(`Failed to start Resemble.AI transcription: ${err.message}`);
    }

    if (!resembleUuid) {
      throw new Error('Resemble.AI did not return a transcription UUID');
    }

    // Ответ клиенту
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    setResponseStatus(event, 200);

    // Удаляем временные файлы/каталог (не падаем при ошибках удаления)
    await Promise.allSettled([
      fs.rm(inPath, { force: true }),
      fs.rm(outPath, { force: true }),
      fs.rm(thumbPath, { force: true }),
      fs.rm(tmpDir, { recursive: true, force: true }),
    ]);

    return JSON.stringify({
      video: { bucket: 'Videos', path: videoPath, url: videoUrl },
      audio: { bucket: 'Audios', path: audioPath, url: audioUrl },
      preview: { bucket: 'Videos', path: previewPath, url: previewUrl },
      resemble: { uuid: resembleUuid, status: resembleStatus },
    });
  } catch (err: any) {
    setResponseStatus(event, 500);
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' });
    return JSON.stringify({ error: err?.message || 'Proxy error' });
  }
});
