import { BrandLogos } from './BrandLogos';

export function InstitutionalHeader() {
  return (
    <div
      dir="ltr"
      className="institutional-header relative z-30"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_1fr]">
        {/* Left — Ministry */}
        <div className="order-2 text-center text-xs leading-snug sm:order-1 sm:text-start">
          <p className="font-display text-sm font-bold text-white" lang="ar" dir="rtl">
            وزارة التربية والتعليم والتعليم العالي
          </p>
          <p className="text-[12px] font-semibold text-white">
            Ministry of Education and Higher Education
          </p>
          <p className="mt-0.5 text-[10.5px] text-white/75">
            State of Qatar · <span lang="ar" dir="rtl">دولة قطر</span>
          </p>
        </div>

        {/* Middle — Logo */}
        <div className="order-1 flex justify-center sm:order-2">
          <BrandLogos size="lg" count={1} />
        </div>

        {/* Right — School */}
        <div className="order-3 text-center text-xs leading-snug sm:text-end">
          <p className="font-display text-sm font-bold text-white" lang="ar" dir="rtl">
            مدرسة آمنة بنت الأرقم المخزومية الثانوية للبنات
          </p>
          <p className="text-[12px] font-semibold text-white">
            Amna Bint Al-Arqam Al-Makhzumiya Secondary School for Girls
          </p>
          <p className="mt-0.5 text-[10.5px] text-white/75">
            <span lang="ar" dir="rtl">متعلم ريادي لتنمية مستدامة</span> · Academic Year 2025–26
          </p>
        </div>
      </div>
    </div>
  );
}
