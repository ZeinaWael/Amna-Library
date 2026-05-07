import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Seo } from '../../components/seo/Seo';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-md p-12 text-center">
      <Seo title="404" description={t('errors.notFound')} noindex />
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="mt-2 text-slate-500">{t('errors.notFound')}</p>
      <Link to="/" className="btn-primary mt-6">{t('errors.goHome')}</Link>
    </div>
  );
}
