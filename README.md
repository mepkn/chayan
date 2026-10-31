# Picki

Random list selector: create a list, hit **Select** (or Space), and watch one of three
animated themes (Cyber HUD, Gold Stadium, Crimson Arena) land on a winner.

## Features

- Sign-in with email + password; sign-up verifies the email with a 6-digit code and "Forgot password?" resets by code. Only emails in `ALLOWED_EMAILS` can sign up, and each user sees only their own lists.
- Lists with shareable `/lists/:slug` URLs: anyone with the link can watch the list and its picks live, only the owner can edit or pick.
- Inline rename, duplicate and delete.
- Three selection modes: no repetition (rounds), allow repetition, auto-restart.
- Skip a pick (e.g. someone is absent) and re-pick, full selection history.
- Per-list settings: theme, animation duration, reduced motion. Sound effects and confetti.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (Base UI) · React Router · Framer Motion · Convex · Vitest.

## Development

Requires Node 22.18+ (`.nvmrc` pins 22).

```bash
cd backend
npm install
npx convex deployment select local   # first time only: dev runs on a local backend
npm run dev                  # starts the local backend and pushes convex/ (keep it running)
npm run setup:auth           # first time only: auth signing keys
npx convex env set SITE_URL http://localhost:5173
npx convex env set ALLOWED_EMAILS you@example.com

cd ../web
npm install
npm run dev                  # web app at http://localhost:5173
```

## Scripts

| Command | What it does |
|---|---|
| `backend/`: `npm run dev` | Local Convex backend; pushes `convex/` on every change |
| `backend/`: `npm run deploy` | Push the functions to production (`scripts/deploy.sh` does this for you) |
| `backend/`: `npm run setup:auth` | Auth signing keys (`node scripts/setup-auth-keys.ts --apply --prod` for production) |
| `backend/`: `npm run check` | Typecheck and lint `convex/` and `scripts/` |
| `web/`: `npm run dev` | Dev server at http://localhost:5173 |
| `web/`: `npm run build` | Typecheck and production build into `web/dist/` |
| `web/`: `npm run check` | Typecheck, lint and tests (Vitest: selection/round rules) |
| `scripts/check.sh` | Both checks; run before committing |
| `scripts/deploy.sh` | Checks, deploys Convex to production, builds and uploads to the VPS |
| `DRY_RUN=1 scripts/deploy.sh` | Same, but only previews: nothing is deployed or uploaded |

## Deployment

`scripts/deploy.sh` deploys `backend/convex/` to the production deployment, builds the site with
that deployment's URL, and syncs `web/dist/` to the VPS. Settings live in each part's
`.env.prod.local` (git-ignored, see the `.env.example` next to each): `backend/.env.prod.local` has
`CONVEX_DEPLOY_KEY` (Convex dashboard → Production → Settings → Deploy Keys), and
`web/.env.prod.local` has `DEPLOY_HOST` / `DEPLOY_PORT` / `DEPLOY_DIR`. Because routes like `/lists/:slug` are client-side,
Caddy needs an SPA fallback:

```
try_files {path} /index.html
```

## How it works

- Auth is Convex Auth (Password). `ALLOWED_EMAILS` is checked at sign-up/sign-in and again on every
  request (`backend/convex/lib/access.ts`), so removing an email cuts off existing sessions. Every mutation
  checks that the caller owns the list.
- Sign-up verifies the email with a 6-digit code, and "Forgot password?" resets by code
  (`backend/convex/otp.ts`, Resend from `Picki <noreply@send.pknspace.com>`; without `RESEND_API_KEY`
  the code is only logged in the `convex dev` output). Users from before verification were marked
  verified by a one-off migration (2026-10-31).
- Tools for kunji: `backend/convex/http.ts` adds kunji's App contract routes via `addKunjiRoutes`
  (`backend/convex/lib/kunji.ts`, copied from karya): `GET /kunji/tools`, `POST /kunji/access` and
  `POST /kunji/call`, behind `Authorization: Bearer $KUNJI_SECRET`. The user is the single verified
  `users` row with that email, still in `ALLOWED_EMAILS`. Tools (`backend/convex/kunji.ts`):
  `list_lists`, `get_list` (read-only), `pick_random` (records the pick like the Pick button) and
  `add_item`; a list is named by its name or slug, and only the user's own lists are found.
- Production env vars: `JWT_PRIVATE_KEY`/`JWKS` (`node scripts/setup-auth-keys.ts --apply --prod` in `backend/`),
  `SITE_URL=https://picki.pknspace.com`, `ALLOWED_EMAILS`, `RESEND_API_KEY`, and `KUNJI_SECRET` / `KUNJI_URL` (kunji's `.convex.site` URL).

- `backend/` is the Convex backend with its own `package.json`; `backend/convex/` holds the schema and functions (lists, items, selections). The random pick is
  done server-side in `selections:selectRandomItem`.
- `web/` is the Vite app, with its own `package.json`; it imports the backend as `@convex/...`
  and reads `backend/.env.local`.
- `web/src/lib/store.tsx` wraps Convex in a `PickiProvider`; components use `usePicki()`.
- `web/src/pages/` has the two routes; `web/src/components/selector/` the three animated themes.
