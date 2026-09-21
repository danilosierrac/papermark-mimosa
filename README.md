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

- Storage, email, and login on our own services. — done
- A mimosa re-skin of the client-facing viewer and email. — done, see the Asana card; dashboard/internal UI still Papermark-styled
- **Spaces**: one link, several documents, email gate, download toggle,
  expiry, per-document and per-page analytics, in the mimosa design
  language — DocSend's "Space" equivalent. The Prisma schema is intact
  (`Dataroom`, `DataroomDocument`, `DataroomFolder`, `DataroomBrand`,
  plus the Q&A/diligence models) and a handful of backend helpers
  survived (`lib/emails/send-dataroom-notification.ts`, dataroom digest
  cron, notification prefs), but the `ee/` strip removed the entire
  dashboard UI to create/manage a dataroom and the public multi-document
  viewer — both need to be built, not restyled. Not started.
- DocSend-style signature fields on documents (agreement, budget). — live,
  see [`docs/SIGNING.md`](docs/SIGNING.md). Per-link, doesn't need Spaces.
  Open item: the in-app embedded signing flow needs a paid Documenso plan
  (free tier blocks it); hosted (non-embedded) signing and the webhook
  work today on the free tier.

## Credits

A fork of [Papermark](https://github.com/mfts/papermark) by mfts. Upstream README preserved at [`README.upstream.md`](README.upstream.md).
