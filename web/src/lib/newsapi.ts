export type Article = {
  uuid?: string;
  id?: string;
  url: string;
  title: string;
  description?: string;
  snippet?: string;
  image_url?: string | null;
  published_at?: string;
  source?: string | { name?: string };
  category?: string;
  language?: string;
  author?: string | null;
};

export type NewsResponse = {
  data: Article[];
  meta?: {
    found?: number;
    returned?: number;
    limit?: number;
    page?: number;
  };
};

export type Query = {
  page: number;
  category?: string;
  search?: string;
};

// Builds the client-side proxied URL (for logging only; token is not in this URL)
function buildClientUrl(q: Query) {
  const params = new URLSearchParams();
  params.set('page', String(q.page));
  if (q.search && q.search.trim()) {
    params.set('search', q.search.trim());
  } else if (q.category && q.category.trim()) {
    params.set('categories', q.category.trim());
  }
  // language and limit enforced on server; not needed here for the proxied call
  return `/api/news/all?${params.toString()}`;
}

export async function fetchNews(q: Query, signal?: AbortSignal): Promise<NewsResponse> {
  const url = buildClientUrl(q);
  // Debug: client logs proxied URL (no token)
  console.info('[client] GET', url);

  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal
  });

  if (!resp.ok) {
    let message = 'Failed to fetch news.';
    try {
      const data = await resp.json();
      if (data && typeof data.message === 'string') {
        message = data.message;
      }
    } catch {
      // ignore
    }
    const error: any = new Error(message);
    (error as any).status = resp.status;
    throw error;
  }

  return resp.json();
}

// Derives a stable cache key for the current query selection
export function makeQueryKey(q: { category?: string; search?: string }): string {
  const trimmedSearch = q.search?.trim() || '';
  const trimmedCategory = q.category?.trim() || '';
  return trimmedSearch ? `search:${trimmedSearch}` : `category:${trimmedCategory || 'tech'}`;
}

export function articleId(a: Article): string {
  return a.uuid || a.id || a.url;
}
