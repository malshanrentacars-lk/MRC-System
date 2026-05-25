'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

/**
 * Extract the storage path from a Supabase public URL.
 * e.g. https://xxx.supabase.co/storage/v1/object/public/customers/folder/file.jpg
 *      → { bucket: 'customers', path: 'folder/file.jpg' }
 */
function extractStorageInfo(publicUrl: string): { bucket: string; path: string } | null {
  try {
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (!match) return null;
    return { bucket: match[1], path: match[2] };
  } catch {
    return null;
  }
}

/**
 * Delete old file from storage if the URL has changed.
 * Call this in update actions before saving the new URL to DB.
 */
export async function deleteOldStorageFile(oldUrl: string | null, newUrl: string | null) {
  if (!oldUrl || oldUrl === newUrl) return; // nothing to delete
  const info = extractStorageInfo(oldUrl);
  if (!info) return;
  try {
    await supabaseAdmin.storage.from(info.bucket).remove([info.path]);
  } catch {
    // Silent — don't block the save if storage delete fails
  }
}

/**
 * Generic file upload to Supabase Storage.
 * Auto-creates the bucket as public if it doesn't exist yet.
 */
export async function uploadAsset(bucket: string, folder: string, file: File) {
  await requireAuth();

  const fileExt = file.name.split('.').pop();
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const createOptions = bucket === 'signed-agreements'
    ? {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['application/pdf'],
      }
    : {
        public: true,
        fileSizeLimit: 10485760,
      };

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    if (
      uploadError.message.includes('Bucket not found') ||
      uploadError.message.includes('bucket') ||
      uploadError.message.includes('not found')
    ) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, createOptions);
      if (createError && !createError.message.includes('already exists')) {
        return { error: `Bucket error: ${createError.message}` };
      }
      const { error: retryError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, file, { upsert: false });
      if (retryError) return { error: retryError.message };
    } else {
      return { error: uploadError.message };
    }
  }

  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
  // If bucket is private, getPublicUrl may not be accessible. Create a long-lived signed URL as fallback.
  try {
    const { data: signed } = await supabaseAdmin.storage.from(bucket).createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year
    const finalUrl = signed?.signedUrl ?? urlData.publicUrl;
    return { success: true, url: finalUrl, path: filePath };
  } catch {
    return { success: true, url: urlData.publicUrl, path: filePath };
  }
}

export async function deleteAsset(bucket: string, path: string) {
  await requireAuth();
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) return { error: error.message };
  return { success: true };
}

