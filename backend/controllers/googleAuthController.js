/**
 * controllers/googleAuthController.js
 *
 * Handles the FINAL step of the Google OAuth flow with MongoDB.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const generateAccessToken = (user) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  return jwt.sign(
    { id: user._id || user.id, role: user.role },
    secret,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
  return jwt.sign(
    { id: user._id || user.id },
    secret,
    { expiresIn: '7d' }
  );
};

exports.googleCallback = async (req, res) => {
  const redirectTarget = req.query.redirectUri || process.env.FRONTEND_URL;

  try {
    const user = req.user;

    if (!user) {
      console.error('[GoogleAuth] req.user is undefined after passport.authenticate');
      return res.redirect(`${redirectTarget}?error=auth_failed`);
    }

    // ── Mint JWT tokens ────────────────────────────────────────────────────────
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // ── Hash and persist the refresh token to MongoDB ─────────────────────────
    const hashedRT = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Use findByIdAndUpdate to ensure we have the latest user instance
    await User.findByIdAndUpdate(user._id || user.id, { hashedRefreshToken: hashedRT });

    // ── Build safe user payload ───────────────────────────────────────────────
    const safeUser = {
      id: user._id || user.id,
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

    console.log(`[GoogleAuth] ✅ User "${user.email}" authenticated. Redirecting to: ${redirectTarget}`);
    return res.redirect(`${redirectTarget}?${params.toString()}`);

  } catch (err) {
    console.error('[GoogleAuth] Callback error:', err.message);
    return res.redirect(`${redirectTarget}?error=server_error`);
  }
};
