/**
 * config/env.js — Centralized Environment Validation
 * ─────────────────────────────────────────────────────
 * This module MUST be imported before any other config.
 * It validates all required secrets at startup and
 * exports them as frozen, read-only constants.
 *
 * If any required variable is missing, the process
 * crashes immediately with a clear error message.
 *
 * ⚠️  NEVER log secret values — only log their presence.
 */

// ── Required environment variables ────────────────────────────────────────────
const REQUIRED = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'FRONTEND_URL',
];

// ── Minimum secret length (prevents weak secrets like "abc") ──────────────────
const MIN_SECRET_LENGTH = 16;
const SECRET_KEYS = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET'];

/**
 * Validate all required env vars exist and secrets meet minimum length.
 * Called once at startup — crashes the process on failure.
 */
const validateEnv = () => {
  const missing = [];
  const weak = [];

  for (const key of REQUIRED) {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ FATAL: Missing required environment variables:\n');
    missing.forEach((v) => console.error(`   • ${v}`));
    console.error('\n   Set these in your .env file or Render dashboard → Environment tab.');
    console.error('   Generate secrets with: openssl rand -hex 32\n');
    process.exit(1);
  }

  // Enforce minimum length on cryptographic secrets
  for (const key of SECRET_KEYS) {
    if (process.env[key].length < MIN_SECRET_LENGTH) {
      weak.push(key);
    }
  }

  if (weak.length > 0) {
    console.error('\n❌ FATAL: Weak secrets detected (must be ≥ 16 characters):\n');
    weak.forEach((v) => console.error(`   • ${v} (current length: ${process.env[v].length})`));
    console.error('\n   Generate strong secrets with: openssl rand -hex 32\n');
    process.exit(1);
  }
};

// ── Run validation immediately on import ──────────────────────────────────────
validateEnv();

// ── Export validated secrets as frozen constants ──────────────────────────────
// These are the ONLY way to access secrets in the entire codebase.
// Frozen to prevent accidental mutation.
const env = Object.freeze({
  JWT_SECRET:          process.env.JWT_SECRET,
  JWT_REFRESH_SECRET:  process.env.JWT_REFRESH_SECRET,
  SESSION_SECRET:      process.env.SESSION_SECRET,
  GOOGLE_CLIENT_ID:    process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  FRONTEND_URL:        process.env.FRONTEND_URL,
  PORT:                process.env.PORT || '3000',
  NODE_ENV:            process.env.NODE_ENV || 'development',
  BASE_URL:            process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
});

module.exports = env;
