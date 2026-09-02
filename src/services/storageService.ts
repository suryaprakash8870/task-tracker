import { supabase, isSupabaseConfigured } from './supabaseClient';

const ATTACHMENTS_BUCKET = 'task-attachments';

export class StorageService {
  /**
   * Upload a file to the private task-attachments bucket in Supabase Storage.
   * Canonical path structure: workspaces/{workspaceId}/tasks/{taskId}/{timestamp}-{sanitizedFilename}
   */
  public async uploadTaskAttachment(
    workspaceId: string,
    taskId: string,
    file: File
  ): Promise<{ storagePath: string; name: string; size: string; type: string }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `workspaces/${workspaceId}/tasks/${taskId}/${Date.now()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      throw new Error(`Failed to upload attachment: ${uploadError.message}`);
    }

    const fileSizeFormatted = this.formatFileSize(file.size);

    return {
      storagePath,
      name: file.name,
      size: fileSizeFormatted,
      type: file.type || 'application/octet-stream'
    };
  }

  /**
   * Generates a temporary authorized/signed URL for accessing a private attachment.
   * Default validity: 3600 seconds (1 hour).
   */
  public async getSignedAttachmentUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!storagePath) return '';
    if (!isSupabaseConfigured()) {
      return storagePath; // Return raw reference if in local demo mode
    }

    // If storagePath is already a valid full URL or object URL (e.g. legacy demo)
    if (storagePath.startsWith('blob:') || storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      return storagePath;
    }

    const { data, error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('Could not generate signed URL for path:', storagePath, error);
      return '';
    }

    return data.signedUrl;
  }

  /**
   * Downloads a private attachment file by generating a signed URL and triggering browser download.
   */
  public async downloadAttachment(storagePath: string, fileName: string): Promise<void> {
    try {
      const signedUrl = await this.getSignedAttachmentUrl(storagePath, 300);
      if (!signedUrl) throw new Error('Could not retrieve authorized download URL.');

      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download attachment:', err);
      throw err;
    }
  }

  /**
   * Deletes an attachment from Supabase Storage.
   */
  public async deleteStorageFile(storagePath: string): Promise<void> {
    if (!isSupabaseConfigured() || !storagePath) return;

    // Skip if not a bucket path
    if (storagePath.startsWith('blob:') || storagePath.startsWith('http')) return;

    const { error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error('Failed to delete file from Supabase Storage:', error);
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

export const storageService = new StorageService();
