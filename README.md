# News Reader

A Flipboard-like, single-article news reader built with React + Vite + TypeScript. It uses a secure proxy for TheNewsApi so your API token never reaches the browser. In development we run a local Express proxy; in production (Vercel) we use Serverless Functions under `/api/*`.

## Features

- Clean, focused reading experience (one featured article at a time)
- Pagination with 3 articles per page
- Client caching by query and page, with prefetch for next/prev pages
- Favorites with localStorage persistence and independent pagination
- Categories vs. search rule:
  - If a search term is present, categories are ignored
  - Otherwise category filter applies
- Submit-only search (press Enter or click Search)
- Recency bias on searches: `sort=published_on` + `published_after` within last N days
- Robust error handling (maps upstream usage limit to HTTP 429 with a friendly message)
- Responsive layout, zero page scroll with external pager below the card
- Mobile enhancements: full-card overlay, two-column filters, clearer spacing

## Tech

- Frontend: React 18, Vite 5, TypeScript
- Dev proxy: Vite dev server proxies `/api` → local Express server
- Production proxy: Vercel Serverless Functions handling `/api/*`
- API: https://www.thenewsapi.com/

## Project structure

```
news-reader/
├─ api/                 # Vercel Serverless Functions (production)
│  ├─ health.js
│  └─ news/
│     └─ all.js        # mirrors local Express proxy behavior
├─ server/              # Local dev Express proxy (not used on Vercel)
│  ├─ server.js
│  └─ .env             # THENEWSAPI_TOKEN (do not commit)
├─ web/                 # React + Vite app
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ components/
│  │  │  ├─ HeadlinesList.tsx
│  │  │  └─ Pager.tsx
│  │  └─ lib/newsapi.ts
│  ├─ index.html       # includes favicon links
│  ├─ favicon.png
│  ├─ vite.config.ts
│  └─ package.json
├─ vercel.json          # build/output config for Vercel
├─ package.json         # root scripts
└─ README.md
```

## Environment variables

Set the following variables (locally and on Vercel):

- `THENEWSAPI_TOKEN` (required): your TheNewsApi token
- `SEARCH_RECENCY_DAYS` (optional, default 30): number of days for recency filter applied to searches

Local dev: create `server/.env` (copy from `server/.env.example`) and set `THENEWSAPI_TOKEN`.

Vercel: Project → Settings → Environment Variables → add `THENEWSAPI_TOKEN` (and optionally `SEARCH_RECENCY_DAYS`). Redeploy after changes.

## Local development

Prereqs: Node 18+

1) Install deps

```sh
npm run server:install
```

2) Run both servers (Express proxy + Vite dev)

```sh
npm run dev
```

- Web: http://localhost:5176
- API (proxied by Vite to Express): http://localhost:5176/api/
- Local Express server: http://localhost:5177

Health check:

```sh
curl http://localhost:5177/api/health
```

## Production (Vercel)

This repo is configured for Vercel:

- `vercel.json` builds the web app (`web/`) and serves `web/dist` as static output
- Serverless Functions under `/api/*` handle requests (no Express in production)
- The frontend keeps calling `/api/news/all` — on Vercel this hits the function at `api/news/all.js`

Deploy steps:

1) Connect the GitHub repo in Vercel
2) Add environment variables (`THENEWSAPI_TOKEN`, optional `SEARCH_RECENCY_DAYS`)
3) Deploy. The app will be available at your Vercel URL, with API under `/api`.

Note: The build copies `web/favicon.png` to the output so the favicon is visible in production.

## API surface (proxy)

- `GET /api/health` → `{ ok: true, ts: <epoch_ms> }`
- `GET /api/news/all`
  - Query params:
    - `page` (number, default 1)
    - If searching: `search=<query>` (category ignored when present)
    - Otherwise: `categories=<category>` (e.g., `tech`)
  - Enforced params:
    - `language=en`, `limit=3`
  - Search recency:
    - `sort=published_on`
    - `published_after=<YYYY-MM-DD>` within last `SEARCH_RECENCY_DAYS`
  - Error mapping:
    - 401/403 → `Authentication failed. Check your API token.`
    - `usage_limit_reached` → 429 `Daily request limit reached. Please try again later.`
    - Others → 502 with upstream details

## Favorites

- Stored locally in `localStorage`:
  - IDs key: `news-reader:favorites`
  - Data key: `news-reader:favorites:data`
- Max retained: 200 items (most recent first)

## Scripts

Root scripts:

- `npm run server:install` → installs `server/` and `web/` deps
- `npm run server:dev` → starts local Express proxy at 5177
- `npm run web:dev` → starts Vite dev server at 5176
- `npm run dev` → runs both in parallel

Web scripts (inside `web/`):

- `npm run dev` → Vite dev
- `npm run build` → Vite build to `web/dist`
- `npm run preview` → Preview built app locally

## Troubleshooting

- HTTP 429 on `/api/news/all`:
  - TheNewsApi’s daily request limit reached. Try later or upgrade your plan.
- HTTP 401/403 on `/api/news/all`:
  - Check `THENEWSAPI_TOKEN` (local `.env` or Vercel Project settings).
- Footer or pager visibility:
  - The layout uses CSS variables to size rows: `--header-h`, `--footer-h`, `--pager-h`, `--card-gap`. Adjust in `web/src/styles.css` if needed for edge screen sizes.
- Port already in use (local):
  - Free ports 5176/5177 or change them in Vite/Express configs.

## Notes

- Keep your API token out of the repo. Never commit real `.env` files.
- The production environment (Vercel) uses serverless functions instead of the local Express server.
- The client never sees the raw API token; all requests go through `/api/*`.
