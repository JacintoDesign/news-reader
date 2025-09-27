# News Reader Proxy

Simple Express proxy to call TheNewsApi securely without exposing tokens to the browser.

- Port: 5177 (configurable via `PORT`)
- Routes:
  - `GET /api/health` -> health check
  - `GET /api/news/all` -> proxies to `https://api.thenewsapi.com/v1/news/all`

Security:
- Reads `THENEWSAPI_TOKEN` from `.env` (do not commit real tokens)
- Never logs the raw token
- Logs the proxied URL (without token) for client-side debugging

Required query params:
- `language=en` (enforced by server)
- `limit=3` (enforced by server)
- `page` (default 1, integer >= 1)
- `categories` OR `search` (search takes precedence if provided and non-empty)

Error mapping:
- 429: `Daily request limit reached…`
- 401/403: `TheNewsApi authentication failed…`
- others: generic server error

Run:
1. Create `server/.env` from `.env.example` and fill `THENEWSAPI_TOKEN`
2. From project root:
   - `npm run server:install` (installs both server and web deps)
   - `npm run dev` (starts proxy and web dev server)
