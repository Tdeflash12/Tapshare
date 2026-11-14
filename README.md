# QuickShare (TapShare) — Online File & Text Sharing Platform

**Tagline:** Share Anything. Anywhere. Instantly.

QuickShare is a full-stack file and text sharing application built with React, TypeScript, Tailwind CSS, and Node.js + Express. Anyone can upload files or share text and get an instant public URL, QR code, and email-sharing options without creating an account.

## Features

- Share text, code, or Markdown content.
- Upload one or more files in a share bundle.
- Generate short-lived five-digit share codes and public URLs.
- Preview supported images, PDFs, and text-based files.
- Generate QR codes and optional short links.
- Send a share through SMTP or Resend, with a default mail-app fallback.
- Automatically remove expired shares from local storage.

## Project Structure

```text
├── api/
│   └── index.ts                       # Vercel serverless handler
├── server/
│   ├── middleware/
│   │   ├── rateLimiter.ts             # Upload, email & API rate limiters
│   │   └── upload.ts                  # Multer file filter & size limits
│   ├── routes/
│   │   └── shares.ts                  # /api/shares/* REST endpoints
│   └── services/
│       ├── emailService.ts            # Direct SMTP / Resend email delivery
│       ├── shortenerService.ts        # Link shortener (is.gd / tinyurl / v.gd)
│       └── storageService.ts          # Atomic 5-digit share metadata & storage
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx             # Minimal top bar
│   │   │   └── Footer.tsx             # Footer & link privacy notice
│   │   └── share/
│   │       ├── BottomRightGuide.tsx   # Interactive bottom-right launcher
│   │       ├── CountdownText.tsx      # Live expiration timer
│   │       ├── DailyStudentQuote.tsx  # Daily student motivation card
│   │       ├── DirectEmailForm.tsx    # Direct email & mailto fallback
│   │       ├── RecentSharesSection.tsx# Session share history
│   │       ├── SearchCodeModal.tsx    # 5-digit code lookup & saved codes
│   │       ├── ShareResultPanel.tsx   # 5-digit code tiles, short link, QR
│   │       ├── ShareViewPage.tsx      # Public /:id viewer & previews
│   │       ├── TapHandIcon.tsx        # Hand-tap badge icon
│   │       └── UploadWorkspace.tsx    # Folder/file uploader & text editor
│   ├── services/
│   │   └── shareApi.ts                # Frontend API client & session storage
│   ├── shared/
│   │   ├── dailyQuotes.ts             # Deterministic daily student quotes
│   │   ├── formatters.ts              # Byte, countdown & share URL helpers
│   │   ├── types.ts                   # Shared TypeScript interfaces
│   │   └── validation.ts              # File, bundle, text, code & email validation
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── server.ts                          # Express app & Vite dev/prod server
├── vercel.json                        # Vercel build & rewrite config
├── package.json
└── .env.example
```

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

   If npm reports a peer-dependency conflict between Vite and esbuild, use:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Create a `.env` file when server-side email or custom storage settings are needed:
   ```bash
   cp .env.example .env
   ```

   The application works without email credentials; the email form then offers a `mailto:` fallback. For direct delivery, configure either SMTP:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@example.com
   SMTP_PASS=your-app-password
   SMTP_FROM="TapShare <your-email@example.com>"
   ```
   or Resend:
   ```env
   RESEND_API_KEY=your-resend-api-key
   ```

3. Start the development server (`http://localhost:3000`):
   ```bash
   npm run dev
   ```
4. Run unit tests:
   ```bash
   npx --yes tsx --test src/shared/validation.test.ts src/shared/formatters.test.ts src/shared/dailyQuotes.test.ts server/services/emailService.test.ts server/services/shortenerService.test.ts
   ```
5. Build and run in production:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express and Vite development server |
| `npm run build` | Build the frontend for production |
| `npm start` | Start the production Express server |
| `npm run preview` | Preview the Vite production build |
| `npm run lint` | Run the TypeScript compiler without emitting files |
| `npm run clean` | Remove generated production output |

## API overview

- `GET /api/health` - Check server health.
- `GET /api/email/status` - Check whether SMTP or Resend is configured.
- `POST /api/shares/text` - Create a text share.
- `POST /api/shares/files` - Create a file share using multipart form data.
- `GET /api/shares/:id` - Read a share.
- `GET /api/shares/:id/qr` - Generate a share QR code.
- `POST /api/shares/:id/email` - Send a share by email.

## Deploy to Vercel

TapShare includes `vercel.json` and `api/index.ts` configured for Vite static hosting + Express serverless `/api/*` routing.

### Option A: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### Option B: GitHub + Vercel Dashboard
1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New Project** and import the repository.
3. Keep the detected **Vite** settings (`npm run build`, output directory `dist`).
4. Add any optional environment variables in **Project Settings -> Environment Variables**:
   - `APP_URL` — your production Vercel URL (e.g. `https://your-app.vercel.app`)
   - `RESEND_API_KEY` (or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) — required only if you want direct server-side email delivery without opening an email client.
5. Click **Deploy**.

### Important Notes for Vercel Serverless
- **Ephemeral `/tmp` storage**: When `VERCEL=1` is detected, `storageService.ts` stores files in `/tmp/tapshare-data`, which is temporary and not shared across serverless instances or cold starts. For long-lived or multi-instance production shares, connect external storage (such as Vercel Blob or S3 + a database) or host `server.ts` on a persistent Node runtime.
- **Upload payload limit**: Vercel Serverless Functions enforce a 4.5 MB request body limit per upload.

