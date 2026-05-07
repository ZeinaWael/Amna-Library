import { useTranslation } from 'react-i18next';
import { useUserPrefs } from '../hooks/useUserPrefs';

type Props = {
  bookId: string;
  size?: 'sm' | 'md';
  className?: string;
};

export function HeartButton({ bookId, size = 'md', className = '' }: Props) {
  const { t } = useTranslation();
  const { shelf, addToShelf, removeFromShelf } = useUserPrefs();
  const active = shelf.includes(bookId);
  const dim = size === 'sm' ? 'h-8 w-8 text-[18px]' : 'h-10 w-10 text-[22px]';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (active) removeFromShelf(bookId);
        else addToShelf(bookId);
      }}
      aria-pressed={active}
      aria-label={t(active ? 'book.removeFromShelf' : 'book.addToShelf')}
      title={t(active ? 'book.removeFromShelf' : 'book.addToShelf')}
      className={`inline-flex items-center justify-center rounded-full border border-soft bg-card/85 backdrop-blur transition hover:scale-105 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] ${dim} ${
        active ? 'text-accent' : 'text-soft hover:text-accent'
      } ${className}`}
    >
      <span className="icon" style={{ fontSize: 'inherit' }}>
        {active ? 'favorite' : 'favorite_border'}
      </span>
    </button>
  );
}
