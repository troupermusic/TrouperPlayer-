import * as FileSystem from 'expo-file-system/legacy';

export type DownloadProgress = {
  id: string;
  written: number;
  total: number;
  fraction: number;
};

export type DownloadResult = {
  id: string;
  uri: string;
  status: number;
};

type DownloadJob = {
  id: string;
  url: string;
  destination: string;
  task: any;
  pausedSnapshot?: any;
};

const jobs = new Map<string, DownloadJob>();

function safeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

  return cleaned || 'Trouper-download';
}

function validateUrl(url: string): void {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error('The download URL is invalid.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only secure HTTPS download URLs are accepted.');
  }
}

function createTask(
  job: DownloadJob,
  resumeData?: string,
  onProgress?: (progress: DownloadProgress) => void,
): any {
  return FileSystem.createDownloadResumable(
    job.url,
    job.destination,
    {},
    (event) => {
      const total = event.totalBytesExpectedToWrite;
      const written = event.totalBytesWritten;

      onProgress?.({
        id: job.id,
        written,
        total,
        fraction: total > 0 ? Math.min(1, written / total) : 0,
      });
    },
    resumeData,
  );
}

/**
 * Downloads a direct HTTPS audio URL supplied by an authorized provider.
 * This first version uses Expo's resumable single-download API.
 */
export async function startMusicDownload(
  url: string,
  title: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<DownloadResult> {
  validateUrl(url);

  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('App storage is unavailable on this device.');
  }

  const id = `download-${Date.now()}-${Math.random()
    .toString(36).slice(2, 8)}`;

  const filename = `${safeFilename(title)}-${id}.audio`;
  const destination = `${directory}${filename}`;

  const job: DownloadJob = {
    id,
    url,
    destination,
    task: null,
  };

  job.task = createTask(job, undefined, onProgress);
  jobs.set(id, job);

  try {
    const result = await job.task.downloadAsync();

    if (!result || result.status < 200 || result.status >= 300) {
      throw new Error(
        `Download failed${result ? ` (HTTP ${result.status})` : ''}.`,
      );
    }

    return {
      id,
      uri: result.uri,
      status: result.status,
    };
  } catch (error) {
    // Keep the job if it was paused so the caller can resume it.
    if (!job.pausedSnapshot) {
      jobs.delete(id);
    }
    throw error;
  }
}

/**
 * Pause an active download and retain its resume data in memory.
 */
export async function pauseMusicDownload(id: string): Promise<void> {
  const job = jobs.get(id);
  if (!job) throw new Error('Download job was not found.');

  job.pausedSnapshot = await job.task.pauseAsync();
}

/**
 * Resume a paused download during this app session.
 */
export async function resumeMusicDownload(
  id: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<DownloadResult> {
  const job = jobs.get(id);
  if (!job?.pausedSnapshot) {
    throw new Error('No paused download is available to resume.');
  }

  const snapshot = job.pausedSnapshot;
  job.task = createTask(job, snapshot.resumeData, onProgress);
  job.pausedSnapshot = undefined;

  const result = await job.task.downloadAsync();

  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error(
      `Resume failed${result ? ` (HTTP ${result.status})` : ''}.`,
    );
  }

  return {
    id,
    uri: result.uri,
    status: result.status,
  };
}

/**
 * Remove a completed job from the in-memory queue.
 * The downloaded file itself is intentionally preserved.
 */
export function forgetMusicDownload(id: string): void {
  jobs.delete(id);
}
