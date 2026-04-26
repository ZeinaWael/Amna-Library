import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '../../api/hooks';
import { useAuth } from '../../store/auth';
import { ApiError } from '../../types/api';
import { AmbientOrbs } from '../../components/AmbientOrbs';
import { ParticleCanvas } from '../../components/ParticleCanvas';
import { BrandLogos } from '../../components/BrandLogos';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type FormVals = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const login = useLogin();
  const setAuth = useAuth((s) => s.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (vals: FormVals) => {
    try {
      const r = await login.mutateAsync(vals);
      setAuth(r.token, r.user, r.expiresAt);
      nav('/admin');
    } catch {
      // surfaced below
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6 surface">
      <ParticleCanvas />
      <AmbientOrbs />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="modal-card relative z-10 card w-full max-w-md overflow-hidden p-8"
      >
        <div className="absolute inset-x-0 top-0 h-1 gradient-bar" />

        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogos size="lg" />
          <h1 className="font-display text-3xl font-bold gradient-text">{t('common.appName')}</h1>
          <p className="text-xs text-soft">{t('common.schoolName')}</p>
        </div>

        <h2 className="mb-1 text-center text-lg font-semibold">{t('admin.login.title')}</h2>
        <p className="mb-5 text-center text-sm text-soft">{t('admin.login.subtitle')}</p>

        {login.error && login.error instanceof ApiError && (
          <p
            className="mb-4 flex items-start gap-2 rounded-xl px-3 py-2 text-sm"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
          >
            <span className="icon text-base">error</span>
            {login.error.status === 401 ? t('admin.login.invalid') : login.error.message}
          </p>
        )}

        <label className="mb-4 block">
          <span className="label">{t('admin.login.email')}</span>
          <div className="relative">
            <span className="icon pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-base text-soft">
              mail
            </span>
            <input
              className="input ps-10"
              type="email"
              autoComplete="username"
              placeholder="admin@example.com"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <span className="mt-1 block text-xs" style={{ color: 'var(--danger)' }}>
              {errors.email.message}
            </span>
          )}
        </label>

        <label className="mb-6 block">
          <span className="label">{t('admin.login.password')}</span>
          <div className="relative">
            <span className="icon pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-base text-soft">
              lock
            </span>
            <input
              className="input ps-10"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
            />
          </div>
          {errors.password && (
            <span className="mt-1 block text-xs" style={{ color: 'var(--danger)' }}>
              {errors.password.message}
            </span>
          )}
        </label>

        <button type="submit" className="btn-primary w-full" disabled={login.isPending}>
          <span className="icon text-base">{login.isPending ? 'hourglass_top' : 'login'}</span>
          {t('admin.login.submit')}
        </button>

        <p className="mt-5 text-center text-[11px] text-soft">
          {t('admin.login.secureNote')}
        </p>
      </form>
    </div>
  );
}
