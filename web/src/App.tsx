import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import HeadlinesList from './components/HeadlinesList';
import Pager from './components/Pager';
import { Article, fetchNews, makeQueryKey, articleId } from './lib/newsapi';

const CATEGORIES = [
  'tech', // default
  'general',
  'science',
  'sports',
  'business',
  'health',
  'entertainment',
  'politics',
  'food',
  'travel'
] as const;

type Category = typeof CATEGORIES[number];

type CacheMap = Map<number, Article[]>; // page -> articles
type AllCaches = Map<string, CacheMap>; // queryKey -> CacheMap

function useLocalStorageSet(key: string) {
  const [setState, setSetState] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  });

  const save = (next: Set<string>) => {
    setSetState(new Set(next));
    try {
      const arr = Array.from(next);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {
      // ignore storage errors
    }
  };

  return [setState, save] as const;
}

function App() {
  // Filters/search
  const [search, setSearch] = useState(''); // committed search used for fetching
  const [searchInput, setSearchInput] = useState(''); // UI text; does not trigger fetch until submit
  const [category, setCategory] = useState<Category>('tech');

  // View switches
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [isFavoritesView, setIsFavoritesView] = useState(false);
  // Favorites pager state
  const [favPage, setFavPage] = useState(1);
  const [favIndex, setFavIndex] = useState(0);

  // Pager state
  const [page, setPage] = useState(1);
  const [index, setIndex] = useState(0);

  // Data and status
  const [allCaches] = useState<AllCaches>(() => new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Favorites storage
  const [favoriteIds, setFavoriteIds] = useLocalStorageSet('news-reader:favorites');
  const [favoritesList, setFavoritesList] = useState<Article[]>(() => {
    try {
      const raw = localStorage.getItem('news-reader:favorites:data');
      return raw ? (JSON.parse(raw) as Article[]) : [];
    } catch {
      return [];
    }
  });

  // Keep favorites pagination within bounds when list changes
  useEffect(() => {
    const total = favoritesList.length;
    if (total === 0) {
      setFavPage(1);
      setFavIndex(0);
      return;
    }
    const maxPage = Math.max(1, Math.ceil(total / 3));
    const nextPage = Math.min(favPage, maxPage);
    const pageStart = (nextPage - 1) * 3;
    const pageCount = Math.min(3, Math.max(0, total - pageStart));
    const maxIndex = Math.max(0, pageCount - 1);
    const nextIndex = Math.min(favIndex, maxIndex);
    if (nextPage !== favPage) setFavPage(nextPage);
    if (nextIndex !== favIndex) setFavIndex(nextIndex);
  }, [favoritesList, favPage, favIndex]);

  const currentQueryKey = useMemo(
    () => makeQueryKey({ category, search }),
    [category, search]
  );

  // Abort control to avoid stale updates
  const abortRef = useRef<AbortController | null>(null);
  const versionRef = useRef(0);

  const currentCache = useMemo<CacheMap>(() => {
    let c = allCaches.get(currentQueryKey);
    if (!c) {
      c = new Map();
      allCaches.set(currentQueryKey, c);
    }
    return c;
  }, [allCaches, currentQueryKey]);

  const currentArticles = currentCache.get(page) || null;

  // Effects: load when query/page changes
  useEffect(() => {
    // If cached, no loading spinner, but still ensure prefetch triggers via other effect
    if (currentCache.has(page)) {
      setIsLoading(false);
      setError(null);
      return;
    }
    // Otherwise fetch
    const v = ++versionRef.current;
    setIsLoading(true);
    setError(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchNews(
      {
        page,
        search: search.trim() || undefined,
        category: search.trim() ? undefined : category
      },
      ctrl.signal
    )
      .then((resp) => {
        // Ignore out-of-date responses
        if (v !== versionRef.current) return;
        currentCache.set(page, resp.data || []);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (v !== versionRef.current) return;
        if (err?.name === 'AbortError') return;
        setIsLoading(false);
        setError(err?.message || 'Failed to fetch news.');
      });

    return () => {
      ctrl.abort();
    };
  }, [page, category, search, currentCache]);

  // Prefetching: next when index==1; prev when index==0 and page>1
  useEffect(() => {
    // Prefetch next
    if (index === 1) {
      const nextPage = page + 1;
      if (!currentCache.has(nextPage)) {
        fetchNews({
          page: nextPage,
          search: search.trim() || undefined,
          category: search.trim() ? undefined : category
        }).then((resp) => {
          // store quietly
          currentCache.set(nextPage, resp.data || []);
        }).catch(() => {/* silent */});
      }
    }
    // Prefetch prev
    if (index === 0 && page > 1) {
      const prevPage = page - 1;
      if (!currentCache.has(prevPage)) {
        fetchNews({
          page: prevPage,
          search: search.trim() || undefined,
          category: search.trim() ? undefined : category
        }).then((resp) => {
          currentCache.set(prevPage, resp.data || []);
        }).catch(() => {/* silent */});
      }
    }
  }, [index, page, category, search, currentCache]);

  // Reset behavior when category/search changes: clear page cache, show full-height loading, reset page/index
  useEffect(() => {
    // When the query key changes, reset pagination and show spinner with cleared items
    setPage(1);
    setIndex(0);
    // Clear this queryKey cache to avoid stale content flashing during transition
    const existing = allCaches.get(currentQueryKey);
    if (existing) {
      existing.clear();
    }
    setIsLoading(true);
    setError(null);
  }, [currentQueryKey, allCaches]);

  // Favorites persistence
  const saveFavorites = (list: Article[], ids: Set<string>) => {
    try {
      localStorage.setItem('news-reader:favorites:data', JSON.stringify(list));
      localStorage.setItem('news-reader:favorites', JSON.stringify(Array.from(ids)));
    } catch {
      // ignore
    }
  };

  const toggleFavorite = (a: Article) => {
    const id = articleId(a);
    const nextIds: Set<string> = new Set<string>(favoriteIds);
    let nextList = [...favoritesList];

    if (nextIds.has(id)) {
      nextIds.delete(id);
      nextList = nextList.filter((x) => articleId(x) !== id);
    } else {
      nextIds.add(id);
      // avoid duplicates by id
      if (!nextList.some((x) => articleId(x) === id)) {
        nextList = [a, ...nextList].slice(0, 200); // cap
      }
    }
    setFavoriteIds(nextIds);
    setFavoritesList(nextList);
    saveFavorites(nextList, nextIds);

    // If removing while in favorites view, ensure indices remain valid
    if (isFavoritesView) {
      const total = nextList.length;
      const maxPage = Math.max(1, Math.ceil(Math.max(0, total) / 3));
      const nextPage = Math.min(favPage, maxPage);
      const pageStart = (nextPage - 1) * 3;
      const pageCount = Math.min(3, Math.max(0, total - pageStart));
      const maxIndex = Math.max(0, pageCount - 1);
      const nextIdx = Math.min(favIndex, maxIndex);
      if (nextPage !== favPage) setFavPage(nextPage);
      if (nextIdx !== favIndex) setFavIndex(nextIdx);
    }
  };

  // Handlers: pager
  const goFirst = () => {
    if (page !== 1) {
      setPage(1);
      setIndex(0);
    } else {
      setIndex(0);
    }
  };
  const goPrev = () => {
    if (index > 0) {
      setIndex(index - 1);
    } else if (page > 1) {
      // move to previous page, last index
      const targetPage = page - 1;
      setPage(targetPage);
      // If cached, swap instantly without spinner
      if (currentCache.has(targetPage)) setIsLoading(false);
      setIndex(2);
    }
  };
  const goNext = () => {
    if (index < 2) {
      setIndex(index + 1);
    } else {
      const targetPage = page + 1;
      setPage(targetPage);
      if (currentCache.has(targetPage)) setIsLoading(false);
      setIndex(0);
    }
  };
  const selectDot = (i: number) => setIndex(i);

  // Sidebar behaviors
  const onSubmitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Commit input to active search term
    const next = searchInput.trim();
    if (next === search.trim()) {
      // no-op if unchanged
      if (isFavoritesView) setIsFavoritesView(false);
      return;
    }
    setSearch(next);
    // Exit favorites view when searching
    if (isFavoritesView) setIsFavoritesView(false);
    // Reset page/index and clear the current query cache by touching currentQueryKey via state change
    setPage(1);
    setIndex(0);
  };

  const currentPageArticles = currentArticles;
  const currentItem =
    currentPageArticles && currentPageArticles[index] ? currentPageArticles[index] : null;

  const sidebar = (
    <aside className={`sidebar`} aria-label="Filters and navigation">
      <form className="search-form" onSubmit={onSubmitSearch} role="search">
        <input
          className="search-input"
          type="text"
          placeholder="Search headlines..."
          value={searchInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
          aria-label="Search headlines"
        />
        <button type="submit" className="search-btn">Search</button>
      </form>

      <div className="cat-list" role="navigation" aria-label="Categories">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`cat ${c === category && !search.trim() ? 'active' : ''}`}
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setCategory(c);
              // Exit favorites to show live results for chosen category
              if (isFavoritesView) setIsFavoritesView(false);
            }}
          >
            {c[0].toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div className="spacer" />

      <button
        className={`fav-toggle ${isFavoritesView ? 'active' : ''}`}
        onClick={() => setIsFavoritesView(!isFavoritesView)}
        aria-pressed={isFavoritesView}
      >
        {isFavoritesView ? 'Exit Favorites' : 'Favorites'}
      </button>
    </aside>
  );

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand">
          <span className="logo" aria-hidden="true">📰</span>
          <h1>News Reader</h1>
        </div>
        <button
          className="filters-toggle"
          onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          aria-expanded={showFiltersMobile}
        >
          {showFiltersMobile ? 'Hide Filters' : 'Show Filters'}
        </button>
      </header>

      <main className="layout">
        {/* Sidebar */}
        <div className={`sidebar-wrap ${showFiltersMobile ? 'open' : ''}`}>
          {sidebar}
        </div>

        {/* Content */}
        <section className="content" aria-live="polite">
          <div className="column-stack">
            <div className="card-area">
              {isFavoritesView ? (
                <div className="favorites-view">
                  {favoritesList.length === 0 ? (
                    <div className="empty-state"><p>No favorites yet.</p></div>
                  ) : (
                    <HeadlinesList
                      page={favPage}
                      index={favIndex}
                      articles={favoritesList.slice((favPage - 1) * 3, (favPage - 1) * 3 + 3)}
                      isLoading={false}
                      onFirstPage={() => { setFavPage(1); setFavIndex(0); }}
                      onPrev={() => {
                        if (favIndex > 0) {
                          setFavIndex(favIndex - 1);
                        } else if (favPage > 1) {
                          const prevPage = favPage - 1;
                          setFavPage(prevPage);
                          // Jump to last index available on prev page (may be <2 on partial page)
                          const prevStart = (prevPage - 1) * 3;
                          const prevCount = Math.min(3, Math.max(0, favoritesList.length - prevStart));
                          setFavIndex(Math.max(0, prevCount - 1));
                        }
                      }}
                      onDotSelect={(i) => { setFavIndex(i); }}
                      onNext={() => {
                        const start = (favPage - 1) * 3;
                        const count = Math.min(3, Math.max(0, favoritesList.length - start));
                        if (favIndex < count - 1) {
                          setFavIndex(favIndex + 1);
                        } else {
                          // Next page if available
                          const maxPage = Math.max(1, Math.ceil(favoritesList.length / 3));
                          if (favPage < maxPage) {
                            setFavPage(favPage + 1);
                            setFavIndex(0);
                          }
                        }
                      }}
                      onToggleFavorite={toggleFavorite}
                      favorites={favoriteIds}
                    />
                  )}
                </div>
              ) : (
                error ? (
                  <div className="error-full" role="alert">
                    <div className="error">{error}</div>
                  </div>
                ) : (
                  <HeadlinesList
                    page={page}
                    index={index}
                    articles={currentPageArticles}
                    isLoading={isLoading}
                    onFirstPage={goFirst}
                    onPrev={goPrev}
                    onDotSelect={selectDot}
                    onNext={goNext}
                    onToggleFavorite={toggleFavorite}
                    favorites={favoriteIds}
                  />
                )
              )}
            </div>

            <div className="pager-area">
              {(!error) && (
                isFavoritesView ? (
                  favoritesList.length > 0 && (
                    <Pager
                      page={favPage}
                      index={favIndex}
                      onFirstPage={() => { setFavPage(1); setFavIndex(0); }}
                      onPrev={() => {
                        if (favIndex > 0) {
                          setFavIndex(favIndex - 1);
                        } else if (favPage > 1) {
                          const prevPage = favPage - 1;
                          setFavPage(prevPage);
                          const prevStart = (prevPage - 1) * 3;
                          const prevCount = Math.min(3, Math.max(0, favoritesList.length - prevStart));
                          setFavIndex(Math.max(0, prevCount - 1));
                        }
                      }}
                      onDotSelect={(i) => setFavIndex(i)}
                      onNext={() => {
                        const start = (favPage - 1) * 3;
                        const count = Math.min(3, Math.max(0, favoritesList.length - start));
                        if (favIndex < count - 1) {
                          setFavIndex(favIndex + 1);
                        } else {
                          const maxPage = Math.max(1, Math.ceil(favoritesList.length / 3));
                          if (favPage < maxPage) {
                            setFavPage(favPage + 1);
                            setFavIndex(0);
                          }
                        }
                      }}
                    />
                  )
                ) : (
                  <Pager
                    page={page}
                    index={index}
                    onFirstPage={goFirst}
                    onPrev={goPrev}
                    onDotSelect={selectDot}
                    onNext={goNext}
                  />
                )
              )}
            </div>

            <footer className="app-footer">
              <small>Data from TheNewsApi • Language: English • Limit: 3 per page</small>
            </footer>
          </div>
        </section>
      </main>
      
    </div>
  );
}

// Mount
const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
