const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  // Basic email standardization
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if user already exists
    const userQuery = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
    if (!userQuery.empty) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // 1. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Create User in Firestore
    const newUser = {
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'user', // Default role
      isVerified: false,
      isBanned: false,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('users').add(newUser);
    newUser.id = docRef.id;

    // 3. Generate Tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Hash refresh token & store to DB securely
    const hashedRT = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await db.collection('users').doc(docRef.id).update({
      hashedRefreshToken: hashedRT,
    });

    // Filter user object to omit sensitive DB values before returning
    const safeUser = { id: docRef.id, email: newUser.email, name: newUser.name, role: newUser.role };

    console.log(`[Auth] signup success: ${safeUser.email} (id=${safeUser.id})`);
    
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
    // 1. Locate user in Firestore
    const userQuery = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
    if (userQuery.empty) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userDoc = userQuery.docs[0];
    const user = userDoc.data();
    user.id = userDoc.id;

    if (user.isBanned) {
      return res.status(401).json({ error: 'Your account has been banned' });
    }

    // 2. Validate password
    const isValid = await bcrypt.compare(password, user.passwordHash || '');
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Hash refresh token & update DB securely
    const hashedRT = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await db.collection('users').doc(user.id).update({
      hashedRefreshToken: hashedRT,
    });

    // Output mapped safe user
    const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role, isVerified: user.isVerified };

    console.log(`[Auth] login success: ${safeUser.email} (id=${safeUser.id})`);

    return res.json({ success: true, token: accessToken, accessToken, refreshToken, user: safeUser });
  } catch (error) {
    console.error('[Auth] Login Error:', error.message);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

exports.updateProfile = async (req, res) => {
  const userId = req.user?.id;
  const { name, specialisation } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized user context missing' });
  }

  try {
    // 1. Update Firestore user document
    await db.collection('users').doc(userId).update({
      name: name.trim(),
      specialisation: (specialisation || '').trim(),
    });

    // 2. Fetch the updated user document to construct safe response
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const userData = userDoc.data();

    const safeUser = {
      id: userId,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      isVerified: userData.isVerified || false,
      specialisation: userData.specialisation || '',
    };

    console.log(`[Auth] profile update success: ${safeUser.email} (id=${safeUser.id})`);

    return res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('[Auth] Profile Update Error:', error.message);
    res.status(500).json({ error: 'Internal server error during profile update' });
  }
};
