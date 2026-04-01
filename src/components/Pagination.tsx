import React from 'react';

interface PaginationProps {
  page: number;
  hasNext: boolean;
  onChange: (page: number) => void;
  /** 표시할 최대 페이지 번호 (기본 무한 — hasNext로만 판단) */
  totalPages?: number;
  /** 현재 페이지 주변으로 보여줄 번호 수 (기본 2 → 현재 ±2) */
  siblings?: number;
}

const btnBase: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
};
const btnActive: React.CSSProperties = {
  backgroundColor: 'var(--accent)',
  border: '1px solid var(--accent)',
  color: '#1a1a1a',
};

export const Pagination: React.FC<PaginationProps> = ({
  page,
  hasNext,
  onChange,
  totalPages,
  siblings = 2,
}) => {
  // 알 수 있는 마지막 페이지: totalPages가 없으면 hasNext 기준으로 추정
  const knownLast = totalPages ?? (hasNext ? page + 1 : page);

  // 보여줄 페이지 번호 범위 계산
  const rangeStart = Math.max(1, page - siblings);
  const rangeEnd = Math.min(knownLast, page + siblings);

  const pages: (number | '...')[] = [];

  if (rangeStart > 1) {
    pages.push(1);
    if (rangeStart > 2) pages.push('...');
  }
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < knownLast) {
    if (rangeEnd < knownLast - 1) pages.push('...');
    pages.push(knownLast);
  }
  // hasNext이고 knownLast === page + 1 이면 마지막이 아직 불확실 → 끝에 ... 추가
  if (hasNext && knownLast === page + 1 && !pages.includes('...')) {
    // 이미 knownLast(= page+1)는 추가됨. 그 뒤에 ... 붙여서 "더 있음" 암시
    pages.push('...');
  }

  const btnClass =
    'min-w-[36px] h-9 px-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40 touch-manipulation';

  return (
    <div className="flex items-center justify-center gap-1 mt-12 flex-wrap">
      {/* 이전 */}
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        style={btnBase}
        className={btnClass}
        aria-label="이전 페이지"
      >
        ‹
      </button>

      {/* 페이지 번호들 */}
      {pages.map((p, i) =>
        p === '...' ? (
          <span
            key={`ellipsis-${i}`}
            className="min-w-[36px] h-9 flex items-center justify-center text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            style={p === page ? btnActive : btnBase}
            className={btnClass}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      {/* 다음 */}
      <button
        disabled={!hasNext}
        onClick={() => onChange(page + 1)}
        style={btnBase}
        className={btnClass}
        aria-label="다음 페이지"
      >
        ›
      </button>
    </div>
  );
};
