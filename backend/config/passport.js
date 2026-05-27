/**
 * config/passport.js
 *
 * Configures the Passport.js Google OAuth 2.0 strategy with MongoDB.
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value.toLowerCase().trim();
        const name = profile.displayName || email.split('@')[0];

        // ── Check if a user with this email already exists ────────────
        let user = await User.findOne({ email });

        if (user) {
          // If the user exists but didn't have a googleId, update it (link accounts)
          if (!user.googleId) {
            user.googleId = profile.id;
            user.provider = 'google';
            await user.save();
          }
          return done(null, user);
        }

        // ── New user — create a record in MongoDB ───────────────────────────────
        user = await User.create({
          email,
          name,
          role: 'user',
          provider: 'google',
          googleId: profile.id,
          passwordHash: null, // No password for OAuth users
        });

        return done(null, user);

      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ── Serialization (needed for Passport) ───────────────────────────
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
