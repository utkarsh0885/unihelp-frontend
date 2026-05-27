const jwt = require('jsonwebtoken');

// ── JWT Access Token Verification ─────────────────────────────────────────────
exports.authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(
        `[Auth] ❌ 401 — Missing/malformed token | ${req.method} ${req.path} | origin=${req.headers.origin ?? 'none'}`
      );
      return res.status(401).json({ error: 'Access token missing or invalid format' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback_secret';

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, role, ... }

    next();
  } catch (error) {
    console.warn(`[Auth] ❌ 401 — ${error.name}: ${error.message} | ${req.method} ${req.path}`);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
};

// ── Role-based Authorization ──────────────────────────────────────────────────
exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'User role info missing' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(
        `[Auth] ❌ 403 — role="${req.user.role}" not in [${allowedRoles.join(', ')}] | ${req.method} ${req.path}`
      );
      return res.status(403).json({
        error: `Access Denied. Requires one of: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};
