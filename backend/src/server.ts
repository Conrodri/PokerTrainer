import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { initFlopPool, initExpertFlopPool } from './controllers/postflopController';
import { initEquityPool } from './controllers/trainingController';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Trust the reverse proxy on Render/Heroku so express-rate-limit can read
// the real client IP from X-Forwarded-For without throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

// Security headers (HSTS, nosniff, frameguard, etc.). This is a JSON API consumed
// by a cross-origin SPA, so allow cross-origin resource access and skip the
// HTML-only CSP that would otherwise add no value here.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// Support multiple origins separated by comma in CORS_ORIGIN env var
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    // Also allow *.vercel.app subdomains automatically
    if (/^https:\/\/[^.]+\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// Bound request bodies. The largest legitimate payload (an expert profile's
// per-position 169×4 mix) is ~20 KB, so 64 KB leaves ample headroom while
// blocking oversized-payload abuse.
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: 'Too many requests' },
}));

app.use('/api', routes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Honour client-error statuses set upstream — e.g. body-parser's 413 (payload
  // too large) or 400 (malformed JSON) — instead of masking them as a 500.
  const status = (err as any)?.status ?? (err as any)?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ success: false, error: err.message || 'Bad request' });
    return;
  }
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🃏 PokerPeak API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  initFlopPool();
  initExpertFlopPool();
  initEquityPool();
});

export default app;
