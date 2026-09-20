# papermark-mimosa

A minimal, self-hosted take on Papermark for sharing documents with clients.

Upstream's own README is preserved at [`README.upstream.md`](README.upstream.md).

## What it does

- Share a document by link.
- See who opened it, when, and how long they spent on each page.
- Get told by email when a document is opened.
- Track downloads.
- E-signature via Documenso. Coming: the client already exists in the code and defaults to Documenso's hosted service, it is not yet pointed at a self-hosted instance.

## What it leaves out

Data rooms, SSO, workflows, AI chat, billing, and third party analytics. It keeps the core and removes the rest, so the whole thing can run on one Postgres database and one object store.

## How the analytics work

Every page view, link open, click, video play, and webhook delivery is an event row in Postgres. No IP addresses are stored. Events are kept for twelve months, then deleted (`EVENT_RETENTION_DAYS` to override). From these rows: per-page view duration, completion rate, downloads, and the per-link visitor list.

## Running it

Env vars that matter now:

- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `POSTGRES_PRISMA_URL`, `POSTGRES_PRISMA_URL_NON_POOLING`
- `BLOB_READ_WRITE_TOKEN`, or the `NEXT_PRIVATE_UPLOAD_*` vars for S3
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `EVENT_RETENTION_DAYS`, optional, defaults to 365

```bash
npm install
npx prisma generate
npx prisma migrate deploy   # includes prisma/migrations/20260920000000_postgres_view_events
npm run dev
```

Copy `.env.example` to `.env` and fill it in. No `.env` file is ever committed.

The retention cleanup runs once a day: either the trigger.dev schedule `cleanup-view-events` (`lib/trigger/cleanup-view-events.ts`, 03:00 UTC), or, without trigger.dev, `npx tsx scripts/cleanup-view-events.ts` from cron on a host with database access.

## Licence

This repository is licensed under AGPL-3.0, see `LICENSE`. The upstream directories under a separate licence, `ee/` and `app/(ee)/`, are not present here.

## Roadmap

- Documenso for signatures, self-hosted instead of the hosted default.
- Storage, email, and login on our own services.
- A mimosa re-skin.
- A basic multi-document link.

## Credits

A fork of [Papermark](https://github.com/mfts/papermark) by mfts. Upstream README preserved at [`README.upstream.md`](README.upstream.md).
