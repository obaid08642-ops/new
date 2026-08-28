import * as FileSystem from 'expo-file-system';
import { logger } from './Logger';

const log = logger.scope('FileManager');

export interface DownloadOptions {
  headers?: Record<string, string>;
  cache?: boolean;
}

export interface UploadOptions {
  headers?: Record<string, string>;
  httpMethod?: 'POST' | 'PUT';
  uploadType?: any;
  fieldName?: string;
  mimeType?: string;
  parameters?: Record<string, string>;
}

class FileManager {
  private static instance: FileManager;
  public readonly cacheDir = (FileSystem as any).cacheDirectory;
  public readonly docDir = (FileSystem as any).documentDirectory;

  private constructor() {}

  public static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager();
    }
    return FileManager.instance;
  }

  /**
   * Generates a safe file path in the cache directory
   */
  private getCachePath(filename: string): string {
    return `${this.cacheDir}${filename}`;
  }

  /**
   * Downloads a file and optionally caches it
   */
  public async downloadFile(url: string, filename: string, options?: DownloadOptions): Promise<string | null> {
    const dest = this.getCachePath(filename);
    
    if (options?.cache) {
      const info = await FileSystem.getInfoAsync(dest);
      if (info.exists) {
        log.debug('File found in cache', { url, dest });
        return dest;
      }
    }

    try {
      const result = await FileSystem.downloadAsync(url, dest, { headers: options?.headers });
      if (result.status >= 200 && result.status < 300) {
        log.info('File downloaded successfully', { url, dest });
        return result.uri;
      }
      log.error('Download failed with status', { status: result.status });
      return null;
    } catch (e) {
      log.error('Failed to download file', e);
      return null;
    }
  }

  /**
   * Uploads a file using multipart or binary
   */
  public async uploadFile(url: string, fileUri: string, options?: UploadOptions): Promise<any> {
    try {
      const result = await FileSystem.uploadAsync(url, fileUri, {
        httpMethod: options?.httpMethod ?? 'POST',
        uploadType: options?.uploadType ?? (FileSystem as any).FileSystemUploadType?.MULTIPART ?? 1,
        fieldName: options?.fieldName ?? 'file',
        mimeType: options?.mimeType,
        parameters: options?.parameters,
        headers: options?.headers,
      });

      if (result.status >= 200 && result.status < 300) {
        log.info('File uploaded successfully', { url });
        return JSON.parse(result.body);
      }
      log.error('Upload failed with status', { status: result.status });
      throw new Error(`Upload failed: ${result.status}`);
    } catch (e) {
      log.error('Failed to upload file', e);
      throw e;
    }
  }

  /**
   * Cleans up all cached files
   */
  public async clearCache(): Promise<void> {
    try {
      if (!this.cacheDir) return;
      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      await Promise.all(
        files.map(file => FileSystem.deleteAsync(`${this.cacheDir}${file}`, { idempotent: true }))
      );
      log.info('Cache cleared successfully');
    } catch (e) {
      log.error('Failed to clear cache', e);
    }
  }

  /**
   * Gets total size of cached files in bytes
   */
  public async getCacheSize(): Promise<number> {
    try {
      if (!this.cacheDir) return 0;
      let total = 0;
      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      
      for (const file of files) {
        const info = await FileSystem.getInfoAsync(`${this.cacheDir}${file}`);
        if (info.exists && !info.isDirectory && info.size) {
          total += info.size;
        }
      }
      return total;
    } catch (e) {
      log.error('Failed to get cache size', e);
      return 0;
    }
  }
}

export const fileManager = FileManager.getInstance();
