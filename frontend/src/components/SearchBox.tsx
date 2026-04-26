import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function SearchBox() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    nav(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <form onSubmit={submit} className="hidden md:block">
      <input
        type="search"
        className="input w-64"
        placeholder={t('common.searchPlaceholder')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={t('common.search')}
      />
    </form>
  );
}
