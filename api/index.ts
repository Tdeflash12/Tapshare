import type { IncomingMessage, ServerResponse } from 'node:http';
import { createTapShareApp } from '../server.ts';

let cachedApp: Awaited<ReturnType<typeof createTapShareApp>> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!cachedApp) {
    cachedApp = await createTapShareApp();
  }
  return cachedApp(req as never, res as never);
}
