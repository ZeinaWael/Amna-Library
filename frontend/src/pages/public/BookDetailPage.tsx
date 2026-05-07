import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBook, useBookReviews, useDownload, useSubmitReview } from '../../api/hooks';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { StarRating } from '../../components/StarRating';
import { HeartButton } from '../../components/HeartButton';
import { Seo } from '../../components/seo/Seo';
import { absoluteUrl } from '../../lib/siteUrl';
import { ApiError } from '../../types/api';
import { useState } from 'react';

export default function BookDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const book = useBook(id);
  const reviews = useBookReviews(id);
  const download = useDownload();

  const onDownload = async () => {
    try {
      const r = await download.mutateAsync(id);
      window.open(r.fileUrl, '_blank', 'noopener');
    } catch {
      // surfaced via mutation state
    }
  };

  if (book.isLoading) {
    return <div className="mx-auto max-w-4xl space-y-4 p-6"><Skeleton className="h-72" /><Skeleton className="h-32" /></div>;
  }
  if (book.error || !book.data) {
    return <div className="mx-auto max-w-4xl p-6"><ErrorState onRetry={() => void book.refetch()} /></div>;
  }
  const b = book.data;

  const plainDescription = (b.description ?? '').replace(/\s+/g, ' ').trim();
  const seoDescription =
    plainDescription.length > 160 ? `${plainDescription.slice(0, 157).trimEnd()}…` : plainDescription;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: b.title,
    author: { '@type': 'Person', name: b.authorName },
    description: plainDescription || b.title,
    inLanguage: b.language,
    url: absoluteUrl(`/books/${b.id}`),
  };
  if (b.coverUrl) jsonLd.image = b.coverUrl;
  if (b.isbn) jsonLd.isbn = b.isbn;
  if (b.year) jsonLd.datePublished = String(b.year);
  if (b.reviewCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(b.averageRating),
      reviewCount: b.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <Seo
        title={b.title}
        description={seoDescription || b.title}
        canonical={`/books/${b.id}`}
        image={b.coverUrl ?? undefined}
        type="book"
      >
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Seo>
      <article className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
          {b.coverUrl ? (
            <img src={b.coverUrl} alt={b.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl text-slate-400">📘</div>
          )}
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">{b.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('book.by')} <Link to={`/authors/${b.authorId}`}>{b.authorName}</Link>
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="chip">{b.genreName}</span>
            <span className="chip">{b.language === 'ar' ? 'العربية' : 'English'}</span>
            {b.year ? <span className="chip">{b.year}</span> : null}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <StarRating value={Number(b.averageRating)} size="md" />
            <span className="text-slate-500">({b.reviewCount} {t('book.reviews')})</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{b.description}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {b.fileUrl && (
              <button className="btn-primary" onClick={() => nav(`/books/${b.id}/read`)}>
                {t('book.readOnline')}
              </button>
            )}
            {b.fileUrl && (
              <button className="btn-ghost border border-slate-300 dark:border-slate-700" onClick={onDownload} disabled={download.isPending}>
                {t('book.download')}
              </button>
            )}
            <HeartButton bookId={b.id} />
          </div>
        </div>
      </article>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t('book.reviewsTitle')}</h2>
        {reviews.isLoading ? (
          <Skeleton className="h-24" />
        ) : reviews.error ? (
          <ErrorState onRetry={() => void reviews.refetch()} />
        ) : (
          <div className="space-y-3">
            {reviews.data?.length === 0 && <p className="text-sm text-slate-500">—</p>}
            {reviews.data?.map((r) => (
              <div key={r.id} className="card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.maskedReviewerName}</span>
                  <StarRating value={r.rating} />
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{r.content}</p>
              </div>
            ))}
          </div>
        )}

        <ReviewForm bookId={b.id} />
      </section>
    </div>
  );
}

function ReviewForm({ bookId }: { bookId: string }) {
  const { t } = useTranslation();
  const submit = useSubmitReview(bookId);
  const [done, setDone] = useState(false);

  const schema = z.object({
    reviewerName: z.string().min(2, t('book.form.validation.nameMin')),
    reviewerEmail: z.string().email(t('book.form.validation.emailInvalid')),
    rating: z.number().int().min(1, t('book.form.validation.ratingRange')).max(5, t('book.form.validation.ratingRange')),
    content: z.string().min(10, t('book.form.validation.contentMin')),
  });
  type FormVals = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { reviewerName: '', reviewerEmail: '', rating: 5, content: '' },
  });
  const rating = watch('rating');

  const onSubmit = async (vals: FormVals) => {
    try {
      await submit.mutateAsync(vals);
      setDone(true);
      reset();
    } catch {
      // shown below
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-3">
      <h3 className="text-base font-semibold">{t('book.leaveReview')}</h3>
      {done && <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{t('book.form.thanks')}</p>}
      {submit.error && submit.error instanceof ApiError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {submit.error.status === 409 ? t('book.form.duplicate') : submit.error.message}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('book.form.name')} error={errors.reviewerName?.message}>
          <input className="input" {...register('reviewerName')} />
        </Field>
        <Field label={t('book.form.email')} error={errors.reviewerEmail?.message}>
          <input type="email" className="input" {...register('reviewerEmail')} />
        </Field>
      </div>
      <Field label={t('book.form.rating')} error={errors.rating?.message}>
        <StarRating value={Number(rating)} size="md" onChange={(v) => setValue('rating', v, { shouldValidate: true })} />
      </Field>
      <Field label={t('book.form.content')} error={errors.content?.message}>
        <textarea className="input min-h-[120px]" {...register('content')} />
      </Field>
      <button type="submit" className="btn-primary" disabled={submit.isPending}>
        {t('book.form.submit')}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
