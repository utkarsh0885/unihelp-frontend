/**
 * Storage Constants for Supabase Storage
 * ─────────────────────────────────────────────
 * Centralizes bucket definitions and validation constraints.
 */

export const BUCKETS = {
  PROFILE_IMAGES: 'profile-images',
  POST_IMAGES: 'post-images',
  NOTES: 'notes',
  EVENT_POSTERS: 'event-posters',
} as const;

export const MAX_FILE_SIZES = {
  PROFILE_IMAGE: 2 * 1024 * 1024, // 2MB
  POST_IMAGE: 5 * 1024 * 1024,    // 5MB
  EVENT_POSTER: 5 * 1024 * 1024,  // 5MB
  NOTE_PDF: 10 * 1024 * 1024,     // 10MB
} as const;

export const ALLOWED_MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  PDFS: ['application/pdf'],
} as const;
