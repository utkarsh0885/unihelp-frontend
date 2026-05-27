/**
 * controllers/googleAuthController.js
 *
 * Handles the FINAL step of the Google OAuth flow with Firestore.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../config/db');

const generateAccessToken = (user) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  return jwt.sign(
    { id: user.id, role: user.role },
    secret,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
  return jwt.sign(
    { id: user.id },
    secret,
    { expiresIn: '7d' }
  );
};

exports.googleCallback = async (req, res) => {
  const redirectTarget = req.query.state || req.query.redirectUri || process.env.FRONTEND_URL;

  try {
    const user = req.user;

    if (!user) {
      console.error('[GoogleAuth] req.user is undefined after passport.authenticate');
      return res.redirect(`${redirectTarget}?error=auth_failed`);
    }

    // ── Mint JWT tokens ────────────────────────────────────────────────────────
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // ── Hash and persist the refresh token to Firestore ─────────────────────────
    const hashedRT = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Update hashed refresh token in Firestore
    await db.collection('users').doc(user.id).update({
      hashedRefreshToken: hashedRT,
    });

    // ── Build safe user payload ───────────────────────────────────────────────
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    // ── Redirect to the Expo app with tokens ──────────────────────────────────
    const params = new URLSearchParams({
      access: accessToken,
      refresh: refreshToken,
      user: JSON.stringify(safeUser),
    });

    console.log(`[GoogleAuth] Google user authenticated: ${user.email}. Redirecting to: ${redirectTarget}`);
    return res.redirect(`${redirectTarget}?${params.toString()}`);

  } catch (err) {
    console.error('[GoogleAuth] Callback error:', err.message);
    return res.redirect(`${redirectTarget}?error=server_error`);
  }
};
