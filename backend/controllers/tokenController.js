const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../config/db');

// Define token generators here to stay DRY if possible, or replicate short version
const generateAccessToken = (user) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    secret,
    { expiresIn: '15m' }
  );
};
const generateRefreshToken = (user) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
  return jwt.sign({ id: user.id }, secret, { expiresIn: '7d' });
};

exports.refresh = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
  
  jwt.verify(refreshToken, secret, async (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired refresh token' });

    try {
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
    } catch (dbError) {
      console.error('[TokenController] refresh error:', dbError.message);
      res.status(500).json({ error: 'Database error during refresh' });
    }
  });
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
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
