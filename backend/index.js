require('dotenv').config();

// ── Centralized env validation (MUST be first import after dotenv) ────────────
// Crashes immediately if any required secret is missing or weak.
const env = require('./config/env');

const express = require('express');
const http = require('http');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');
const ApiError = require('./utils/ApiError');

const path = require('path');
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const notesRoutes = require('./routes/notes');
const { initSocket } = require('./config/socket');
const { initFirebase } = require('./config/db');

const app = express();
const server = http.createServer(app);

// ── Resolve dynamic base URL ──────────────────────────────────────────────────
const PORT = env.PORT;
const BASE_URL = env.BASE_URL;

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API — not serving HTML
  crossOriginEmbedderPolicy: false,
}));

// Trust reverse proxy (Render load balancers)
app.set('trust proxy', 1);

// ── CORS middleware ───────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:8081',                 // Local Expo Web client
  process.env.FRONTEND_URL,                // Production Vercel client
  'https://unihelp-frontend-iota.vercel.app',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      // Check if origin is in whitelist
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*') return true;
        return origin === allowed || origin.startsWith(allowed);
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Rejected origin: ${origin}`);
        callback(new Error(`CORS: Origin "${origin}" not allowed by security policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200,
  })
);

// Handle pre-flight OPTIONS for all routes explicitly
app.options('*', cors());

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Input Sanitization ────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // raised from 100 → polled feed needs headroom
  message: { error: 'Too many requests, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.ip,
});
app.use(globalLimiter);

// Auth routes: stricter limit to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later' },
});

// ── Session middleware ────────────────────────────────────────────────────────
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes — only used during OAuth redirect
    },
  })
);

// ── Passport ──────────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/auth', googleAuthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notes', notesRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'UniHelp backend is running',
    database: 'Firestore (Firebase Admin SDK)',
    timestamp: new Date().toISOString(),
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  // CORS errors
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  // ApiError (operational, expected)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Unexpected errors
  console.error('[Server Error]', err.message, err.stack?.split('\n')[1] ?? '');
  res.status(500).json({ error: 'An unexpected server error occurred' });
});

// ── Start server ──────────────────────────────────────────────────────────────
const startServer = async () => {
  // Initialize Firebase Admin SDK
  await initFirebase();

  // Initialize Socket.io (no-op stub)
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`\n✅ UniHelp backend running on port ${PORT}`);
    console.log(`📡 Database:                Firebase Firestore`);
    console.log(`🌐 Allowed frontend origin: ${process.env.FRONTEND_URL}`);
    console.log(`🔐 Google OAuth entry:      ${BASE_URL}/auth/google`);
    console.log(`📞 Google OAuth callback:   ${process.env.GOOGLE_CALLBACK_URL}`);
    console.log(`🏥 Health check:            ${BASE_URL}/health\n`);
  });

  // ── Keep-alive self-ping (prevents Render free tier sleep) ──────────────────
  if (process.env.NODE_ENV === 'production') {
    const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes (Render sleeps at 15)
    setInterval(() => {
      const url = `${BASE_URL}/health`;
      console.log(`[Keep-Alive] Pinging ${url}...`);
      fetch(url).catch((err) => console.warn('[Keep-Alive] Ping failed:', err.message));
    }, KEEP_ALIVE_INTERVAL);
    console.log(`⏰ Keep-alive cron active: pinging /health every 14 minutes`);
  }
};

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('   HTTP server closed.');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('   ⚠️  Forced exit after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
