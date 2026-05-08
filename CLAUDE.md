# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Online book library — anonymous public site for browsing/searching/reading/downloading books, plus a single-admin JWT-protected dashboard. Two-app monorepo:

- [backend/BookLibrary.Api](backend/BookLibrary.Api/) — ASP.NET Core (`net10.0`) Web API, EF Core + Npgsql against Supabase Postgres, Supabase Storage REST for files.
- [frontend/](frontend/) — Vite + React 19 + TypeScript SPA, Tailwind (with `tailwindcss-rtl`), react-query, react-router v6, react-pdf reader, i18next (en/ar).

Design spec and original plan live in [docs/superpowers/specs/](docs/superpowers/specs/) and [docs/superpowers/plans/](docs/superpowers/plans/). Note: the spec says ASP.NET Core 8 / EF Core 8, but the actual project targets `net10.0` with EF Core 10 — trust the csproj.

## Commands

### Backend (run from `backend/BookLibrary.Api/`)

```bash
dotnet restore
dotnet build
dotnet run                                 # serves on Kestrel default ports; Swagger at /swagger in Development
dotnet ef migrations add <Name>            # add a migration
dotnet ef database update                  # apply migrations to the configured connection
docker build -t booklibrary-api .          # production image (Railway uses this Dockerfile)
```

There is no test project.

### Frontend (run from `frontend/`)

```bash
npm install
npm run dev        # vite dev server
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run preview    # serve the built dist/
```

## Configuration & secrets

Backend reads from `appsettings.json` + user-secrets (dev) / environment variables (prod). **Never put real secrets in `appsettings.json` or `appsettings.Development.json`** (the latter is gitignored but treat it as ephemeral). Required keys:

- `ConnectionStrings:Default` — Postgres connection (Supabase session pooler in this project; see memory).
- `Jwt:Key` / `Jwt:Issuer` / `Jwt:Audience` / `Jwt:ExpiryHours`.
- `Supabase:Url` / `Supabase:ServiceRoleKey` / `Supabase:CoversBucket` / `Supabase:FilesBucket` — used by [SupabaseStorageClient](backend/BookLibrary.Api/Infrastructure/Storage/SupabaseStorageClient.cs) over plain `HttpClient` (no Supabase C# SDK).
- `BootstrapAdmin:Email` / `BootstrapAdmin:Password` — optional first-run admin creation.
- `Cors:AllowedOrigins` — array of allowed frontend origins; CORS policy `AllowFrontend` is the only one applied.

Dev seed in [SeedData.cs](backend/BookLibrary.Api/Data/Seed/SeedData.cs) runs only when `Environment.IsDevelopment()` AND the database is reachable, and creates a default admin (`admin@booklibrary.local` / `Admin#12345`) plus genres/authors/books/reviews.

Frontend uses `VITE_API_BASE_URL` (`.env` / Vercel env). Production already points at the Railway API.

## Architecture

### Backend layering

`Controllers → Services → Repositories → AppDbContext (EF Core)`. Controllers are intentionally thin; business rules live in `Services/*`, queries in `Repositories/*`. DI wiring is centralized in [Program.cs](backend/BookLibrary.Api/Program.cs).

EF Core uses `UseSnakeCaseNamingConvention()` (via `EFCore.NamingConventions`) — entity property `AverageRating` ↔ column `average_rating`. Don't override column names manually. All entity config lives in [AppDbContext.OnModelCreating](backend/BookLibrary.Api/Data/AppDbContext.cs); add new indexes/constraints there.

### API response envelope (important)

Every controller action's success result is wrapped by [ApiResponseWrappingFilter](backend/BookLibrary.Api/Filters/ApiResponseWrappingFilter.cs) into `ApiResponse<T> { success, data, message, errors }`. Errors flow through [ExceptionHandlingMiddleware](backend/BookLibrary.Api/Infrastructure/Middleware/ExceptionHandlingMiddleware.cs) (registered as `app.UseExceptionHandling()`) which produces the same envelope shape.

Consequences:
- Don't return `ApiResponse<T>` manually from a controller — the filter would skip wrapping if it sees one already, but returning raw DTOs is the convention.
- The frontend [api/client.ts](frontend/src/api/client.ts) axios response interceptor unwraps `success: true` → `res.data = env.data`, and throws `ApiError` for `success: false`. So all `useQuery` `queryFn`s read `.data` directly as the unwrapped payload — don't double-unwrap.

### Auth

Hand-rolled — no ASP.NET Identity. `users` table stores BCrypt hashes ([PasswordHasher](backend/BookLibrary.Api/Infrastructure/Auth/PasswordHasher.cs)); [JwtTokenService](backend/BookLibrary.Api/Infrastructure/Auth/JwtTokenService.cs) issues JWTs validated by `Microsoft.AspNetCore.Authentication.JwtBearer`. Frontend stores the token in zustand ([store/auth.ts](frontend/src/store/auth.ts)), the axios request interceptor injects `Authorization: Bearer …`, and on 401 it logs out and redirects to `/admin/login`. `RequireAdmin` guards `/admin/*` routes.

### Admin account

Admins can change their own password from `/admin/account` (frontend [AccountSettingsPage](frontend/src/pages/admin/AccountSettingsPage.tsx)) which posts to `POST /api/auth/account/change-password` ([AccountController](backend/BookLibrary.Api/Controllers/AccountController.cs)). The endpoint requires a valid JWT, verifies the current password against the stored BCrypt hash, validates the new password (≥12 chars, upper/lower/digit/symbol, must differ from current, must equal confirm), then re-hashes and updates the user row.

- **`users.password_changed_at`** column tracks the last password change. Default `CURRENT_TIMESTAMP` so existing rows are populated on first deploy. Schema lives in [AppDbContext](backend/BookLibrary.Api/Data/AppDbContext.cs); the migration is hand-rolled at [Migrations/20260508120000_AddPasswordChangedAt.cs](backend/BookLibrary.Api/Migrations/20260508120000_AddPasswordChangedAt.cs) (the repo had no prior baseline). Apply manually with `dotnet ef database update` against the target connection — no auto-migrate on startup.
- **`pwd_iat` JWT claim** ([JwtTokenService.PasswordIssuedAtClaim](backend/BookLibrary.Api/Infrastructure/Auth/JwtTokenService.cs)) is the user's `password_changed_at` as Unix seconds. `JwtBearerEvents.OnTokenValidated` ([Program.cs](backend/BookLibrary.Api/Program.cs)) rejects tokens whose `pwd_iat` is older than the user's current `password_changed_at`, so changing the password instantly invalidates every previously-issued token (other tabs, other devices). Tokens missing the claim (legacy issuance) and tokens for the bootstrap pseudo-user (`sub == Guid.Empty`, no DB row) are accepted as-is.
- **Bootstrap admin** can sign in via `BootstrapAdmin:Email` / `BootstrapAdmin:Password` from config but **cannot** change their password via this endpoint — the controller returns 401 because there is no DB row to update. Rotate the bootstrap password by editing config / the Railway env var.
- **Rate limit** policy `change-password` (Microsoft.AspNetCore.RateLimiting, fixed-window) is `5 attempts / 15 min`, partitioned by JWT `sub` (falls back to remote IP if missing). It's the only rate-limited endpoint in the API; `app.UseRateLimiter()` runs after `UseAuthentication` so the partition key sees the user claim. Don't loosen this without a security review.

### Reviews

Reviews are submitted anonymously with reviewer name+email, default to `Pending`, and are moderated via `AdminReviewsController`. Only `Approved` reviews are returned by public endpoints. Reviewer names are masked through [INameMasker](backend/BookLibrary.Api/Services/NameMasker.cs) before going to public DTOs (e.g., `Grace Hopper` → `G***e H****r`). Always go through the masker for any public-facing reviewer name. `Book.AverageRating`/`ReviewCount` are denormalized — recalculate them whenever review status changes (see `RecalculateBookRatingsAsync` pattern in seed).

### Storage

Cover images and PDF files live in two public Supabase Storage buckets (`book-covers`, `book-files`). Backend uploads/deletes via the Storage REST API using the service-role key; the URLs returned are the public CDN URLs and are stored on the `Book` row. Don't try to add the Supabase C# SDK — the deliberate choice is plain `HttpClient`.

### Frontend routing & data

Routes are declared in [App.tsx](frontend/src/App.tsx) with `React.lazy` per page; loading falls back to `PageSkeleton`. Two layouts: `PublicLayout` (browse/search/detail) and `AdminLayout` (dashboard, behind `RequireAdmin`). The reader (`/books/:id/read`) is intentionally outside both layouts so it can be full-screen.

All server state goes through react-query hooks in [api/hooks.ts](frontend/src/api/hooks.ts) — there's no other data-fetching path. Use the existing query-key conventions (`['books', 'list', filters]`, `['book', id]`, etc.) so cache invalidation in mutations keeps working.

### i18n & RTL

Every user-visible string must use `t('…')` — locale files are [en.json](frontend/src/i18n/en.json) and [ar.json](frontend/src/i18n/ar.json). Tailwind is configured with the `tailwindcss-rtl` plugin; prefer logical utilities (`ms-*`/`me-*`, `ps-*`/`pe-*`, `text-start`/`text-end`) over `ml-*`/`mr-*` so Arabic mirrors correctly.

### PDF reader

`pdfjs-dist` worker is bundled locally (see recent commit `feat: UI polish across public/admin pages + bundle PDF.js worker locally`) — don't switch back to a CDN worker URL. `react-pdf` is the wrapper used in [ReaderPage](frontend/src/pages/public/ReaderPage.tsx).

## Deployment

- **API → Railway** (`api-production-acf6`) via the Dockerfile in `backend/BookLibrary.Api/`. `ASPNETCORE_URLS=http://+:8080`. Set all `appsettings` keys as Railway env vars (use `Section__Key` naming).
- **Frontend → Vercel** (`amna-book-library`). `frontend/vercel.json` rewrites everything to `/index.html` for SPA routing. `VITE_API_BASE_URL` must point at the Railway API.
- **Database & storage → Supabase** (project ref `ghdlpnipklujutnfurll`). Use the **session pooler** connection string for the API.

Migrations are applied manually via `dotnet ef database update` against the target connection string — there is no auto-migration on startup. The dev-only seed in `Program.cs` does NOT run in production.

## Recent changes — 2026-05-08

The architecture sections above remain the canonical reference for how each feature works. This section is a precise engineering changelog of what shipped, what's pending, and what to verify, scoped to the work completed on 2026-05-08.

### 1. Phase 6 — Admin password change (backend)

#### `User` entity
- [Entities/User.cs](backend/BookLibrary.Api/Entities/User.cs) — added `PasswordChangedAt` (`DateTime`, UTC, defaulted to `DateTime.UtcNow` for new instances). The property backs both the database column and the JWT `pwd_iat` claim.

#### EF Core mapping
- [Data/AppDbContext.cs](backend/BookLibrary.Api/Data/AppDbContext.cs) — `User.PasswordChangedAt` is configured `IsRequired()` with `HasDefaultValueSql("CURRENT_TIMESTAMP")`, so existing rows backfill on column-add and any direct INSERT (e.g. seed) without setting the property still receives a server-side timestamp.

#### JWT — `pwd_iat` claim
- [Infrastructure/Auth/JwtTokenService.cs](backend/BookLibrary.Api/Infrastructure/Auth/JwtTokenService.cs) —
  - Issued tokens carry `pwd_iat` = `User.PasswordChangedAt` as Unix seconds (`ClaimValueTypes.Integer64`).
  - Bootstrap admin (`User.Id == Guid.Empty`) is **not** issued a `pwd_iat` claim, so its tokens still validate after this change.
  - Constant `JwtTokenService.PasswordIssuedAtClaim = "pwd_iat"` is exposed for the validation hook.

#### `IUserRepository`
- [Repositories/IUserRepository.cs](backend/BookLibrary.Api/Repositories/IUserRepository.cs) — three additions on top of the existing `GetByEmailAsync`:
  - `GetByIdAsync(Guid id, CancellationToken ct)` — full entity load, used by the change-password service.
  - `GetPasswordChangedAtAsync(Guid id, CancellationToken ct)` — projection-only read used by `OnTokenValidated`. Avoids hydrating the full row on every authenticated request.
  - `UpdatePasswordAsync(Guid id, string newHash, DateTime passwordChangedAt, CancellationToken ct)` — single `ExecuteUpdateAsync` setting both columns; throws `InvalidOperationException` when no row matches (defence against the user being deleted between login and change).

#### `IAuthService.ChangePasswordAsync`
- Implementation in [Services/IAuthService.cs](backend/BookLibrary.Api/Services/IAuthService.cs):
  1. Reject `userId == Guid.Empty` with 401 ("Invalid session.") — bootstrap admin cannot use this path.
  2. Load user by id; null → 401 (token referenced a deleted user).
  3. Verify `currentPassword` against `user.PasswordHash` via `IPasswordHasher`. Mismatch → `AppException.BadRequest("Current password is incorrect.", new[] { "currentPassword" })`. The message is intentionally generic; the `errors` array carries the field code for the frontend to map.
  4. Validate `newPassword`. Failures → `AppException.BadRequest("Validation failed.", errors)`, where `errors` are field-prefixed codes: `newPassword.tooShort`, `newPassword.missingUpper`, `newPassword.missingLower`, `newPassword.missingDigit`, `newPassword.missingSymbol`, `newPassword.sameAsOld`, `confirmNewPassword.mismatch`.
  5. Re-hash with BCrypt, persist hash + `passwordChangedAt = DateTime.UtcNow`.
- The validator is private to the service. The project uses neither FluentValidation nor DataAnnotations elsewhere; this matches the existing pattern of throwing `AppException` from services.

#### `AccountController`
- [Controllers/AccountController.cs](backend/BookLibrary.Api/Controllers/AccountController.cs) — `[ApiController]`, `[Authorize]`, `[Route("api/auth/account")]`. Single action `POST change-password` annotated with `[EnableRateLimiting("change-password")]`. Resolves `userId` from JWT `sub`; on parse failure raises 401. Returns `204 NoContent`; the `ApiResponseWrappingFilter` converts that into `{ success: true, data: null }` per project convention.
- Constant `AccountController.ChangePasswordRateLimitPolicy = "change-password"` is the shared name between policy registration and the action attribute.

#### Rate limiting
- [Program.cs](backend/BookLibrary.Api/Program.cs) registers `Microsoft.AspNetCore.RateLimiting` (built-in to .NET 7+, no new package).
- One named policy: `change-password` — fixed window, `PermitLimit = 5`, `Window = 15 min`, `QueueLimit = 0`, `AutoReplenishment = true`.
- Partition key: JWT `sub` claim, falling back to `RemoteIpAddress`, falling back to literal `"anonymous"`.
- `app.UseRateLimiter()` is mounted **after** `UseAuthentication` so the partition function sees the authenticated principal.
- This is the only rate-limited endpoint in the API. Other rate limits are untouched.

#### `OnTokenValidated` invalidation hook
- [Program.cs](backend/BookLibrary.Api/Program.cs) extends the JWT bearer's `Events`:
  - Reads `sub` from the principal; if it doesn't parse or is `Guid.Empty`, returns immediately. Bootstrap-admin tokens fall through unchanged.
  - Reads `pwd_iat`. If absent (legacy token issued before this feature), returns immediately so existing sessions are not invalidated by the deploy.
  - Loads `password_changed_at` for `userId` via `IUserRepository.GetPasswordChangedAtAsync`. Null → `ctx.Fail("User not found.")`.
  - Compares Unix-seconds: if `pwd_iat < currentUnix`, `ctx.Fail("Password changed; token rejected.")`. Effect: every previously-issued token for that admin is rejected on its next request.
- Cost: one indexed PK lookup per authenticated request. Acceptable for admin endpoints. If perf becomes a concern, cache the timestamp by user id with short TTL and invalidate on `UpdatePasswordAsync`.

#### Bootstrap admin handling
- The bootstrap admin (`BootstrapAdmin:Email` / `BootstrapAdmin:Password` in config) cannot change its password through `/api/auth/account/change-password`: there is no DB row for `Guid.Empty`, so the service returns 401. The bootstrap path is a deliberate break-glass mechanism and was not extended with a DB-backed user. Rotate bootstrap credentials by editing config / Railway env vars.

### 2. Database migration

#### `20260508120000_AddPasswordChangedAt`
- Hand-rolled at [Migrations/20260508120000_AddPasswordChangedAt.cs](backend/BookLibrary.Api/Migrations/20260508120000_AddPasswordChangedAt.cs). Single `AddColumn` step:
  ```sql
  ALTER TABLE users
    ADD COLUMN password_changed_at timestamp with time zone NOT NULL
    DEFAULT CURRENT_TIMESTAMP;
  ```
- Annotated with `[DbContext(typeof(AppDbContext))]` and `[Migration("20260508120000_AddPasswordChangedAt")]`. Both attributes are required for EF to discover migration classes by reflection.

#### Why hand-rolled (Supabase compatibility)
- The repo had no `Migrations/` directory and no `ModelSnapshot` when this work started, but the live DB's `__EFMigrationsHistory` already contained `20260426185707_InitialCreate` from a prior apply (the migration file was not in the repo). Generating a fresh migration via `dotnet ef migrations add` in this state would produce a "create everything from scratch" diff that conflicts with the live schema. A hand-rolled, single-purpose migration sidesteps that.
- `AddDbContext` in `Program.cs` now includes `.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning))`. EF 10 escalates this warning to an error by default; without the suppression, `dotnet ef database update` aborts because there is no snapshot to diff against. The suppression matches the project's stance ("schema is managed externally; one hand-rolled migration at a time"). If the project ever switches to fully EF-managed schema, drop this line and rebaseline from a clean state.

#### Backfill behaviour
- `DEFAULT CURRENT_TIMESTAMP` populates the column for every existing row at apply time. Existing admins keep working: their next-issued token's `pwd_iat` matches the freshly-set `password_changed_at`, so `OnTokenValidated` returns the token as valid.

#### Migration history (live Supabase DB after apply)
| migration_id                              | product_version |
|-------------------------------------------|-----------------|
| `20260426185707_InitialCreate`            | (pre-existing)  |
| `20260508120000_AddPasswordChangedAt`     | `10.0.7`        |

#### Apply procedure (run BEFORE deploying API code that reads the column)
From `backend/BookLibrary.Api`, with the production connection string available (user-secrets or `ConnectionStrings__Default` env var):
```powershell
dotnet ef database update
```
Equivalent raw SQL through the Supabase SQL editor:
```sql
ALTER TABLE users
  ADD COLUMN password_changed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260508120000_AddPasswordChangedAt', '10.0.7')
ON CONFLICT DO NOTHING;
```
Status as of 2026-05-08: applied to the live Supabase instance. Re-running is idempotent.

### 3. Frontend changes

#### `AccountSettingsPage`
- [pages/admin/AccountSettingsPage.tsx](frontend/src/pages/admin/AccountSettingsPage.tsx) — three password fields (`currentPassword`, `newPassword`, `confirmNewPassword`), each with:
  - `type="password"` ↔ `text` toggle wired to a per-field `show*` boolean. Show/hide button uses Material Icons `visibility` / `visibility_off`. `aria-label`/`aria-pressed` localised.
  - Error display below the input merges server field errors (mapped from API codes via `ERROR_KEYS`) with a live confirm-mismatch check.
- Live rule list under the new-password field (length, uppercase, lowercase, digit, symbol, differs-from-current). Each rule lights with `check_circle` / `radio_button_unchecked` and flips colour to `var(--success)` when satisfied.
- Strength meter: 4 bars driven by the count of satisfied rules (`weak`, `fair`, `good`, `strong`). `aria-live="polite"` on the label so screen readers announce updates.
- Submit button disabled until: not pending, current password non-empty, all new-password rules satisfied, confirm matches.
- On HTTP 429: dedicated banner using `admin.account.errors.rateLimited`. Other API errors map per-field via `ERROR_KEYS`.

#### API hook
- [api/hooks.ts](frontend/src/api/hooks.ts) — `useChangePassword()` mutation against `POST /auth/account/change-password`. Side effects (toast + logout + redirect) live in the page so the hook stays composable.

#### Routing
- [App.tsx](frontend/src/App.tsx) — `AccountSettingsPage` is `React.lazy`-imported and registered at `/admin/account` inside the existing `RequireAdmin` + `AdminLayout` block. No public exposure.

#### Sidebar integration
- [layouts/AdminLayout.tsx](frontend/src/layouts/AdminLayout.tsx) — added `{ to: '/admin/account', icon: 'manage_accounts', key: 'admin.nav.account' }` as the last entry of the existing `ITEMS` array. Active styling, badge handling, and click target are inherited from the existing renderer.

#### i18n
- [i18n/en.json](frontend/src/i18n/en.json) and [i18n/ar.json](frontend/src/i18n/ar.json) — added `admin.nav.account` plus the full `admin.account.*` namespace: title/subtitle, three field labels, show/hide labels, submit, success message, all eight error keys (including `rateLimited`), four strength labels (`weak` / `fair` / `good` / `strong`). Arabic copy is natural translation, not transliteration.

#### Logout + redirect on success
- On `useChangePassword` resolving: `useToast().toast({ type: 'success', message: t('admin.account.success'), duration: 5000 })` → `useAuth.logout()` → `nav('/admin/login')`. The existing `ToastProvider` wraps the entire app at `main.tsx`, so the toast survives the route change.

#### Rate-limit UI handling
- `change.error instanceof ApiError && change.error.status === 429` shows the localised banner above the form. The user can still see what they typed; submit is allowed again immediately on the client and the next API call enforces the wait, returning 429 again if too soon.

### 4. Security enhancements

#### Stale-token rejection (`pwd_iat` vs `password_changed_at`)
Before this change a JWT remained valid until its `exp`; compromised tokens could not be revoked without rotating the JWT signing key. After: each issued token carries the issuing user's `password_changed_at` as `pwd_iat`. `OnTokenValidated` rejects tokens whose `pwd_iat` is earlier than the current DB value. Cost: one indexed PK lookup per authenticated request.

#### Multi-tab / multi-device logout
A direct consequence: changing the password from anywhere bumps `password_changed_at` to "now". Every other open tab / device using a token issued before that moment fails its next API call with 401, and the existing axios 401 interceptor ([api/client.ts](frontend/src/api/client.ts)) redirects those tabs to `/admin/login`.

#### Current-password verification
Verified before any cheap-to-fail rule is checked, so a wrong-current attempt does not leak which subset of new-password rules would have failed via timing or the error array. The error returned for wrong-current is a generic message + a single field code; it does not echo any submitted value.

#### Rate limiting
`5 attempts / 15 min`, per user (JWT `sub`) with IP fallback. Fixed window, no queue: the 6th attempt within the window receives 429 immediately. The timer resets on the next window, not on each attempt.

#### Logging hygiene
The endpoint never logs the request body. The project has no request-logging middleware that would otherwise capture it, and `ExceptionHandlingMiddleware` logs only the exception message ("Validation failed." / "Current password is incorrect.") via `_logger.LogWarning`, never the DTO. The success path returns 204 with no body.

### 5. Deployment & infrastructure

#### Commits pushed today
- `7d78b3c` — Phase 4 + Phase 5 (shelf, continue-reading rail, by-ids endpoint, SEO + sitemap).
- `117b2b2` — Phase 6 (admin password change).
- Both pushed to `origin/main`. Railway and Vercel auto-deploy on push.

#### Polling jobs in flight
At the time of this update, three background polls are watching for redeploys to complete:
- Railway `/api/sitemap.xml` returning HTTP 200 (Phase 5 — sitemap endpoint live).
- Vercel `/robots.txt` returning the static file body starting with `User-agent` (Phase 5 — robots.txt + `vercel.json` rewrite live).
- Railway `/api/auth/account/change-password` returning 401 to an unauthenticated POST (Phase 6 — endpoint registered).

#### Environment changes required on Railway
- `Seo__SiteUrl=https://amna-book-library.vercel.app` (Phase 5; already set).
- No new env vars for Phase 6. The new rate-limit policy and JWT changes use the existing `Jwt:*` configuration.

#### Production state (as of this write)
- Database: migrated. `users.password_changed_at` exists and is populated.
- API code that reads the column: not yet deployed (Phase 6 commit pushed; redeploy in progress per the pollers).
- Frontend `/admin/account` page: not yet deployed (same status).
- **No production impact yet**: the column is invisible to the running API (which doesn't read it) and the new route resolves to the SPA fallback (which is a 404 inside the app until the new bundle ships).

### 6. Build status

| Component | Command           | Result                                                                            |
|-----------|-------------------|-----------------------------------------------------------------------------------|
| Backend   | `dotnet build`    | 0 warnings, 0 errors                                                              |
| Frontend  | `npm run build`   | succeeded; new `AccountSettingsPage` chunk emitted                                |
| Frontend  | `npm run lint`    | 5 problems, all pre-existing — none in files added/modified by Phase 6            |

### 7. Manual verification plan

Run after Railway and Vercel redeploys complete (the pollers will notify).

1. **Happy path.** Sign in as a seeded admin (not the bootstrap admin). Open `/admin/account`, type the current password and a valid new password (≥12 chars, mixed case + digit + symbol), confirm. Submit → `admin.account.success` toast appears, redirected to `/admin/login`, old credentials no longer work, new credentials do.
2. **Wrong current password.** Type a wrong current password and a valid new one. Submit → inline error under "Current password" reads `Current password is incorrect.`. Page does not navigate; auth store is unchanged; no toast.
3. **Weak new password.** Type something that violates ≥1 rule. Submit stays disabled; rule list and strength bar update live. If submit is force-clicked via DevTools, backend rejects with the exact failing rule codes mapped to inline errors.
4. **New equals current.** Type the same value into both fields. `Must differ from the current password.` lights red; submit disabled; if forced, backend returns `newPassword.sameAsOld`.
5. **Multi-tab `pwd_iat` invalidation.** Open `/admin` in tabs A and B. Change password in A. In B, click any admin nav target that triggers an API call → 401, axios interceptor redirects B to `/admin/login`. New credentials work there.
6. **Rate limit.** Submit 5 wrong-current attempts within 15 min from the same admin. The 6th returns 429; the page banner shows `Too many attempts…`. Wait the window out; next attempt is allowed.
7. **Migration backfill.** On a fresh dev DB containing the seeded admin, run `dotnet ef database update`. Inspect `users.password_changed_at` — every row has the apply-time `CURRENT_TIMESTAMP`. Existing admin can still log in.
8. **Bootstrap admin negative case.** Sign in via `BootstrapAdmin:Email` / `BootstrapAdmin:Password`. Open `/admin/account`, attempt to change password → 401. Bootstrap credentials are rotated via Railway env vars, not via this UI.

### 8. Critical notes

#### Apply the migration before deploying API code that reads the column
The new code paths (`OnTokenValidated`, `ChangePasswordAsync`) read `users.password_changed_at`. If the API rolls out before the column exists, every authenticated request fails. The order followed today:
1. Phase 6 backend code committed (`117b2b2`).
2. `dotnet ef database update` ran successfully against Supabase.
3. Push to `main` triggered Railway redeploy.

Re-running `dotnet ef database update` is idempotent: EF skips already-applied migrations.

#### Supabase / EF compatibility
The project does not use a full EF migration system. Schema is managed by hand against Supabase, and EF migrations are introduced one at a time when a code change requires a column. The `PendingModelChangesWarning` suppression in `AddDbContext` is the deliberate signal of this stance. Do not run `dotnet ef migrations add` casually — without a baseline snapshot it generates a "create the world" migration that does not match the live DB.

If a future change wants to adopt fully EF-managed schema:
1. Drop the warning suppression.
2. Clear `Migrations/` and `__EFMigrationsHistory`.
3. Run `dotnet ef migrations add InitialBaseline` against an empty DB.
4. `database update` to apply.

#### Spec deviations
- **Eye icon library.** Phase 6 spec asked for `lucide-react`. The package is not in `frontend/package.json`, the global rule is "no new runtime deps unless explicitly listed in a phase", and Phase 6 did not list it. Used Material Icons `visibility` / `visibility_off` via the existing `.icon` className convention to match the rest of the admin UI. Same deviation applied to Phase 4's heart icon (`favorite` / `favorite_border`).
- **Validation library.** Phase 6 spec offered FluentValidation or DataAnnotations. The project uses neither. Validation is implemented manually inside the auth service, mirroring the existing pattern of throwing `AppException` with a field-coded `errors` array.
