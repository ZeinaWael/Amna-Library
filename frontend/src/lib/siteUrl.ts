const ENV_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();

export const SITE_URL: string = (() => {
  if (ENV_URL) return ENV_URL.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
})();

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}
