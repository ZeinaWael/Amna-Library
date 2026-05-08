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
