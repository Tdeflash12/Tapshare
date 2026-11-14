# TapShare — Online File & Text Sharing Platform

**Tagline:** Share Anything. Anywhere. Instantly.

TapShare is a simple, full-stack file and text sharing application built with React, TypeScript, Tailwind CSS, and Node.js + Express. Anyone can upload files or share text and get an instant public URL, QR code, and Gmail Compose link without creating an account.

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
2. Start the development server (`http://localhost:3000`):
   ```bash
   npm run dev
   ```
3. Run unit tests:
   ```bash
   npx --yes tsx --test src/shared/validation.test.ts src/shared/formatters.test.ts src/shared/dailyQuotes.test.ts server/services/emailService.test.ts server/services/shortenerService.test.ts
   ```
4. Build and run in production:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

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

