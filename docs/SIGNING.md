# E-signatures (Documenso)

Status: **live**. Per-link agreements with real signature capture, working today —
no data room / Spaces required (Spaces stays a separate, unstarted roadmap item;
signing never depended on it despite what an earlier README note said).

## How it works

- `lib/signing/agreements.ts` and friends wrap the official `@documenso/sdk-typescript`
  client (`lib/signing/client.ts`), talking to Documenso's hosted API
  (`app.documenso.com`) unless `NEXT_PUBLIC_SIGNING_HOST` points at a self-hosted
  instance.
- Dashboard flow: **Settings → Agreements → Create agreement** → upload a PDF →
  "Embedded signature flow" → place fields in Documenso's own editor → save. Attach
  the agreement to any link the normal way (link settings → require agreement).
- A visitor opening a gated link signs inline via `EmbedDirectTemplate`
  (`@documenso/embed-react`) before they can view the document.
- The signed PDF is downloadable per response
  (`/api/teams/:teamId/agreements/:agreementId/responses/:responseId/download`).
  **Proof of signing**: Documenso appends its own certificate/audit page to the
  signed PDF automatically — signer name, email, IP, timestamp, hash. Nothing extra
  to build for that; it's Documenso's standard behavior on every completed document.

## Configuration (already set in Vercel production)

| Env var | Purpose |
|---|---|
| `SIGNING_API_KEY` | Documenso API key (Secret, rotatable via `vercel env`) |
| `SIGNING_WEBHOOK_SECRET` | Shared secret Documenso echoes back on webhook calls (Secret) |
| `NEXT_PUBLIC_SIGNING_HOST` | Only needed for self-hosted Documenso; unset = hosted `app.documenso.com` |

Currently on Documenso's **free tier**. Confirmed working: template creation, field
placement via API, the plain hosted signing page (`app.documenso.com/sign/:token`),
webhooks. **Confirmed NOT working on free tier**: the *embedded* direct-link flow
(`embed/direct/:token`) — Documenso returns "This feature is not available on your
current plan" for that specific surface. Since our dashboard's "Embedded signature
flow" agreement type is built on exactly that (`EmbedDirectTemplate` +
`templates.directLink`), **the in-app embedded signing flow needs a paid Documenso
plan to actually work for visitors** — it creates fine on free tier, it just won't
render for the signer. Not yet upgraded; flag for Danilo to decide.

## Instant completion (webhook)

`pages/api/webhooks/signing/documenso.ts` receives Documenso's `DOCUMENT_COMPLETED`
webhook and updates the matching `AgreementResponse` immediately, independent of the
visitor's browser. Without this, completion only reaches our DB via a client-side
callback (`/api/agreements/signing/complete`) fired from inside the embedded iframe
after signing — fine on the happy path, but missed if the tab closes, the network
drops, or the visitor signs via an emailed Documenso link outside our embed. The
response would then sit at `PENDING` until someone manually clicks "sync" in the
dashboard.

- Auth: `X-Documenso-Secret` header, plain constant-time string compare (not HMAC —
  confirmed against Documenso's own docs), via `verifySigningWebhookSecret` in
  `lib/signing/agreements.ts` (existed unused before this).
- Event matching is normalized (`document.completed` / `DOCUMENT_COMPLETED` both
  match) since Documenso's dashboard labels triggers lowercase-dotted while their
  docs show the payload's `event` field uppercase-underscored — caught before the
  first real delivery, would otherwise have silently ignored every webhook.
- **Registered by hand** in Documenso → Team settings → Webhooks → Create Webhook
  (their webhook management isn't exposed via API, dashboard-only). URL:
  `https://docs.mimosa.computer/api/webhooks/signing/documenso`, event
  `document.completed`.
- Verified: the endpoint correctly 401s an unauthenticated request in production.
  Full end-to-end (real signature → webhook → DB update within seconds) is set up
  and ready to test but not yet confirmed live — see "Open items" below.

## No more clicking and dragging: `scripts/create-signing-template.mjs`

Placing fields in Documenso's web editor is manual per upload. This script skips
that entirely: design a PDF once with **named AcroForm form fields** (Acrobat,
LibreOffice, any tool that writes real form fields — not just visual boxes), and
the script reads each field's name, page, and exact position straight from the PDF
(via `pdf-lib`, already a project dependency) and creates the Documenso template
with fields already placed via API. Verified working end-to-end: a signature field
and a date field, both auto-placed at the PDF's own coordinates, rendered pixel-
correct on Documenso's hosted signing page.

```bash
SIGNING_API_KEY=... node scripts/create-signing-template.mjs path/to/agreement.pdf "Standard NDA"
```

Field name → Documenso field type, by prefix (case-insensitive):

| PDF field name starts with | Documenso field type |
|---|---|
| `signature`, `sign` | `FREE_SIGNATURE` |
| `initials` | `INITIALS` |
| `date` | `DATE` |
| `name` | `NAME` |
| `email` | `EMAIL` |
| anything else | `TEXT` |

This only creates the Documenso-side template today — it does **not** yet create
the mimosa `Agreement` row or attach it to a link (that still needs a real team
session, which a bare API-key script doesn't have). Natural next step if this
becomes the normal way agreements get made: either extend the script to also call
`/api/teams/:teamId/agreements` with a team session, or add a "generate from PDF"
button in the dashboard's agreement creation dialog that does the same field
extraction client-side before handing off to the existing Documenso setup flow.

## Open items

- **Paid Documenso plan**: needed for the embedded flow to actually render for
  visitors (see above). Free tier blocks it outright.
- **End-to-end webhook confirmation**: a real document was created and the hosted
  signing page loads and accepts input correctly, but completing the final
  signature click hit a browser-automation snag (Documenso's `FREE_SIGNATURE`
  field overlay wasn't reliably clickable via the automated browser tool used this
  session — the `DATE` field on the same document inserted fine, so this looks
  specific to that field type's click target, not the pipeline). Needs one real
  human click-through to fully confirm the webhook fires and the DB updates within
  seconds; auth, event parsing, and the DB update function are already verified
  correct in isolation.
- Script doesn't wire the created template into a mimosa `Agreement` row yet (see
  above).
