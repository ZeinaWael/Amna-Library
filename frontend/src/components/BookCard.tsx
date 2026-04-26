import { Link } from 'react-router-dom';
import type { BookSummaryDto } from '../types/api';
import { StarRating } from './StarRating';

export function BookCard({ book }: { book: BookSummaryDto }) {
  return (
    <Link to={`/books/${book.id}`} className="card group flex flex-col gap-3 hover:shadow-md">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-slate-400">📘</div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold">{book.title}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{book.authorName}</p>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="chip">{book.genreName}</span>
        <StarRating value={Number(book.averageRating ?? 0)} />
      </div>
    </Link>
  );
}
