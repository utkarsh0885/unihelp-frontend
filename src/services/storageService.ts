/**
 * Supabase Storage Service
 * ─────────────────────────────────────────────
 * Provides optimized file upload with real progress tracking,
 * image manipulation (resizing/compression), URL resolution,
 * and bucket operations (upload, delete).
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { BUCKETS, MAX_FILE_SIZES, ALLOWED_MIME_TYPES } from '../constants/storage';

// Initialize Supabase Client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Diagnostic logging to confirm loaded values
console.log('[StorageService] Supabase Initialization Diagnostics:');
console.log('[StorageService] EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log('[StorageService] EXPO_PUBLIC_SUPABASE_ANON_KEY (length):', supabaseAnonKey ? supabaseAnonKey.length : 0);

// Validate environment variables and fail fast
if (!supabaseUrl || supabaseUrl === 'https://placeholder-project.supabase.co' || supabaseUrl.trim() === '') {
  const errorMsg = 'CRITICAL CONFIGURATION ERROR: EXPO_PUBLIC_SUPABASE_URL environment variable is missing or set to a placeholder. ' +
    'Please verify that your root .env file has the correct value and that you restarted your Metro bundler with cache cleared: npx expo start -c';
  console.error('[StorageService] ' + errorMsg);
  throw new Error(errorMsg);
}

if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-anon-key' || supabaseAnonKey.trim() === '') {
  const errorMsg = 'CRITICAL CONFIGURATION ERROR: EXPO_PUBLIC_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable is missing or set to a placeholder. ' +
    'Please verify that your root .env file has the correct value and that you restarted your Metro bundler with cache cleared: npx expo start -c';
  console.error('[StorageService] ' + errorMsg);
  throw new Error(errorMsg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Session managed by Firebase Auth
  },
});

/**
 * Optimizes an image using expo-image-manipulator before upload.
 * Resizes the image to a maximum width of 1080px and applies 70% JPEG compression.
 * Works on Web and Mobile.
 * 
 * @param uri Local file URI from image picker
 * @returns Promise resolving to the optimized file URI
 */
export const optimizeImage = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    // Canvas manipulation or direct return on web if manipulator behaves differently,
    // but expo-image-manipulator supports web fully.
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (e) {
      console.warn('[StorageService] Web image optimization error, using original:', e);
      return uri;
    }
  }

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.warn('[StorageService] Native image optimization error, using original:', error);
    return uri;
  }
};

/**
 * Validates file constraints (size and MIME type).
 * Throws an error if validation fails.
 * 
 * @param size File size in bytes
 * @param mimeType MIME type of the file
 * @param maxAllowedSize Max allowed size in bytes
 * @param allowedTypes Array of allowed MIME types
 */
const validateFile = (
  size: number,
  mimeType: string,
  maxAllowedSize: number,
  allowedTypes: readonly string[]
) => {
  if (size > maxAllowedSize) {
    throw new Error(`File is too large. Maximum size allowed is ${(maxAllowedSize / 1024 / 1024).toFixed(1)}MB.`);
  }

  // Be lenient if mimeType is undefined/empty but check if possible
  if (mimeType && !allowedTypes.includes(mimeType as any)) {
    throw new Error(`Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`);
  }
};

/**
 * Helper to upload a file with progress indicators using XMLHttpRequest.
 * Essential for native uploads where standard fetch doesn't support progress events.
 * 
 * @param bucket Supabase storage bucket
 * @param path Storage destination path
 * @param uri Local file URI
 * @param onProgress Callback function receiving upload progress percentage
 */
const uploadFileWithProgress = async (
  bucket: string,
  path: string,
  uri: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Convert local URI to a Blob
  let blob: Blob;
  try {
    const response = await fetch(uri);
    blob = await response.blob();
  } catch (e) {
    console.error('[StorageService] Fetch blob error:', e);
    throw new Error('Failed to read local file contents. Ensure file permissions are granted.');
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseAnonKey}`);
    xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve(path);
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network failure during upload. Please check your internet connection.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Please try again.'));
    };

    xhr.send(blob);
  });
};

/**
 * Returns the public access URL for a file in a given bucket.
 * 
 * @param bucket Storage bucket
 * @param path File path in bucket
 */
export const getPublicUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Uploads a user profile image.
 * Optimizes the image before upload.
 */
export const uploadProfileImage = async (
  userId: string,
  localUri: string,
  size: number = 0,
  mimeType: string = 'image/jpeg',
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Validate constraints on the original file
  validateFile(size, mimeType, MAX_FILE_SIZES.PROFILE_IMAGE, ALLOWED_MIME_TYPES.IMAGES);

  // Compress and optimize
  const optimizedUri = await optimizeImage(localUri);
  const fileExt = 'jpg'; // Optimized outputs are JPEGs
  const path = `profiles/${userId}_${Date.now()}.${fileExt}`;

  await uploadFileWithProgress(BUCKETS.PROFILE_IMAGES, path, optimizedUri, onProgress);
  return getPublicUrl(BUCKETS.PROFILE_IMAGES, path);
};

/**
 * Uploads an image attached to a post.
 * Optimizes the image before upload.
 */
export const uploadPostImage = async (
  userId: string,
  localUri: string,
  size: number = 0,
  mimeType: string = 'image/jpeg',
  onProgress?: (progress: number) => void
): Promise<string> => {
  validateFile(size, mimeType, MAX_FILE_SIZES.POST_IMAGE, ALLOWED_MIME_TYPES.IMAGES);

  const optimizedUri = await optimizeImage(localUri);
  const fileExt = 'jpg';
  const path = `posts/${userId}_${Date.now()}.${fileExt}`;

  await uploadFileWithProgress(BUCKETS.POST_IMAGES, path, optimizedUri, onProgress);
  return getPublicUrl(BUCKETS.POST_IMAGES, path);
};

/**
 * Uploads an event poster.
 * Optimizes the image before upload.
 */
export const uploadEventPoster = async (
  userId: string,
  localUri: string,
  size: number = 0,
  mimeType: string = 'image/jpeg',
  onProgress?: (progress: number) => void
): Promise<string> => {
  validateFile(size, mimeType, MAX_FILE_SIZES.EVENT_POSTER, ALLOWED_MIME_TYPES.IMAGES);

  const optimizedUri = await optimizeImage(localUri);
  const fileExt = 'jpg';
  const path = `events/${userId}_${Date.now()}.${fileExt}`;

  await uploadFileWithProgress(BUCKETS.EVENT_POSTERS, path, optimizedUri, onProgress);
  return getPublicUrl(BUCKETS.EVENT_POSTERS, path);
};

/**
 * Uploads a note PDF file.
 */
export const uploadPDF = async (
  userId: string,
  localUri: string,
  fileName: string,
  size: number = 0,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const mimeType = 'application/pdf';
  validateFile(size, mimeType, MAX_FILE_SIZES.NOTE_PDF, ALLOWED_MIME_TYPES.PDFS);

  // Clean filename to avoid character issues in path
  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `notes/${userId}_${Date.now()}_${safeFileName}`;

  await uploadFileWithProgress(BUCKETS.NOTES, path, localUri, onProgress);
  return getPublicUrl(BUCKETS.NOTES, path);
};

/**
 * Deletes a file from a specified Supabase bucket.
 * Parses the public URL to extract the relative file path.
 * 
 * @param bucket Storage bucket
 * @param fileUrl The full public URL of the file
 */
export const deleteFile = async (bucket: string, fileUrl: string): Promise<void> => {
  try {
    if (!fileUrl) return;

    // Extract path from public URL: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    const searchString = `/storage/v1/object/public/${bucket}/`;
    const index = fileUrl.indexOf(searchString);
    if (index === -1) {
      console.warn('[StorageService] Could not parse file path from URL:', fileUrl);
      return;
    }

    const path = fileUrl.substring(index + searchString.length);
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      throw error;
    }
    console.log(`[StorageService] File deleted from bucket "${bucket}": ${path}`);
  } catch (error) {
    console.error('[StorageService] Delete file error:', error);
    // Silent fail in production or resolve to avoid breaking core document deletion flows
  }
};
