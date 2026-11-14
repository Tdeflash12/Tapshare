import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createSharesRouter } from './server/routes/shares.ts';
import { apiLimiter } from './server/middleware/rateLimiter.ts';
import { getEmailConfigStatus } from './server/services/emailService.ts';
import {
  ShortenerValidationError,
  shortenExternalUrl,
} from './server/services/shortenerService.ts';
import { cleanupExpiredShares, ensureStorageDirs } from './server/services/storageService.ts';

export async function createTapShareApp() {
  await ensureStorageDirs();
  await cleanupExpiredShares();

  const app = express();
  app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'TapShare', timestamp: Date.now() });
  });

  app.get('/api/email/status', (_req, res) => {
    res.json(getEmailConfigStatus());
  });

  app.post('/api/shorten', apiLimiter, async (req, res) => {
    try {
      const url = typeof req.body?.url === 'string' ? req.body.url : '';
      const result = await shortenExternalUrl(url);
      res.json(result);
    } catch (err) {
      if (err instanceof ShortenerValidationError) {
        res.status(err.statusCode).json({
          error: err.message,
          isLocalhost: err.isLocalhost,
        });
        return;
      }
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to shorten URL right now.',
      });
    }
  });

  const sharesRouter = await createSharesRouter();
  app.use('/api/shares', sharesRouter);

  return app;
}

async function startServer() {
  const app = await createTapShareApp();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const timer = setInterval(() => {
    cleanupExpiredShares().catch(() => undefined);
  }, 30 * 60 * 1000);
  timer.unref();

  app.listen(port, '0.0.0.0', () => {
    console.log(`TapShare server listening on http://localhost:${port}`);
  });
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('server.ts') ||
  process.argv[1]?.endsWith('server.js');

if (isMainModule) {
  startServer().catch((err) => {
    console.error('Failed to start TapShare server:', err);
    process.exit(1);
  });
}
