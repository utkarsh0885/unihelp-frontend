/**
 * utils/tokenUtils.js — Centralized JWT Token Generators
 * ────────────────────────────────────────────────────────
 * Single source of truth for access/refresh token creation.
 * Uses validated secrets from config/env.js — NEVER falls back
 * to hardcoded strings.
 *
 * Used by: authController, tokenController, googleAuthController
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate a short-lived JWT access token (15 minutes).
 * Includes user identity claims for the frontend.
 *
 * @param {{ id: string, role: string, name?: string, email?: string }} user
 * @returns {string} Signed JWT
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name || '',
      email: user.email || '',
    },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generate a long-lived JWT refresh token (7 days).
 * Only contains user ID — minimal claims for security.
 *
 * @param {{ id: string }} user
 * @returns {string} Signed JWT
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Verify a JWT access token.
 *
 * @param {string} token
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Verify a JWT refresh token.
 *
 * @param {string} token
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
