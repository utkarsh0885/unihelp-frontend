/**
 * config/passport.js
 *
 * Configures the Passport.js Google OAuth 2.0 strategy with Firestore.
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { db } = require('./db');

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

        console.log(`[Passport] Google Auth login attempt: ${email}`);

        // ── Check if a user with this email already exists in Firestore ──────────
        const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
        
        let user = null;
        let userId = null;

        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];
          user = userDoc.data();
          userId = userDoc.id;
          user.id = userId;

          // If the user exists but didn't have a googleId, link the account
          if (!user.googleId) {
            await db.collection('users').doc(userId).update({
              googleId: profile.id,
              provider: 'google',
            });
            user.googleId = profile.id;
            user.provider = 'google';
            console.log(`[Passport] Google ID linked to existing user email: ${email}`);
          }
          
          return done(null, user);
        }

        // ── New user — create a record in Firestore ───────────────────────────────
        const newUser = {
          email,
          name,
          role: 'user',
          provider: 'google',
          googleId: profile.id,
          passwordHash: null, // No password for OAuth users
          createdAt: new Date().toISOString(),
          isVerified: false,
          isBanned: false,
        };

        const docRef = await db.collection('users').add(newUser);
        newUser.id = docRef.id;

        console.log(`[Passport] New user successfully created in Firestore: ${email} (id=${docRef.id})`);
        return done(null, newUser);

      } catch (err) {
        console.error('[Passport] Strategy error:', err.message);
        return done(err, null);
      }
    }
  )
);

// ── Serialization (needed for Passport) ───────────────────────────
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) {
      return done(null, false);
    }
    const user = doc.data();
    user.id = doc.id;
    done(null, user);
  } catch (err) {
    console.error('[Passport] DeserializeUser error:', err.message);
    done(err, null);
  }
});

module.exports = passport;
