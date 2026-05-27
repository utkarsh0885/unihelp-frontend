require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');
const ApiError = require('./utils/ApiError');

const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const { initSocket } = require('./config/socket');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

// ── Production startup guard ──────────────────────────────────────────────────
const REQUIRED_ENV_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'FRONTEND_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
];

const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach((v) => console.error(`   - ${v}`));
  console.error('Set these in your Render dashboard → Environment tab.');
  process.exit(1);
}

// ── Resolve dynamic base URL ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API — not serving HTML
  crossOriginEmbedderPolicy: false,
}));

// ── Trust proxy (required for Render reverse proxy) ──────────────────────────
app.set('trust proxy', 1);

// ── REQUEST LOGGER ────────────────────────────────────────────────────────────
// Logs every incoming request: method, path, origin, and status when done.
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.referer || 'no-origin';
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 400 ? '⚠️ ' : '✅';
    console.log(
      `${level} ${req.method} ${req.path} | status=${res.statusCode} | origin=${origin} | ${ms}ms`
    );
  });
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,           // e.g. https://unihelp.vercel.app
  'http://localhost:8081',            // Expo web dev
  'http://localhost:19006',           // Expo web (legacy)
  'http://localhost:3000',            // local backend self-calls
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow no-origin (React Native, Expo Go, Postman, curl)
      if (!origin) return callback(null, true);

      const allowed =
        ALLOWED_ORIGINS.includes(origin) ||       // exact match list
        /^https?:\/\/.*\.vercel\.app$/.test(origin) ||  // any vercel.app subdomain
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||   // any localhost port
        /^exp:\/\//.test(origin);                       // Expo Go deep links

      if (allowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] ❌ Blocked origin: "${origin}"`);
        callback(new Error(`CORS: Origin "${origin}" is not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Handle pre-flight OPTIONS for all routes explicitly
app.options('*', cors());

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Input Sanitization (NoSQL injection prevention) ───────────────────────────
// Strip any keys starting with $ or containing . from req.body/query/params
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
    secret: process.env.SESSION_SECRET,
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

// ── Health check ──────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'ok' : 'degraded',
    message: 'UniHelp backend is running',
    database: dbStates[dbState] || 'unknown',
    env: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// ── 404 handler — catches any route not defined above ─────────────────────────
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl} — route not found`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
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

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  // Mongoose CastError (bad ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ error: 'Invalid ID format' });
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
  // Connect to DB FIRST (fixes Bug #11 — socket/routes can't use DB before connection)
  await connectDB();

  // Initialize Socket.io (currently a no-op stub)
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`\n✅ UniHelp backend running on port ${PORT}`);
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
    mongoose.connection.close(false).then(() => {
      console.log('   MongoDB connection closed.');
      process.exit(0);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('   ⚠️  Forced exit after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
