import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthors } from '../../api/hooks';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { useToast } from '../../components/Toast';
import type { AuthorDto } from '../../types/api';
import { ApiError } from '../../types/api';

export default function AdminAuthorsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const list = useAuthors();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AuthorDto | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (a: AuthorDto) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await api.delete(`/admin/authors/${a.id}`);
      void qc.invalidateQueries({ queryKey: ['authors'] });
      toast({ type: 'success', message: t('admin.toast.deleted') });
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 409
          ? t('admin.authorHasBooks')
          : e instanceof ApiError
            ? e.message
            : t('admin.toast.actionFailed');
      setError(msg);
      toast({ type: 'error', message: msg });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('admin.authors')}</h1>
          <p className="text-sm text-soft">{t('admin.author.tagline')}</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <span className="icon text-base">add</span>
          {t('admin.author.create')}
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
                <th>{t('admin.author.name')}</th>
                <th>{t('admin.books')}</th>
                <th className="text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {a.photoUrl ? (
                        <img
                          src={a.photoUrl}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                          style={{ background: 'var(--accent)' }}
                        >
                          <span className="icon text-base">person</span>
                        </span>
                      )}
                      <span className="font-medium">{a.name}</span>
                    </div>
                  </td>
                  <td>{a.bookCount}</td>
                  <td className="space-x-2 text-end">
                    <button className="btn-ghost" onClick={() => setEditing(a)}>
                      <span className="icon text-base">edit</span>
                      <span className="hidden sm:inline">{t('common.edit')}</span>
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => remove(a)}
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
        <AuthorFormModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ['authors'] });
          }}
        />
      )}
    </div>
  );
}

function AuthorFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: AuthorDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? '');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError(t('admin.author.errors.nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let id = initial?.id;
      const body = { name, bio };
      if (!id) {
        const created = (await api.post<AuthorDto>('/admin/authors', body)).data;
        id = created.id;
      } else {
        await api.put(`/admin/authors/${id}`, body);
      }
      if (photo && id) {
        const fd = new FormData();
        fd.append('file', photo);
        await api.post(`/admin/authors/${id}/photo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast({
        type: 'success',
        message: initial ? t('admin.toast.updated') : t('admin.toast.created'),
      });
      onSaved();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('admin.toast.saveFailed');
      setError(msg);
      toast({ type: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="modal-card card w-full max-w-md space-y-0 overflow-hidden p-0">
        <div className="gradient-bar h-1" />
        <div className="space-y-5 px-6 pb-6 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">
              {initial ? t('admin.author.edit') : t('admin.author.create')}
            </h2>
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

          <label className="block">
            <span className="label">{t('admin.author.name')}</span>
            <div className="relative">
              <span className="icon pointer-events-none absolute start-3 top-3 text-base text-soft">
                person
              </span>
              <input
                className="input ps-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="label">{t('admin.author.bio')}</span>
            <div className="relative">
              <span className="icon pointer-events-none absolute start-3 top-3 text-base text-soft">
                description
              </span>
              <textarea
                className="input ps-10 min-h-[100px]"
                value={bio ?? ''}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </label>

          <div>
            <span className="label">{t('admin.author.photo')}</span>
            <div className="dropzone">
              <span className="icon dz-icon">{photo ? 'task_alt' : 'add_a_photo'}</span>
              <span className="dz-name">{photo ? photo.name : t('admin.author.photo')}</span>
              {!photo && <span className="text-[11px]">PNG / JPG</span>}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

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
