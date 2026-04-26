import { BrandLogos } from './BrandLogos';

export function InstitutionalHeader() {
  return (
    <div
      dir="ltr"
      className="relative z-30 border-b border-soft"
      style={{ background: 'var(--card-bg)' }}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-3 items-center gap-3 px-4 py-3">
        {/* Left — Ministry */}
        <div className="text-start text-xs leading-snug">
          <p className="font-display text-sm font-bold" lang="ar" dir="rtl">
            وزارة التربية والتعليم والتعليم العالي
          </p>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Ministry of Education and Higher Education
          </p>
          <p className="mt-0.5 text-[10.5px] text-soft">
            State of Qatar · <span lang="ar" dir="rtl">دولة قطر</span>
          </p>
        </div>

        {/* Middle — Logo */}
        <div className="flex justify-center">
          <BrandLogos size="lg" count={1} />
        </div>

        {/* Right — School */}
        <div className="text-end text-xs leading-snug">
          <p className="font-display text-sm font-bold" lang="ar" dir="rtl">
            مدرسة آمنة بنت الأرقم المخزومية الثانوية للبنات
          </p>
          <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Amna Bint Al-Arqam Al-Makhzumiya Secondary School for Girls
          </p>
          <p className="mt-0.5 text-[10.5px] text-soft">
            <span lang="ar" dir="rtl">متعلم ريادي لتنمية مستدامة</span> · Academic Year 2025–26
          </p>
        </div>
      </div>
    </div>
  );
}
