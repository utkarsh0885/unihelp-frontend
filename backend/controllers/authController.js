const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Helper to generate custom JWT Access Token (short lived)
const generateAccessToken = (user) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  return jwt.sign(
    { id: user._id || user.id, role: user.role, name: user.name, email: user.email },
    secret,
    { expiresIn: '15m' }
  );
};

// Helper to generate Refresh Token (long lived)
const generateRefreshToken = (user) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
  return jwt.sign({ id: user._id || user.id }, secret, { expiresIn: '7d' });
};

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  // Basic email standardization
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  try {
    // 1. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Create User in MongoDB
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'user', // Default role
    });

    // 3. Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Hash refresh token & store to DB securely
    const hashedRT = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.hashedRefreshToken = hashedRT;
    await user.save();

    // Filter user object to omit sensitive DB values before returning
    const safeUser = { id: user._id, email: user.email, name: user.name, role: user.role };

    console.log(`[Auth] ✅ Signup success: ${safeUser.email} (id=${safeUser.id})`);
    
    // Return BOTH 'token' and 'accessToken' so any frontend version works
    return res.json({ success: true, token: accessToken, accessToken, refreshToken, user: safeUser });
  } catch (error) {
    console.error('[Auth] Signup Error:', error.message);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 1. Locate user in MongoDB
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.isBanned) {
      return res.status(401).json({ error: user?.isBanned ? 'Your account has been banned' : 'Invalid email or password' });
    }

    // 2. Validate password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Hash refresh token & update DB securely
    const hashedRT = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.hashedRefreshToken = hashedRT;
    await user.save();

    // Output mapped safe user
    const safeUser = { id: user._id, email: user.email, name: user.name, role: user.role, isVerified: user.isVerified };

    console.log(`[Auth] ✅ Login success: ${safeUser.email} (id=${safeUser.id})`);

    // Return BOTH 'token' and 'accessToken' so any frontend version works
    return res.json({ success: true, token: accessToken, accessToken, refreshToken, user: safeUser });
  } catch (error) {
    console.error('[Auth] Login Error:', error.message);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};
