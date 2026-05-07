import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  numPages: number;
  onSubmit: (page: number) => void;
};

export default function GoToPageInput({ numPages, onSubmit }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState('');
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);
  const inputId = useId();

  useEffect(
    () => () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed === '') return;
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > numPages) {
      setFeedback(t('reader.goToPage.invalid', { min: 1, max: numPages }));
      setFlash(true);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(false), 600);
      return;
    }
    setFeedback('');
    setValue('');
    onSubmit(parsed);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-1.5"
    >
      <label htmlFor={inputId} className="sr-only">
        {t('reader.goToPage.label')}
      </label>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        min={1}
        max={numPages}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('reader.goToPage.placeholder')}
        aria-label={t('reader.goToPage.label')}
        aria-invalid={flash || undefined}
        className={`input h-10 w-16 px-2 py-1 text-center text-sm sm:w-20 ${
          flash ? 'border-rose-500 ring-2 ring-rose-400' : ''
        }`}
      />
      <button
        type="submit"
        className="btn-ghost h-10 px-3 py-1 text-xs font-semibold"
      >
        {t('reader.goToPage.submit')}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {feedback}
      </span>
    </form>
  );
}
