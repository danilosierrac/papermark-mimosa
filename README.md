# papermark-mimosa

A fork of [Papermark](https://github.com/mfts/papermark), the open-source DocSend
alternative, for **mimosa GmbH**'s internal document-sharing use — proposals, budgets,
agreements sent to our own clients. This fork exists to meet AGPLv3 §13 (Remote Network
Interaction) by construction: if we run a modified version of this software as a network
service, the modified source is offered to users interacting with it remotely by simply
being here, publicly, rather than served on request from inside the running app.

Upstream's own README is preserved at [`README.upstream.md`](README.upstream.md).

## What this fork is for

Papermark's `ee/` and `app/(ee)/` directories are under a separate Commercial License
(see `LICENSE`, `ee/LICENSE.md`) — Data Rooms, SAML/SCIM, workflows, AI chat, billing.
This fork keeps only what's licensed as AGPLv3 (the code outside those two directories)
and everything that follows from that choice.

**No commercially-licensed code is present in this repository.**

## The plan (current status: scoped, not yet built)

Full detail, cost estimates, and the reasoning behind each choice live in mimosa's own
working notes (`REPORTS/papermark-test.md` in the `mimosa-gsc` repo — internal, not
public). Summary:

### 1. Strip `ee/` and `app/(ee)/`
Both directories are deleted entirely — no commercially-licensed file is present in this
repo. 28 core files import small utilities from those directories (rate limiting, brand
resolution, billing-pause checks); each import is either removed (if the feature it
supports — data rooms, SAML/SCIM, workflows, AI chat, billing — is dropped) or the small
utility is re-implemented directly in the surviving core code.

### 2. View tracking without Tinybird
Tinybird (page-by-page view analytics) is a third-party hosted dependency we don't want.
Replaced with our own Postgres: two models for view/duration and click events, a small
ingest route per event type, and the ~16 read queries ported 1:1 (Tinybird's own SQL for
this feature is already plain `SELECT`/`GROUP BY`/`SUM`/`COUNT DISTINCT` — no ClickHouse-
specific function beyond one, itself unnecessary at this scale). Optionally: one aggregate
event per document view forwarded to our own existing analytics pipeline.

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

## License

- Everything in this repository, having had `ee/` and `app/(ee)/` removed, is licensed
  under **AGPLv3** — see `LICENSE`.
- This is a fork of a copyrighted work; the original copyright notices and the full AGPLv3
  text are preserved in `LICENSE`.
- This repository is maintained for mimosa GmbH's own internal use. It is public because
  AGPLv3 §13 asks that a modified version's source be available to anyone interacting
  with it over a network — publishing the fork here satisfies that plainly, rather than
  building a separate "source available on request" mechanism into the running app.
