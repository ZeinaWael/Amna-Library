import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAdminBooks, useAuthors, useGenres } from '../../api/hooks';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Pagination } from '../../components/Pagination';
import { GradientProgress } from '../../components/GradientProgress';
import { useToast } from '../../components/Toast';
import type { BookDetailDto, BookSummaryDto } from '../../types/api';
import { ApiError } from '../../types/api';

const currentYear = new Date().getFullYear();

export default function AdminBooksPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const list = useAdminBooks(page, 20);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BookSummaryDto | 'new' | null>(null);

  const togglePublish = async (b: BookSummaryDto, target: boolean) => {
    try {
      await api.patch(`/admin/books/${b.id}/publish`, { isPublished: target });
      void qc.invalidateQueries({ queryKey: ['admin', 'books'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast({
        type: 'success',
        message: target ? t('admin.toast.published') : t('admin.toast.unpublished'),
      });
    } catch {
      toast({ type: 'error', message: t('admin.toast.actionFailed') });
    }
  };

  const remove = async (b: BookSummaryDto) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await api.delete(`/admin/books/${b.id}`);
      void qc.invalidateQueries({ queryKey: ['admin', 'books'] });
      toast({ type: 'success', message: t('admin.toast.deleted') });
    } catch {
      toast({ type: 'error', message: t('admin.toast.actionFailed') });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('admin.books')}</h1>
          <p className="text-sm text-soft">{t('admin.book.tagline')}</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <span className="icon text-base">add</span>
          {t('admin.book.create')}
        </button>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-64" />
      ) : list.error ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : !list.data || list.data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.book.title')}</th>
                <th>{t('admin.book.author')}</th>
                <th>{t('admin.book.genre')}</th>
                <th>{t('admin.book.status')}</th>
                <th className="text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((b) => {
                const detail = b as unknown as BookDetailDto;
                const isPublished = detail.isPublished;
                return (
                  <tr key={b.id}>
                    <td className="font-medium">{b.title}</td>
                    <td className="text-soft">{b.authorName}</td>
                    <td>
                      <span className="chip">{b.genreName}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={isPublished ? 'chip-active' : 'chip'}
                        onClick={() => togglePublish(b, !isPublished)}
                      >
                        <span className="icon me-1 text-[14px]">
                          {isPublished ? 'check_circle' : 'pending'}
                        </span>
                        {isPublished ? t('admin.actions.unpublish') : t('admin.actions.publish')}
                      </button>
                    </td>
                    <td className="space-x-2 text-end">
                      <button className="btn-ghost" onClick={() => setEditing(b)}>
                        <span className="icon text-base">edit</span>
                        <span className="hidden sm:inline">{t('common.edit')}</span>
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => remove(b)}
                      >
                        <span className="icon text-base">delete</span>
                        <span className="hidden sm:inline">{t('common.delete')}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {list.data && (
        <Pagination
          page={list.data.page}
          pageSize={list.data.pageSize}
          total={list.data.total}
          onChange={setPage}
        />
      )}

      {editing && (
        <BookFormModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ['admin', 'books'] });
            void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
          }}
        />
      )}
    </div>
  );
}

function BookFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: BookSummaryDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const authors = useAuthors();
  const genres = useGenres();
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: '',
    language: initial?.language ?? 'en',
    year: initial?.year ?? currentYear,
    isbn: '',
    authorId: initial?.authorId ?? '',
    genreId: initial?.genreId ?? '',
    isFeatured: false,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const errors: Record<string, string | null> = {
    title: form.title.trim().length < 2 ? t('admin.book.errors.titleMin') : null,
    description:
      form.description.trim().length < 10 ? t('admin.book.errors.descriptionMin') : null,
    authorId: !form.authorId ? t('admin.book.errors.authorRequired') : null,
    genreId: !form.genreId ? t('admin.book.errors.genreRequired') : null,
    year:
      form.year < 1000 || form.year > currentYear ? t('admin.book.errors.yearRange') : null,
  };
  const isValid = Object.values(errors).every((v) => !v);

  const submit = async () => {
    setTouched({ title: true, description: true, authorId: true, genreId: true, year: true });
    if (!isValid) {
      setError(t('admin.book.errors.fixForm'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let bookId = initial?.id;
      if (!bookId) {
        const created = (await api.post<BookDetailDto>(`/admin/books`, form)).data;
        bookId = created.id;
      } else {
        await api.put(`/admin/books/${bookId}`, form);
      }
      if (coverFile && bookId) {
        const fd = new FormData();
        fd.append('file', coverFile);
        await api.post(`/admin/books/${bookId}/cover`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      if (pdfFile && bookId) {
        const fd = new FormData();
        fd.append('file', pdfFile);
        await api.post(`/admin/books/${bookId}/file`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) =>
            setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : null),
        });
      }
      toast({
        type: 'success',
        message: initial ? t('admin.toast.updated') : t('admin.toast.created'),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed.');
      toast({ type: 'error', message: t('admin.toast.saveFailed') });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const fieldError = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);

  return (
    <div className="modal-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="modal-card card w-full max-w-2xl space-y-0 overflow-hidden p-0">
        <div className="gradient-bar h-1" />
        <div className="space-y-5 px-6 pb-6 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">
                {initial ? t('admin.book.edit') : t('admin.book.create')}
              </h2>
              <p className="text-xs text-soft">{t('admin.book.modalSubtitle')}</p>
            </div>
            <button className="btn-ghost" onClick={onClose} aria-label={t('common.cancel')}>
              <span className="icon text-base">close</span>
            </button>
          </div>

          {error && (
            <p
              className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
            >
              <span className="icon text-base">error</span>
              {error}
            </p>
          )}

          <Field label={t('admin.book.title')} error={fieldError('title')} icon="title">
            <input
              className="input ps-10"
              value={form.title}
              placeholder={t('admin.book.placeholders.title')}
              onChange={(e) => set('title', e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, title: true }))}
            />
          </Field>

          <Field
            label={t('admin.book.description')}
            error={fieldError('description')}
            icon="notes"
          >
            <textarea
              className="input ps-10 min-h-[96px]"
              value={form.description}
              placeholder={t('admin.book.placeholders.description')}
              onChange={(e) => set('description', e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, description: true }))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin.book.author')} error={fieldError('authorId')} icon="person">
              <select
                className="input ps-10"
                value={form.authorId}
                onChange={(e) => set('authorId', e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, authorId: true }))}
              >
                <option value="">— {t('admin.book.author')} —</option>
                {authors.data?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.book.genre')} error={fieldError('genreId')} icon="category">
              <select
                className="input ps-10"
                value={form.genreId}
                onChange={(e) => set('genreId', e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, genreId: true }))}
              >
                <option value="">— {t('admin.book.genre')} —</option>
                {genres.data?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('admin.book.language')} icon="translate">
              <select
                className="input ps-10"
                value={form.language}
                onChange={(e) => set('language', e.target.value)}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </Field>
            <Field label={t('admin.book.year')} error={fieldError('year')} icon="event">
              <input
                className="input ps-10"
                type="number"
                min={1000}
                max={currentYear}
                step={1}
                value={form.year}
                onChange={(e) => set('year', Number(e.target.value))}
                onBlur={() => setTouched((p) => ({ ...p, year: true }))}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === '+' || e.key === 'e') e.preventDefault();
                }}
              />
            </Field>
            <Field label="ISBN" icon="qr_code_2">
              <input
                className="input ps-10"
                value={form.isbn}
                onChange={(e) => set('isbn', e.target.value)}
              />
            </Field>
          </div>

          <label
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-soft p-3 transition hover:border-[var(--accent)]"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
              checked={form.isFeatured}
              onChange={(e) => set('isFeatured', e.target.checked)}
            />
            <span className="flex-1">
              <span className="block text-sm font-semibold">{t('admin.book.featured')}</span>
              <span className="block text-xs text-soft">{t('admin.book.featuredHint')}</span>
            </span>
            <span className="icon text-base text-accent">star</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <FileDrop
              icon="image"
              accept="image/*"
              label={t('admin.actions.uploadCover')}
              file={coverFile}
              onFile={setCoverFile}
            />
            <FileDrop
              icon="picture_as_pdf"
              accept="application/pdf"
              label={t('admin.actions.uploadFile')}
              file={pdfFile}
              onFile={setPdfFile}
            />
          </div>

          {progress !== null && (
            <GradientProgress value={progress} label={t('admin.book.uploading')} />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={onClose} disabled={busy}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" onClick={submit} disabled={busy}>
              {busy ? <span className="spinner" /> : <span className="icon text-base">check</span>}
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  error,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | null;
  icon?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        {icon && (
          <span
            className="icon pointer-events-none absolute start-3 top-3 text-base text-soft"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        {children}
      </div>
      {error && (
        <span className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--danger)' }}>
          <span className="icon text-[14px]">error</span>
          {error}
        </span>
      )}
    </label>
  );
}

function FileDrop({
  icon,
  accept,
  label,
  file,
  onFile,
}: {
  icon: string;
  accept: string;
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="dropzone">
        <span className="icon dz-icon">{file ? 'task_alt' : icon}</span>
        <span className="dz-name">
          {file ? file.name : label}
        </span>
        {!file && <span className="text-[11px]">PNG, JPG, PDF · &lt; 30 MB</span>}
        <input type="file" accept={accept} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </div>
    </div>
  );
}
