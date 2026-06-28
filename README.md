# ExpiryGuard

ExpiryGuard is a modern SaaS for tracking company document expiry dates, surfacing in-app alerts, importing Excel sheets, and sending email reminders.

## Features

- Secure auth with email/password (Auth.js)
- Multi-company document tracking per workspace
- Automatic expiry statuses: Valid, Expiring soon (30 days), Urgent (7 days), Expired
- Excel import with merge behavior (company + document + number)
- Dashboard with metrics, upcoming expiries, alerts, and recent imports
- Email reminders via Resend + Vercel Cron (optional)

## Tech stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL (Neon)
- Auth.js v5
- Resend (email)
- xlsx (Excel import)

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in:

- `DATABASE_URL` from Neon
- `AUTH_SECRET` (`openssl rand -base64 32`)
- `AUTH_URL=http://localhost:3000`

Optional for email reminders:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CRON_SECRET`

### 3. Push database schema

```bash
npx prisma db push
```

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Excel import format

Expected columns:

- COMPANY NAME
- DOC NAME
- NUMBER
- EXPIERY DATE

Blank company cells inherit the previous row's company name. Existing records merge by company + document + number.

## Deploy to Vercel + Neon

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables from `.env.example`
4. Set `AUTH_URL` to your production domain
5. Connect Neon Postgres and paste `DATABASE_URL`
6. Deploy

After deploy:

```bash
npx prisma db push
```

### Vercel Cron + Resend

`vercel.json` schedules `/api/cron/check-expiry` daily at 08:00 UTC.

Set these in Vercel:

- `CRON_SECRET` — random secret; Vercel sends `Authorization: Bearer <CRON_SECRET>`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Email reminders can be configured per user in Settings. The default schedule is:

- 30 days before expiry
- 14 days before expiry
- 7 days before expiry
- 3 days before expiry
- 1 day before expiry
- Expired

Duplicate emails are prevented with `NotificationLog.reminderKey`, so the same document/user/reminder milestone is only sent once.

Production reminders are sent to `User.notificationEmail` when configured.
If no override is set, ExpiryGuard falls back to the authenticated account
email (`User.email`). The local `RESEND_TEST_TO` variable is used only by the
sample test command.

Users can disable email reminders or customize the schedule from
`/dashboard/settings` without changing their login email.

### Test email locally

After adding `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to `.env`, send a sample email:

```bash
npm run email:test -- you@example.com
```

This command sends a standalone sample email and does not create fake documents or write reminder logs.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run email:test -- you@example.com` | Send a local Resend test email |
| `npm run lint` | ESLint |
| `npx prisma db push` | Sync schema to database |
| `npx prisma studio` | Database GUI |

## Security notes

- Never commit `.env`
- Rotate database credentials if exposed
- Use Neon direct connection for schema changes
- Protect cron route with `CRON_SECRET`

## Branding

Customer-facing product name: **ExpiryGuard**

Internal package/folder names may still use legacy `permit-guard` identifiers.
