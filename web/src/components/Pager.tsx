import React from 'react';

type Props = {
  page: number;
  index: number; // 0..2 within current page
  onFirstPage: () => void;
  onPrev: () => void;
  onDotSelect: (i: number) => void;
  onNext: () => void;
  disabled?: boolean;
};

const Pager: React.FC<Props> = ({ page, index, onFirstPage, onPrev, onDotSelect, onNext, disabled }) => {
  return (
    <nav className={`pager`} aria-label="Pagination controls">
      <button className="circle" onClick={onFirstPage} title="First page" disabled={disabled}>«</button>
      <button className="circle" onClick={onPrev} title="Previous" disabled={disabled}>‹</button>
      <div className="dots">
        {Array.from({ length: 3 }).map((_, i) => {
          const num = (page - 1) * 3 + (i + 1);
          const isActive = i === index;
          return (
            <button
              key={i}
              className={`dot ${isActive ? 'active' : ''}`}
              onClick={() => onDotSelect(i)}
              aria-current={isActive ? 'true' : undefined}
              title={`Go to article ${num}`}
              disabled={disabled}
            >
              {num}
            </button>
          );
        })}
      </div>
      <button className="circle" onClick={onNext} title="Next" disabled={disabled}>›</button>
    </nav>
  );
};

export default Pager;
