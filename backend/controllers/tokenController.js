const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokenUtils');

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  try {
    // Verify the refresh token using the validated secret (no fallbacks)
    const decoded = verifyRefreshToken(refreshToken);

    // Look up user in Firestore
    const userRef = db.collection('users').doc(decoded.id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(403).json({ error: 'User not found' });

    const user = userDoc.data();
    user.id = userDoc.id;

    // Validate the hash against the database hash
    const incomingHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (user.hashedRefreshToken !== incomingHash) {
      return res.status(403).json({ error: 'Token has been revoked or rotated' });
    }

    // Token is fully valid! Rotate tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Save new hash
    const newHashedRT = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await userRef.update({
      hashedRefreshToken: newHashedRT,
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Refresh token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    console.error('[TokenController] refresh error:', error.message);
    res.status(500).json({ error: 'Database error during refresh' });
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      // jwt.decode does NOT verify — safe to use here just to extract the user ID
      const decoded = jwt.decode(refreshToken);
      if (decoded && decoded.id) {
         const userRef = db.collection('users').doc(decoded.id);
         const userDoc = await userRef.get();
         if (userDoc.exists) {
           await userRef.update({
             hashedRefreshToken: null,
           });
         }
      }
    } catch (e) {
      // Fail silently for logout token errors
    }
  }
  
  res.json({ success: true, message: 'Logged out successfully' });
};
