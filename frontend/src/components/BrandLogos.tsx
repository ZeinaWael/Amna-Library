const MINISTRY_LOGO = '/school-logo.png';

type Size = 'sm' | 'md' | 'lg';
const SIZES: Record<Size, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

export function BrandLogos({ size = 'md', count = 1 }: { size?: Size; count?: 1 | 2 }) {
  const cls = SIZES[size];
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={MINISTRY_LOGO}
        alt="Ministry of Education — State of Qatar"
        className={`logo-img logo-fade ${cls} rounded-md object-contain bg-white/70 dark:bg-white/15 p-0.5`}
      />
      {count === 2 && (
        <>
          <span
            aria-hidden="true"
            className="hidden h-8 w-px sm:block"
            style={{ background: 'var(--border)' }}
          />
          <img
            src={MINISTRY_LOGO}
            alt=""
            className={`logo-img logo-fade-2 ${cls} hidden rounded-md object-contain bg-white/70 dark:bg-white/15 p-0.5 sm:block`}
          />
        </>
      )}
    </div>
  );
}

export const BRAND_LOGO_URL = MINISTRY_LOGO;
