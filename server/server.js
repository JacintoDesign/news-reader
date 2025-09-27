/* Express proxy server for TheNewsApi */
const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');

// Ensure we load env from server/.env when started from project root
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5177;
const BASE_URL = 'https://api.thenewsapi.com/v1/news/all';
const TOKEN = process.env.THENEWSAPI_TOKEN;
const SEARCH_RECENCY_DAYS = process.env.SEARCH_RECENCY_DAYS
  ? Math.max(0, parseInt(process.env.SEARCH_RECENCY_DAYS, 10) || 0)
  : 30;

function formatDateYMDUTC(d) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Health route
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'news-reader-proxy', time: new Date().toISOString() });
});

// Proxy route: /api/news/all
app.get('/api/news/all', async (req, res) => {
  try {
    if (!TOKEN) {
      console.warn('[proxy] Missing THENEWSAPI_TOKEN. Create server/.env and set your token.');
      return res.status(500).json({ message: 'Server configuration error: missing THENEWSAPI_TOKEN' });
    }

    const pageInput = parseInt(req.query.page ? String(req.query.page) : '1', 10);
    const page = Number.isFinite(pageInput) && pageInput > 0 ? pageInput : 1;

    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const rawCategories = typeof req.query.categories === 'string' ? req.query.categories.trim() : '';

    const params = new URLSearchParams();
    params.set('language', 'en');
    params.set('limit', '3');
    params.set('page', String(page));

    // Search vs Category rule
    if (rawSearch) {
      params.set('search', rawSearch);
      // Ensure recent results when searching: sort by publish date and restrict to last N days
      params.set('sort', 'published_on');
      if (SEARCH_RECENCY_DAYS > 0) {
        const after = new Date(Date.now() - SEARCH_RECENCY_DAYS * 24 * 60 * 60 * 1000);
        params.set('published_after', formatDateYMDUTC(after));
      }
    } else {
      params.set('categories', rawCategories || 'tech'); // default to tech
    }

    // Build URL without token for logging
    const urlWithoutToken = `${BASE_URL}?${params.toString()}`;
    // Log proxied URL (no token)
    console.log(`[proxy] GET ${urlWithoutToken}`);

    // Add token for upstream call
    params.set('api_token', TOKEN);
    const upstreamUrl = `${BASE_URL}?${params.toString()}`;

    const upstreamResp = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      // No body for GET
    });

    const contentType = upstreamResp.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!upstreamResp.ok) {
      // Try to parse error body
      let body;
      try { body = isJson ? await upstreamResp.json() : await upstreamResp.text(); } catch { body = undefined; }
      const status = upstreamResp.status;

      // Normalize usage-limit errors even if TheNewsApi doesn't return 429
      const code = body && typeof body === 'object' && body.error && body.error.code ? String(body.error.code) : '';
      if (status === 429 || /usage_limit/i.test(code)) {
        return res.status(429).json({ message: 'Daily request limit reached. Please try again later.' });
      }
      if (status === 401 || status === 403) {
        return res.status(status).json({ message: 'TheNewsApi authentication failed. Check your API token.' });
      }
      return res.status(502).json({ message: 'Upstream error from TheNewsApi.', details: body });
    }

    const data = isJson ? await upstreamResp.json() : await upstreamResp.text();
    res.status(200).json(data);
  } catch (err) {
    console.error('[proxy] Unexpected error:', err && err.message ? err.message : err);
    res.status(500).json({ message: 'Server error while fetching news.' });
  }
});

app.listen(PORT, () => {
  console.log(`[proxy] listening on http://localhost:${PORT}`);
});
