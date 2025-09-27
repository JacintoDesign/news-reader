import React from 'react';
import type { Article } from '../lib/newsapi';

type Props = {
  page: number;
  index: number;
  articles: Article[] | null; // current page articles or null if not loaded
  isLoading: boolean;
  onFirstPage: () => void;
  onPrev: () => void;
  onDotSelect: (i: number) => void; // 0..2 within page
  onNext: () => void;
  onToggleFavorite: (a: Article) => void;
  favorites: Set<string>;
};

const PLACEHOLDER_DATA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAV0lEQVR4nO3SMQEAIAzAsGv9Z0iA6G4xT2G4CwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKD7oQAAwP8Jm3cAAW6Qh5wAAAAASUVORK5CYII=';
const PlaceholderImg: React.FC<{ alt: string }> = ({ alt }) => (
  <img src={PLACEHOLDER_DATA} alt={alt} className="card-image" />
);

export const HeadlinesList: React.FC<Props> = ({
  page,
  index,
  articles,
  isLoading,
  onFirstPage,
  onPrev,
  onDotSelect,
  onNext,
  onToggleFavorite,
  favorites
}) => {
  const current = articles && articles[index] ? articles[index] : null;

  // Render loading full-height if no articles ready
  if ((!articles || !current) && isLoading) {
    return (
      <div className="card-skeleton" role="status" aria-live="polite" aria-busy="true">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="featured-wrapper">
      {current ? (
        <article className="featured-card" aria-label="Featured article">
          <div className="image-wrap">
            {current.image_url ? (
              <img
                className="card-image"
                src={current.image_url}
                alt={current.title || 'News image'}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = PLACEHOLDER_DATA;
                }}
              />
            ) : (
              <PlaceholderImg alt={current.title || 'News image'} />
            )}
            <div className="overlay-panel">
              <h1 className="title">{current.title}</h1>
              <p className="desc">
                {current.description || current.snippet || 'No description available.'}
              </p>
              <div className="meta-row">
                {current.source && typeof current.source === 'string' ? (
                  <span className="meta">{current.source}</span>
                ) : current.source && typeof current.source === 'object' ? (
                  <span className="meta">{(current.source as any).name || ''}</span>
                ) : null}
                {current.published_at ? (
                  <span className="meta">{new Date(current.published_at).toLocaleString()}</span>
                ) : null}
              </div>
              <div className="cta-row">
                <a
                  className="cta"
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Full Article
                </a>
                <button
                  className={`fav ${favorites.has(current.uuid || current.id || current.url) ? 'active' : ''}`}
                  onClick={() => onToggleFavorite(current)}
                  aria-pressed={favorites.has(current.uuid || current.id || current.url)}
                >
                  {favorites.has(current.uuid || current.id || current.url) ? 'Remove Favorite' : 'Save to Favorites'}
                </button>
              </div>
            </div>
          </div>
          {/* Pager removed; rendered globally below the card */}
        </article>
      ) : (
        <div className="empty-state" role="status" aria-live="polite">
          <p>No articles found.</p>
        </div>
      )}
    </div>
  );
};

export default HeadlinesList;
