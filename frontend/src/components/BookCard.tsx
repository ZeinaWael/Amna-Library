import { Link } from 'react-router-dom';
import type { BookSummaryDto } from '../types/api';
import { StarRating } from './StarRating';
import { HeartButton } from './HeartButton';

export function BookCard({ book }: { book: BookSummaryDto }) {
  return (
    <Link to={`/books/${book.id}`} className="book-card group">
      <div className="book-cover relative">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-soft">
            <span className="icon" style={{ fontSize: '2.4rem' }}>menu_book</span>
          </div>
        )}
        <HeartButton
          bookId={book.id}
          size="sm"
          className="absolute top-2 end-2 z-10 shadow-sm"
        />
      </div>
      <div className="flex-1 px-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{book.title}</h3>
        <p className="mt-1 text-xs text-soft">{book.authorName}</p>
      </div>
      <div className="flex items-center justify-between px-1 pb-1 text-xs text-soft">
        <span className="chip">{book.genreName}</span>
        <StarRating value={Number(book.averageRating ?? 0)} />
      </div>
    </Link>
  );
}
