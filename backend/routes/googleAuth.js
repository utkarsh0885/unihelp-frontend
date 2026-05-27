/**
 * routes/googleAuth.js
 *
 * Mounted at /auth in index.js, exposing:
 *
 *   GET /auth/google?redirectUri=<expoDeepLink>
 *     → Saves the Expo redirectUri in session, then redirects to Google consent.
 *
 *   GET /auth/google/callback
 *     → Google redirects back here. We restore the redirectUri from session,
 *       Passport exchanges code for profile, then googleCallback redirects
 *       the browser to the Expo deep-link with tokens as query params.
 *
 *   GET /auth/google/failure
 *     → Shown when the user denies permission or an error occurs.
 *
 * IMPORTANT: GOOGLE_CALLBACK_URL in .env MUST exactly match the URI registered
 * in Google Cloud Console. Only the backend-to-Google URI goes here — not the
 * Expo deep-link URI (that's handled separately via the redirectUri param).
 *
 * Registered in Google Cloud Console "Authorized redirect URIs":
 *   https://unihelp-backend-a5f3.onrender.com/auth/google/callback
 */

const express = require('express');
const passport = require('passport');
const router = express.Router();
const { googleCallback } = require('../controllers/googleAuthController');

// ── Route 1: Initiate Google OAuth ────────────────────────────────────────────
// The Expo app calls this with ?redirectUri=<expoDeepLink>.
// We save that URI in the session so it survives the Google redirect round-trip,
// then hand off to Passport which redirects the browser to accounts.google.com.
router.get('/google', (req, res, next) => {
  // Save the Expo deep-link redirect URI in the session.
  // It will be gone from req.query after Google redirects back to /callback.
  if (req.query.redirectUri) {
    req.session.oauthRedirectUri = req.query.redirectUri;
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account', // Forces account picker every time
  })(req, res, next);
});

// ── Route 2: Google OAuth Callback ────────────────────────────────────────────
// Google redirects back here after the user allows/denies.
// We restore the saved redirectUri from the session onto req.query so that
// googleCallback can use it to redirect the browser back into the Expo app.
router.get(
  '/google/callback',
  (req, res, next) => {
    // Restore the Expo redirect URI from session → put back on req.query
    // so googleAuthController.js can read it as req.query.redirectUri.
    if (req.session.oauthRedirectUri) {
      req.query.redirectUri = req.session.oauthRedirectUri;
      delete req.session.oauthRedirectUri; // Clean up after use
    }
    next();
  },
  passport.authenticate('google', {
    session: false,                        // Stateless — JWTs, not sessions
    failureRedirect: '/auth/google/failure',
  }),
  googleCallback                           // Mints JWT → redirects to Expo deep-link
);

// ── Route 3: Failure fallback ──────────────────────────────────────────────────
router.get('/google/failure', (req, res) => {
  const redirectUri = req.session.oauthRedirectUri || process.env.FRONTEND_URL;
  if (req.session.oauthRedirectUri) delete req.session.oauthRedirectUri;
  // Redirect back to the app with an error param if we have a deep-link URI
  if (redirectUri && !redirectUri.startsWith('http://localhost')) {
    return res.redirect(`${redirectUri}?error=auth_failed`);
  }
  res.status(401).json({
    success: false,
    error: 'Google authentication was cancelled or failed. Please try again.',
  });
});

module.exports = router;
