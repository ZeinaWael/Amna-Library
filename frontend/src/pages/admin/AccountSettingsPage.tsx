import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useChangePassword } from '../../api/hooks';
import { useAuth } from '../../store/auth';
import { useToast } from '../../components/Toast';
import { ApiError } from '../../types/api';

const ERROR_KEYS: Record<string, string> = {
  currentPassword: 'admin.account.errors.currentIncorrect',
  'newPassword.tooShort': 'admin.account.errors.tooShort',
  'newPassword.missingUpper': 'admin.account.errors.missingUpper',
  'newPassword.missingLower': 'admin.account.errors.missingLower',
  'newPassword.missingDigit': 'admin.account.errors.missingDigit',
  'newPassword.missingSymbol': 'admin.account.errors.missingSymbol',
  'newPassword.sameAsOld': 'admin.account.errors.sameAsOld',
  'confirmNewPassword.mismatch': 'admin.account.errors.confirmMismatch',
};

type FieldName = 'currentPassword' | 'newPassword' | 'confirmNewPassword';

type RuleKey = 'tooShort' | 'missingUpper' | 'missingLower' | 'missingDigit' | 'missingSymbol' | 'sameAsOld';

function evaluateRules(newPassword: string, currentPassword: string): Record<RuleKey, boolean> {
  return {
    tooShort: newPassword.length < 12,
    missingUpper: !/[A-Z]/.test(newPassword),
    missingLower: !/[a-z]/.test(newPassword),
    missingDigit: !/\d/.test(newPassword),
    missingSymbol: !/[^A-Za-z0-9]/.test(newPassword),
    sameAsOld: newPassword.length > 0 && newPassword === currentPassword,
  };
}

export default function AccountSettingsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { toast } = useToast();
  const logout = useAuth((s) => s.logout);
  const change = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<Partial<Record<FieldName, string[]>>>({});

  const rules = useMemo(
    () => evaluateRules(newPassword, currentPassword),
    [newPassword, currentPassword],
  );
  const newPasswordValid =
    !rules.tooShort &&
    !rules.missingUpper &&
    !rules.missingLower &&
    !rules.missingDigit &&
    !rules.missingSymbol &&
    !rules.sameAsOld;

  const confirmMatches = newPassword.length > 0 && newPassword === confirmNewPassword;

  const canSubmit =
    !change.isPending &&
    currentPassword.length > 0 &&
    newPasswordValid &&
    confirmMatches;

  // Strength: count met new-password rules (length + 4 char classes = 5 total),
  // collapse to 0–4 bars and a label.
  const passedRules =
    (rules.tooShort ? 0 : 1) +
    (rules.missingUpper ? 0 : 1) +
    (rules.missingLower ? 0 : 1) +
    (rules.missingDigit ? 0 : 1) +
    (rules.missingSymbol ? 0 : 1);

  const strengthBars = newPassword.length === 0 ? 0 : Math.max(1, passedRules - 1);
  const strengthLabelKey =
    newPassword.length === 0
      ? null
      : passedRules <= 2
        ? 'admin.account.strength.weak'
        : passedRules === 3
          ? 'admin.account.strength.fair'
          : passedRules === 4
            ? 'admin.account.strength.good'
            : 'admin.account.strength.strong';
  const strengthColors = ['bg-rose-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'];
  const strengthBarColor = strengthBars === 0 ? '' : strengthColors[strengthBars - 1];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerFieldErrors({});
    if (!canSubmit) return;
    try {
      await change.mutateAsync({ currentPassword, newPassword, confirmNewPassword });
      toast({ type: 'success', message: t('admin.account.success'), duration: 5000 });
      logout();
      nav('/admin/login');
    } catch (err) {
      if (err instanceof ApiError) {
        // Map flat error codes ("newPassword.tooShort") back onto fields.
        const grouped: Partial<Record<FieldName, string[]>> = {};
        for (const code of err.errors ?? []) {
          const i18nKey = ERROR_KEYS[code];
          if (!i18nKey) continue;
          const field = (code.includes('.') ? code.split('.')[0] : code) as FieldName;
          (grouped[field] ??= []).push(i18nKey);
        }
        // 400 with a single "Current password is incorrect" message comes
        // through as errors=["currentPassword"].
        if (err.status === 400 && (err.errors?.length ?? 0) === 0) {
          grouped.currentPassword = ['admin.account.errors.currentIncorrect'];
        }
        setServerFieldErrors(grouped);
      }
    }
  };

  const errorFor = (field: FieldName): string | null => {
    const codes = serverFieldErrors[field];
    if (!codes || codes.length === 0) return null;
    return codes.map((k) => t(k)).join(' · ');
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold gradient-text">
          {t('admin.account.title')}
        </h1>
        <p className="mt-1 text-sm text-soft">{t('admin.account.subtitle')}</p>
      </div>

      <form onSubmit={submit} className="card space-y-5" noValidate>
        {change.error && change.error instanceof ApiError && change.error.status === 429 && (
          <p
            className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
          >
            <span className="icon text-base">block</span>
            {t('admin.account.errors.rateLimited')}
          </p>
        )}

        <PasswordField
          label={t('admin.account.currentPassword')}
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
          show={showCurrent}
          toggle={() => setShowCurrent((v) => !v)}
          error={errorFor('currentPassword')}
        />

        <PasswordField
          label={t('admin.account.newPassword')}
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
          show={showNew}
          toggle={() => setShowNew((v) => !v)}
          error={errorFor('newPassword')}
        >
          <StrengthMeter
            bars={strengthBars}
            barColor={strengthBarColor}
            labelKey={strengthLabelKey}
          />
          <RuleList
            items={[
              { ok: !rules.tooShort, key: 'admin.account.errors.tooShort' },
              { ok: !rules.missingUpper, key: 'admin.account.errors.missingUpper' },
              { ok: !rules.missingLower, key: 'admin.account.errors.missingLower' },
              { ok: !rules.missingDigit, key: 'admin.account.errors.missingDigit' },
              { ok: !rules.missingSymbol, key: 'admin.account.errors.missingSymbol' },
              { ok: !rules.sameAsOld, key: 'admin.account.errors.sameAsOld' },
            ]}
          />
        </PasswordField>

        <PasswordField
          label={t('admin.account.confirmNewPassword')}
          autoComplete="new-password"
          value={confirmNewPassword}
          onChange={setConfirmNewPassword}
          show={showConfirm}
          toggle={() => setShowConfirm((v) => !v)}
          error={
            errorFor('confirmNewPassword') ??
            (confirmNewPassword.length > 0 && !confirmMatches
              ? t('admin.account.errors.confirmMismatch')
              : null)
          }
        />

        <button type="submit" className="btn-primary w-full" disabled={!canSubmit}>
          <span className="icon text-base">
            {change.isPending ? 'hourglass_top' : 'lock_reset'}
          </span>
          {t('admin.account.submit')}
        </button>
      </form>
    </div>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
  error?: string | null;
  autoComplete: string;
  children?: React.ReactNode;
};

function PasswordField({
  label,
  value,
  onChange,
  show,
  toggle,
  error,
  autoComplete,
  children,
}: PasswordFieldProps) {
  const { t } = useTranslation();
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <span className="icon pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-base text-soft">
          lock
        </span>
        <input
          className="input ps-10 pe-11"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={t(show ? 'admin.account.hide' : 'admin.account.show')}
          aria-pressed={show}
          className="absolute end-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-soft transition hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] hover:text-accent"
        >
          <span className="icon text-[20px]">{show ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
      {children}
      {error && (
        <span className="mt-1 block text-xs" style={{ color: 'var(--danger)' }}>
          {error}
        </span>
      )}
    </label>
  );
}

function StrengthMeter({
  bars,
  barColor,
  labelKey,
}: {
  bars: number;
  barColor: string;
  labelKey: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-2" aria-hidden={labelKey ? undefined : true}>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < bars ? barColor : 'bg-[color-mix(in_srgb,var(--text-secondary)_18%,transparent)]'
            }`}
          />
        ))}
      </div>
      {labelKey && (
        <p className="mt-1 text-[11px] text-soft" aria-live="polite">
          {t(labelKey)}
        </p>
      )}
    </div>
  );
}

function RuleList({ items }: { items: { ok: boolean; key: string }[] }) {
  const { t } = useTranslation();
  return (
    <ul className="mt-2 space-y-0.5 text-[11px] text-soft">
      {items.map((it) => (
        <li
          key={it.key}
          className="flex items-center gap-1.5"
          style={it.ok ? { color: 'var(--success)' } : undefined}
        >
          <span className="icon text-[14px]">{it.ok ? 'check_circle' : 'radio_button_unchecked'}</span>
          {t(it.key)}
        </li>
      ))}
    </ul>
  );
}
