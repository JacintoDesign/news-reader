
function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

module.exports = async function handler(req, res) {
  const token = process.env.THENEWSAPI_TOKEN;
  if (!token) {
    return res.status(500).json({ message: 'Server misconfiguration: missing THENEWSAPI_TOKEN' });
  }

  const { page = '1', categories, search } = req.query;
  const params = new URLSearchParams();
  params.set('api_token', token);
  params.set('language', 'en');
  params.set('limit', '3');
  params.set('page', String(page || '1'));

  if (search && String(search).trim()) {
    params.set('search', String(search).trim());
    params.set('sort', 'published_on');
    const recencyDays = Number(process.env.SEARCH_RECENCY_DAYS || '30');
    params.set('published_after', daysAgoISO(recencyDays));
  } else {
    params.set('categories', String(categories || 'tech'));
  }

  const upstreamUrl = `https://api.thenewsapi.com/v1/news/all?${params.toString()}`;

  try {
    const upstreamResp = await fetch(upstreamUrl, {
      method: 'GET', headers: { 'Accept': 'application/json' }
    });

    const text = await upstreamResp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    // Map upstream limits/errors
    if (!upstreamResp.ok) {
      const status = upstreamResp.status;
      if (status === 401 || status === 403) {
        return res.status(status).json({ message: 'Authentication failed. Check your API token.' });
      }
      // Sometimes limit reached comes with 4xx/5xx and code usage_limit_reached
      if (data && data.code === 'usage_limit_reached') {
        return res.status(429).json({ message: 'Daily request limit reached. Please try again later.' });
      }
      return res.status(502).json({ message: 'Upstream error', status, details: data || text });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data || { data: [] });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ message: 'Failed to proxy request' });
  }
}
