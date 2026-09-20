# papermark-mimosa

A fork of [Papermark](https://github.com/mfts/papermark), the open-source DocSend
alternative, for **mimosa GmbH**'s internal document-sharing use — proposals, budgets,
agreements sent to our own clients. This fork exists to meet AGPLv3 §13 (Remote Network
Interaction) by construction: if we run a modified version of this software as a network
service, the modified source is offered to users interacting with it remotely by simply
being here, publicly, rather than served on request from inside the running app.

Upstream's own README is preserved at [`README.upstream.md`](README.upstream.md).

## What this fork is for, in Danilo's words

As close to DocSend as possible. Centred on sharing links and analytics per page with
time spent, confirm-receipt (who opened, when), open and download events, and signature
(Documenso, later). Data rooms come later, as our own basic feature — one link listing
several documents with the same analytics — never restored from the commercial code.

## What this fork keeps and what it drops

Upstream keeps two directories under a separate Commercial License (named in `LICENSE`):
data rooms, SAML/SCIM, workflows, AI chat, billing. This fork keeps only what upstream
licenses as AGPLv3 and everything that follows from that choice.

**No commercially-licensed code is present in this repository.** The two directories
are gone, and the ~190 core files that imported from them were resolved one of two ways:
the feature path they served was removed (data rooms, billing and upgrade prompts,
SAML, workflows, AI chat, Q&A conversations, redaction, referral programme,
office-to-PDF conversion), or the small utility they used was re-implemented in core
code (rate limiting, storage config, brand resolution, team limits, API token scopes).

Things worth knowing when running it:

- **No plan tiers.** Every team is on the full feature set; new teams are created with
  `plan = "business"` and the migration lifts existing free-plan rows. There is no
  billing UI and nothing to upgrade.
- **PDFs, images, video, spreadsheets, Notion and web links** can be shared. Word,
  PowerPoint and Keynote files are not accepted: their PDF conversion lived in the
  commercial code. Export to PDF first.
- **Data-room database tables remain** (unused) and a few shared components still carry
  data-room branches that nothing reaches. They compile, they are dead, and they will be
  replaced when the basic multi-document link is built (see *Later*).

## The plan (current status: steps 1 and 2 built, 3 to 5 scoped)

Full detail, cost estimates, and the reasoning behind each choice live in mimosa's own
working notes (`REPORTS/papermark-test.md` in the `mimosa-gsc` repo — internal, not
public). Summary:

### 1. Strip the commercial directories — done
See above.

### 2. View tracking in our own Postgres — done
Upstream sends page-by-page view analytics to a hosted third-party analytics service.
This fork stores the same events in its own Postgres instead: five tables in
`prisma/schema/events.prisma` (page views with per-page duration, link opens, in-document
clicks, video playback, webhook deliveries), the ingest functions in `lib/events/publish.ts`,
and the sixteen read queries ported one to one in `lib/events/queries.ts` — same names,
same parameters, same result shape, so the analytics screens did not change. Preserved as
before: per-page view duration, total time per visit, completion rate, download events,
the "viewed" email notification, and the per-link visitor list with email capture.

Two decisions taken with the port:

- **Viewer IP addresses are not stored.** No event table has a column for one.
- **View and click events are kept 12 months, then deleted.** `lib/events/retention.ts`
  deletes rows older than 365 days (`EVENT_RETENTION_DAYS` overrides). It runs either as
  the daily trigger.dev schedule `cleanup-view-events` (`lib/trigger/cleanup-view-events.ts`,
  03:00 UTC) or, without trigger.dev, from cron on a host with database access:
  `npx tsx scripts/cleanup-view-events.ts` once a day.

### 3. E-signature via self-hosted Documenso
`lib/signing/` is host-agnostic (plain env vars for the API host/key) and defaults to
Documenso's hosted SaaS — this fork points it at our **own self-hosted Documenso instance**
instead (Documenso is itself a separate, AGPL, properly self-hostable project). No code
change needed in this repo for that switch, only configuration.

### 4. Storage, email, login
S3-compatible object storage (self-hosted, not a third-party bucket), Google OAuth via our
own Workspace (no Hanko/passkey SaaS), and email via our own Workspace SMTP relay (no
Resend account) — all templates kept, only the transport adapter changes.

### 5. Re-skin
Typography, color and layout brought in line with mimosa's own design system — scoped
separately, after the above is working.

## Later

- **Basic multi-document link**: one link listing several documents, with the same
  per-page analytics. The cleanest seam is the `Link` ↔ `Document` relation in
  `prisma/schema/link.prisma` (one link points at one `documentId` today) plus the public
  viewer in `pages/view/[linkId]/index.tsx` and `components/view/document-view.tsx`:
  a join table between `Link` and `Document`, a list screen in the viewer, and nothing
  else, because `View` and `PageViewEvent` rows already carry both `linkId` and
  `documentId`.
- Remove the unused data-room tables and the dead data-room branches once that exists.

## Development

```bash
npm install
npx prisma generate
npx prisma migrate deploy   # includes prisma/migrations/20260920000000_postgres_view_events
npm run dev
```

Copy `.env.example` to `.env` and fill it in; no `.env` file is ever committed.

## License

- Everything in this repository is licensed under **AGPLv3** — see `LICENSE`. The two
  directories `LICENSE` names as Commercial-licensed are not present here.
- This is a fork of a copyrighted work; the original copyright notices and the full AGPLv3
  text are preserved in `LICENSE`, unchanged.
- This repository is maintained for mimosa GmbH's own internal use. It is public because
  AGPLv3 §13 asks that a modified version's source be available to anyone interacting
  with it over a network — publishing the fork here satisfies that plainly, rather than
  building a separate "source available on request" mechanism into the running app.
