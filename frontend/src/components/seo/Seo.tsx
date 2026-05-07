import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { SITE_URL, absoluteUrl } from '../../lib/siteUrl';

const DEFAULT_OG_IMAGE = '/og-default.png';

export type SeoProps = {
  title: string;
  description: string;
  canonical?: string;
  image?: string | null;
  type?: 'website' | 'article' | 'book';
  locale?: string;
  noindex?: boolean;
  children?: React.ReactNode;
};

function ogLocaleFor(lang: string): string {
  if (lang.startsWith('ar')) return 'ar_AR';
  return 'en_US';
}

export function Seo({
  title,
  description,
  canonical,
  image,
  type = 'website',
  locale,
  noindex,
  children,
}: SeoProps) {
  const { t, i18n } = useTranslation();
  const siteName = t('seo.site.name');
  const fullTitle = title.includes(siteName) ? title : `${title} · ${siteName}`;
  const ogLocale = locale ?? ogLocaleFor(i18n.language || 'en');
  const resolvedImage = absoluteUrl(image ?? DEFAULT_OG_IMAGE);
  const resolvedCanonical = canonical ? absoluteUrl(canonical) : undefined;

  return (
    <Helmet>
      <html lang={i18n.language || 'en'} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {resolvedCanonical && <link rel="canonical" href={resolvedCanonical} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={ogLocale} />
      {resolvedCanonical && <meta property="og:url" content={resolvedCanonical} />}
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />

      {SITE_URL && <meta name="application-name" content={siteName} />}
      {children}
    </Helmet>
  );
}
