import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useGenres } from '../../api/hooks';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import type { GenreDto } from '../../types/api';
import { ApiError } from '../../types/api';

const CURATED_ICONS = [
  'menu_book', 'auto_stories', 'science', 'history_edu', 'public', 'palette',
  'computer', 'translate', 'psychology', 'biotech', 'calculate', 'language',
  'school', 'travel_explore', 'theater_comedy', 'music_note', 'engineering',
  'eco', 'spa', 'sports_esports', 'restaurant', 'flight', 'star', 'mosque',
];

const PRESET_COLORS = [
  '#8b1a3a', '#c9a84c', '#1f4e79', '#2d6a4f', '#9d4edd', '#e07a5f',
  '#3a86ff', '#ff006e', '#8338ec', '#fb5607', '#ffbe0b', '#06d6a0',
  '#118ab2', '#073b4c', '#7d8597', '#240046',
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export default function AdminGenresPage() {
  const { t } = useTranslation();
  const list = useGenres();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<GenreDto | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (g: GenreDto) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await api.delete(`/admin/genres/${g.id}`);
      void qc.invalidateQueries({ queryKey: ['genres'] });
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? t('admin.genreHasBooks')
          : e instanceof ApiError
            ? e.message
            : t('admin.toast.actionFailed'),
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t('admin.categories')}</h1>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <span className="icon text-base">add</span>
          {t('admin.category.create')}
        </button>
      </div>
      {error && (
        <p
          className="rounded-xl px-3 py-2 text-sm"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
        >
          {error}
        </p>
      )}

      {list.isLoading ? (
        <Skeleton className="h-48" />
      ) : list.error ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.category.preview')}</th>
                <th>{t('admin.category.name')}</th>
                <th>{t('admin.category.slug')}</th>
                <th>{t('admin.books')}</th>
                <th className="text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((g) => (
                <tr key={g.id}>
                  <td>
                    <CategoryChip name={g.name} icon={g.icon ?? 'category'} color={g.color ?? 'var(--accent)'} />
                  </td>
                  <td className="font-medium">{g.name}</td>
                  <td className="text-soft">{g.slug}</td>
                  <td>{g.bookCount}</td>
                  <td className="space-x-2 text-end">
                    <button className="btn-ghost" onClick={() => setEditing(g)}>
                      <span className="icon text-base">edit</span>
                      <span className="hidden sm:inline">{t('common.edit')}</span>
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => remove(g)}
                    >
                      <span className="icon text-base">delete</span>
                      <span className="hidden sm:inline">{t('common.delete')}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CategoryFormModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ['genres'] });
          }}
        />
      )}
    </div>
  );
}

function CategoryChip({ name, icon, color }: { name: string; icon: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      <span className="icon text-sm">{icon}</span>
      {name}
    </span>
  );
}

function CategoryFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: GenreDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugDirty, setSlugDirty] = useState(Boolean(initial?.slug));
  const [icon, setIcon] = useState(initial?.icon ?? CURATED_ICONS[0]);
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugDirty) setSlug(slugify(name));
  }, [name, slugDirty]);

  const previewName = useMemo(() => name.trim() || t('admin.category.previewPlaceholder'), [name, t]);

  const submit = async () => {
    if (!name.trim()) {
      setError(t('admin.category.errors.nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = { name: name.trim(), slug: (slug || slugify(name)).trim(), icon, color };
      if (initial) await api.put(`/admin/genres/${initial.id}`, body);
      else await api.post(`/admin/genres`, body);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('admin.toast.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="modal-card card w-full max-w-xl space-y-5 overflow-hidden p-0">
        <div className="gradient-bar h-1" />
        <div className="space-y-5 px-6 pb-6 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">
              {initial ? t('admin.category.edit') : t('admin.category.create')}
            </h2>
            <button className="btn-ghost" onClick={onClose} aria-label={t('common.cancel')}>
              <span className="icon text-base">close</span>
            </button>
          </div>

          {/* Live preview */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${color} 16%, transparent), color-mix(in srgb, ${color} 4%, transparent))`,
              border: `1px solid color-mix(in srgb, ${color} 30%, var(--border))`,
            }}
          >
            <p className="mb-2 text-[10px] uppercase tracking-wider text-soft">
              {t('admin.category.preview')}
            </p>
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl text-white shadow-md"
                style={{ background: color }}
              >
                <span className="icon">{icon}</span>
              </span>
              <div>
                <p className="font-display text-lg font-bold" style={{ color }}>
                  {previewName}
                </p>
                <p className="text-xs text-soft">/{slug || 'slug'}</p>
              </div>
            </div>
          </div>

          {error && (
            <p
              className="rounded-xl px-3 py-2 text-sm"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
            >
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">{t('admin.category.name')}</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">{t('admin.category.slug')}</span>
              <input
                className="input"
                value={slug}
                onChange={(e) => {
                  setSlugDirty(true);
                  setSlug(e.target.value);
                }}
              />
            </label>
          </div>

          {/* Icon picker */}
          <div>
            <span className="label">{t('admin.category.icon')}</span>
            <div className="grid max-h-44 grid-cols-8 gap-1.5 overflow-y-auto rounded-xl border border-soft p-2">
              {CURATED_ICONS.map((ic) => {
                const active = ic === icon;
                return (
                  <button
                    type="button"
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className="flex h-10 w-full items-center justify-center rounded-lg text-xl transition"
                    style={
                      active
                        ? { background: color, color: '#fff', boxShadow: `0 4px 14px -4px ${color}` }
                        : { color: 'var(--text-secondary)' }
                    }
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                    aria-label={ic}
                    aria-pressed={active}
                  >
                    <span className="icon">{ic}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <span className="label">{t('admin.category.color')}</span>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => {
                const active = c.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className="h-8 w-8 rounded-full transition"
                    style={{
                      background: c,
                      boxShadow: active
                        ? `0 0 0 3px var(--card-bg), 0 0 0 5px ${c}`
                        : '0 2px 6px -2px rgba(0,0,0,0.25)',
                      transform: active ? 'scale(1.1)' : undefined,
                    }}
                    aria-label={c}
                    aria-pressed={active}
                  />
                );
              })}
              <label className="ms-2 flex items-center gap-2 text-xs text-soft">
                <input
                  type="color"
                  className="h-8 w-8 cursor-pointer rounded-full border border-soft bg-transparent p-0"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label={t('admin.category.customColor')}
                />
                {t('admin.category.customColor')}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={onClose} disabled={busy}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" onClick={submit} disabled={busy}>
              <span className="icon text-base">{busy ? 'hourglass_top' : 'check'}</span>
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
