import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBooksByIds } from '../../api/hooks';
import { listResumableBooks } from '../../lib/readerStorage';
import { useUserPrefs } from '../../hooks/useUserPrefs';
import type { BookSummaryDto } from '../../types/api';

const MAX_ITEMS = 8;

type RailItem = {
  bookId: string;
  page: number;
  updatedAt: number;
};

function readResumable(): RailItem[] {
  return listResumableBooks().map((r) => ({
    bookId: r.bookId,
    page: r.page,
    updatedAt: r.updatedAt,
  }));
}

export function ContinueReadingRail() {
  const { t } = useTranslation();
  const { dismissedContinueReading, dismissContinueReading } = useUserPrefs();
  const [resumable, setResumable] = useState<RailItem[]>(() => readResumable());

  // Reader state lives in localStorage (no in-memory subscription) so refresh
  // when this tab becomes visible / focused — i.e., user closes the reader
  // tab/route and lands back on home.
  useEffect(() => {
    const refresh = () => setResumable(readResumable());
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const dismissedSet = useMemo(
    () => new Set(dismissedContinueReading),
    [dismissedContinueReading],
  );

  const visible = useMemo(
    () => resumable.filter((r) => !dismissedSet.has(r.bookId)).slice(0, MAX_ITEMS),
    [resumable, dismissedSet],
  );

  const ids = useMemo(() => visible.map((v) => v.bookId), [visible]);
  const { data: books } = useBooksByIds(ids);

  if (visible.length === 0) return null;

  const byId = new Map<string, BookSummaryDto>();
  if (books) for (const b of books) byId.set(b.id, b);

  // The backend filters to published books, so anything missing here was
  // either deleted or unpublished — drop those silently.
  const cards = visible
    .map((item) => {
      const book = byId.get(item.bookId);
      return book ? { item, book } : null;
    })
    .filter((x): x is { item: RailItem; book: BookSummaryDto } => x !== null);

  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="continue-reading-title" className="section-fade">
      <h2 id="continue-reading-title" className="mb-4 text-xl font-semibold">
        {t('home.continueReading.title')}
      </h2>
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2"
        style={{ scrollPaddingInlineStart: '1rem' }}
      >
        {cards.map(({ item, book }) => {
          const total = book.pageCount ?? null;
          const percent =
            total && total > 0 ? Math.min(100, Math.round((item.page / total) * 100)) : null;
          return (
            <article
              key={book.id}
              className="card-hover relative flex w-60 shrink-0 snap-start gap-3 p-3 sm:w-72"
            >
              <Link
                to={`/books/${book.id}/read`}
                className="flex flex-1 items-start gap-3 no-underline"
              >
                <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg surface-2">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-soft">
                      <span className="icon">menu_book</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-start">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                    {book.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-1 text-xs text-soft">{book.authorName}</p>
                  <p className="mt-2 text-xs text-soft">
                    {total
                      ? t('home.continueReading.progress', {
                          page: item.page,
                          total,
                          percent: percent ?? 0,
                        })
                      : t('home.continueReading.progressUnknown', { page: item.page })}
                  </p>
                  {percent != null && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full surface-2">
                      <div
                        className="h-full"
                        style={{
                          width: `${percent}%`,
                          background:
                            'linear-gradient(90deg, var(--accent), var(--accent-hover))',
                        }}
                      />
                    </div>
                  )}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => dismissContinueReading(book.id)}
                aria-label={t('home.continueReading.dismiss')}
                title={t('home.continueReading.dismiss')}
                className="absolute top-1.5 end-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-soft opacity-60 transition hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] hover:text-accent hover:opacity-100 focus-visible:opacity-100"
              >
                <span className="icon text-base">close</span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
