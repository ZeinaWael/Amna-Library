# Online Book Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public Online Book Library with anonymous browse/read/download and a JWT-protected admin dashboard for managing books, authors, genres, and reviews.

**Architecture:** ASP.NET Core 8 Web API + EF Core (Npgsql, snake_case) over Supabase Postgres, with files stored in Supabase Storage via the Storage REST API. React 18 + Vite + Tailwind + TanStack Query frontend with Arabic/English i18n, dark mode, and an in-browser PDF reader (react-pdf). Thin controllers → services → repositories on the backend; pages → hooks → axios client on the frontend.

**Tech Stack:** .NET 8, EF Core 8 + Npgsql, BCrypt.Net-Next, AutoMapper, JwtBearer, Vite + React 18 + TypeScript, Tailwind CSS, @tanstack/react-query, i18next, zustand, axios, react-pdf, react-hook-form + zod. Deploy to Railway (API) and Vercel (frontend); Supabase Postgres + Storage.

**Spec reference:** `docs/superpowers/specs/2026-04-24-online-book-library-design.md` — read it before starting; this plan assumes you have.

**Tests:** Deferred for first pass per spec §11. Verification in each task is manual (build, run, curl, browser). Do not add xUnit/vitest scaffolding.

**Commit cadence:** Commit after every task. Short conventional messages (`feat:`, `chore:`, `fix:`).

---

## Repo layout produced by this plan

```
Amna/
├── backend/
│   ├── BookLibrary.sln
│   └── BookLibrary.Api/
│       ├── Controllers/
│       ├── Services/
│       ├── Repositories/
│       ├── Entities/
│       ├── Data/
│       ├── Contracts/{Requests,Responses}/
│       ├── Mapping/
│       ├── Infrastructure/{Auth,Storage,Middleware}/
│       ├── Filters/
│       ├── Program.cs
│       ├── appsettings.json
│       ├── appsettings.Development.json
│       └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── i18n/
│   │   ├── layouts/
│   │   ├── pages/{public,admin}/
│   │   ├── store/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vercel.json
│   └── package.json
└── docs/
```
## Phase 1 — Backend scaffold & infrastructure

### Task 1: Create backend solution and Web API project

**Files:**
- Create: `backend/BookLibrary.sln`
- Create: `backend/BookLibrary.Api/BookLibrary.Api.csproj`

- [ ] **Step 1:** `cd backend && dotnet new sln -n BookLibrary && dotnet new webapi -n BookLibrary.Api --framework net8.0 --use-controllers && dotnet sln add BookLibrary.Api/BookLibrary.Api.csproj`
- [ ] **Step 2:** Delete template files `Controllers/WeatherForecastController.cs` and `WeatherForecast.cs`.
- [ ] **Step 3:** `cd backend && dotnet build` → expect success.
- [ ] **Step 4:** `git add backend/ && git commit -m "chore: scaffold ASP.NET Core 8 Web API project"`

### Task 2: Install NuGet packages

```bash
cd backend/BookLibrary.Api
dotnet add package Microsoft.EntityFrameworkCore --version 8.0.*
dotnet add package Microsoft.EntityFrameworkCore.Design --version 8.0.*
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.*
dotnet add package EFCore.NamingConventions --version 8.0.*
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.*
dotnet add package System.IdentityModel.Tokens.Jwt --version 8.0.*
dotnet add package BCrypt.Net-Next --version 4.0.3
dotnet add package AutoMapper --version 13.0.1
dotnet add package AutoMapper.Extensions.Microsoft.DependencyInjection --version 12.0.1
dotnet add package Swashbuckle.AspNetCore --version 6.6.2
dotnet tool install --global dotnet-ef --version 8.0.*   # or tool update
```

Build, commit: `chore: add EF Core, JWT, AutoMapper, BCrypt packages`.

### Task 3: Entity classes

See spec §4 for field list. Create one file per entity under `Entities/`:
- `ReviewStatus.cs` — static `Pending`/`Approved`/`Rejected` constants.
- `User.cs`, `Author.cs`, `Genre.cs`, `Book.cs`, `Review.cs` — POCOs with navigation properties matching the spec tables.

Full code for each entity is provided in the implementation commits (see `backend/BookLibrary.Api/Entities/*.cs`). Build and commit.

### Task 4: AppDbContext with configurations

File: `Data/AppDbContext.cs`. Configure:
- Unique `users.email`, `genres.name`, `genres.slug`.
- `Book.AverageRating` precision(3,2); indexes on `is_published`, `(is_featured,is_published)`, `genre_id`, `author_id`.
- `Book.Author`/`Book.Genre` → `OnDelete(Restrict)`.
- `Review.Book` → `OnDelete(Cascade)`.
- Check constraint `rating BETWEEN 1 AND 5`.
- Unique `(book_id, lower(reviewer_email))` added via raw SQL in the migration.

### Task 5: Response envelope + filter

- `Contracts/ApiResponse.cs` — generic `ApiResponse<T>` and non-generic `ApiResponse` with `Ok`/`Fail` factories.
- `Filters/ApiResponseWrappingFilter.cs` — `IAsyncActionFilter` that wraps `ObjectResult` values in `ApiResponse.Ok(value)` when not already wrapped.

### Task 6: Global exception middleware

`Infrastructure/Middleware/ExceptionHandlingMiddleware.cs`:
- `AppException(int status, message, errors)` with `NotFound/Conflict/BadRequest/Unauthorized` factories.
- Middleware catches `AppException` → 4xx JSON envelope; catches all else → 500 generic envelope.
- `UseExceptionHandling()` extension.

### Task 7: JWT + password hasher

- `Infrastructure/Auth/JwtOptions.cs` — bound from `Jwt:*`.
- `JwtTokenService` issues HS256 token with `sub`, `email`, `role`, `jti`.
- `PasswordHasher` wraps `BCrypt.Net.BCrypt.HashPassword/Verify` (work factor 11).

### Task 8: Supabase Storage client

`Infrastructure/Storage/SupabaseStorageClient.cs`:
- Typed `HttpClient` pre-configured with `Authorization: Bearer <service-role-key>`.
- `UploadAsync(bucket, key, Stream, contentType, ct)` → `PUT /storage/v1/object/{bucket}/{key}` with `x-upsert: true`. Returns `{url}/storage/v1/object/public/{bucket}/{key}`.
- `DeleteAsync(bucket, key, ct)` → logs & returns false on failure (per spec rule 8).
- `ExtractKeyFromPublicUrl(url)` — parses `/storage/v1/object/public/{bucket}/{key}`.

### Task 9: DTOs

- `Contracts/Requests/` — LoginRequest, BookQuery, BookSearchQuery, CreateBookRequest, UpdateBookRequest, PublishBookRequest, CreateAuthorRequest, UpdateAuthorRequest, CreateGenreRequest, UpdateGenreRequest, CreateReviewRequest, ReviewQuery.
- `Contracts/Responses/` — LoginResponse, UserDto, BookSummaryDto, BookDetailDto, DownloadResponse, PagedResult<T>, AuthorDto, GenreDto, PublicReviewDto, AdminReviewDto, LatestReviewDto, AdminStatsDto.

### Task 10: AutoMapper profile

`Mapping/MappingProfile.cs`:
- `Book → BookSummaryDto` / `BookDetailDto` (flatten `Author.Name`, `Genre.Name`).
- `Author → AuthorDto` with `BookCount = Books.Count`.
- `Genre → GenreDto` with `BookCount = Books.Count`.
- `Review → AdminReviewDto` (flatten `Book.Title`).

### Task 11: Config + Program.cs wiring

- `appsettings.json` skeleton with empty `ConnectionStrings:Default`, `Jwt:{Issuer,Audience,Key,ExpiryHours}`, `Supabase:{Url,ServiceRoleKey,CoversBucket,FilesBucket}`, `Cors:AllowedOrigins`.
- `appsettings.Development.json` with local Postgres connection string + placeholder Supabase URL.
- `Program.cs` wires: options binding, `AddDbContext(UseNpgsql + UseSnakeCaseNamingConvention)`, `AddHttpClient<ISupabaseStorageClient, SupabaseStorageClient>`, AutoMapper, controllers w/ wrapping filter, JwtBearer auth, CORS policy `AllowFrontend`, Swagger (dev only), middleware pipeline: `UseExceptionHandling → UseCors → UseAuthentication → UseAuthorization → MapControllers`.

### Task 12: Initial migration

- Ensure target DB reachable.
- `dotnet ef migrations add InitialCreate -o Data/Migrations`.
- Edit generated migration to append raw SQL in `Up`:
  - `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
  - GIN trigram indexes on `books(title)` and `books(description)`.
  - `CREATE UNIQUE INDEX ux_reviews_book_email ON reviews (book_id, lower(reviewer_email));`
  And corresponding `DROP`s in `Down`.
- `dotnet ef database update`.
- Commit migration files.

### Task 13: Repositories

Thin EF Core wrappers for each aggregate. Interfaces in `Repositories/`, implementations using `AppDbContext`.

- `IUserRepository`: `GetByEmailAsync(email, ct)`.
- `IAuthorRepository`: `GetAsync(id)`, `ListAsync()`, `Add/Update/Remove`, `HasBooksAsync(id)`.
- `IGenreRepository`: same shape as authors.
- `IBookRepository`: `GetByIdAsync(id, includeNav)`, `QueryPublishedAsync(BookQuery)`, `SearchPublishedAsync(q, page, size)`, `FeaturedAsync()`, `ListAdminAsync(page, size)`, `Add/Update/Remove`, `IncrementViewAsync(id)`, `IncrementDownloadAsync(id)`, `RecalculateRatingAsync(id)`.
- `IReviewRepository`: `ListApprovedForBookAsync(bookId)`, `LatestApprovedAsync(take)`, `GetAsync(id)`, `Add/Update/Remove`, `ExistsForBookAndEmailAsync(bookId, email)`.

Register all as `Scoped`.

### Task 14: Services

- `IAuthService.LoginAsync(LoginRequest)` → `LoginResponse` (verifies hash, issues JWT).
- `IBookService` — all book use cases including `RecalculateRatingAsync(Guid bookId, CancellationToken)` running inside a transaction.
- `IAuthorService`, `IGenreService`, `IReviewService` — CRUD + moderation.
- `INameMasker.Mask(name)` — pure function per spec §7.5.

All methods async + cancellation token. Register services as `Scoped`. Controllers depend only on services.
## Phase 2 — Backend controllers

### Task 15: AuthController

`POST /api/auth/login` → `AuthService.LoginAsync` → 200 `LoginResponse` or 401 via `AppException.Unauthorized("Invalid credentials")`.

### Task 16: Public BooksController

- `GET /api/books` — `BookQuery` from query string → `PagedResult<BookSummaryDto>` (published only).
- `GET /api/books/featured` → top N featured published books as `BookSummaryDto[]`.
- `GET /api/books/search?q=&page=&pageSize=` — trigram ILIKE on title + description, also try parse `q` as Guid for exact id match, also match authors by name. Published only.
- `GET /api/books/{id}` — `BookDetailDto`; after load, `IncrementViewAsync`.
- `POST /api/books/{id}/download` — increments `download_count`, returns `{ fileUrl }` or 404 if not published/no file.
- `GET /api/books/{id}/reviews` — approved reviews, masked names, no emails.
- `POST /api/books/{id}/reviews` — `CreateReviewRequest` → 201, status Pending; 409 if `(bookId, lower(email))` already exists.

### Task 17: Public CatalogController (genres + authors + latest reviews)

- `GET /api/genres` → list with book count.
- `GET /api/authors` → list with book count.
- `GET /api/authors/{id}` → detail + books.
- `GET /api/reviews/latest?take=6` → latest approved reviews (masked).

### Task 18: AdminBooksController `[Authorize(Roles="Admin")]`

- `GET /api/admin/books` — paged, unfiltered.
- `POST /api/admin/books` — create.
- `PUT /api/admin/books/{id}` — update.
- `DELETE /api/admin/books/{id}` — delete files from Supabase first (log on failure), then row.
- `PATCH /api/admin/books/{id}/publish` — toggle.
- `POST /api/admin/books/{id}/cover` — `IFormFile file`, upload to `book-covers/{id}.{ext}`, save URL, return updated DTO.
- `POST /api/admin/books/{id}/file` — `IFormFile file`, upload to `book-files/{id}.pdf`, save URL + size + page count (best-effort), and set `is_published = true`. Same transaction.

### Task 19: AdminAuthorsController + AdminGenresController

Full CRUD. `DELETE` returns 409 via `AppException.Conflict` if the entity is referenced by any book. Authors also support `POST /{id}/photo` (upload to `book-covers/authors/{id}.{ext}` or a separate bucket).

### Task 20: AdminReviewsController

- `GET /api/admin/reviews?status=` — filter.
- `PATCH /api/admin/reviews/{id}/approve` — sets Approved in TX, triggers `RecalculateRatingAsync`.
- `PATCH /api/admin/reviews/{id}/reject` — same; recalc only if previous status was Approved.
- `DELETE /api/admin/reviews/{id}` — same; recalc only if previous status was Approved.

### Task 21: AdminStatsController

`GET /api/admin/stats` → `AdminStatsDto` computed from scalar queries (single round trip when possible).

### Task 22: Seeder

- `Data/Seed/SeedData.cs::EnsureSeededAsync(db, passwordHasher, ct)`.
- Idempotent: check existence before inserting.
- Inserts admin user, 3 genres, 4 authors, 10 books (2 featured, 2 with placeholder PDF URLs), 6 approved reviews.
- After review insert, recomputes rating/review_count per book.
- Invoked from `Program.cs` only when `app.Environment.IsDevelopment()`.

### Task 23: Dockerfile

```dockerfile
# backend/BookLibrary.Api/Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["BookLibrary.Api.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
EXPOSE 8080
ENTRYPOINT ["dotnet", "BookLibrary.Api.dll"]
```

Add `backend/.dockerignore` excluding `bin/`, `obj/`, `Dockerfile*`.
## Phase 3 — Frontend scaffold

### Task 24: Vite + React + TS scaffold

```bash
cd Amna
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

### Task 25: Install dependencies

```bash
cd frontend
npm install react-router-dom@6 @tanstack/react-query axios zustand \
  i18next react-i18next i18next-browser-languagedetector \
  react-hook-form zod @hookform/resolvers \
  react-pdf pdfjs-dist
npm install -D tailwindcss postcss autoprefixer tailwindcss-rtl \
  @types/node
npx tailwindcss init -p
```

### Task 26: Tailwind config

- `tailwind.config.js`: `content: ['./index.html', './src/**/*.{ts,tsx}']`, `darkMode: 'class'`, add `tailwindcss-rtl` plugin.
- `src/index.css`: `@tailwind base; @tailwind components; @tailwind utilities;` + base typography.
- `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.

### Task 27: i18n bundles

- `src/i18n/en.json`, `src/i18n/ar.json` with namespaced keys (`common.*`, `home.*`, `browse.*`, `book.*`, `reader.*`, `admin.*`, `errors.*`).
- `src/i18n/index.ts`: initialize `i18next` + `react-i18next` + language detector, default `en`, fallback `en`.
- Language switcher: `i18n.changeLanguage(lang); document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; localStorage.setItem('lang', lang);`.

### Task 28: Axios client + `ApiResponse<T>` unwrap

- `src/api/client.ts`: `axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL })`.
- Request interceptor: attaches `Authorization: Bearer <token>` from `useAuth.getState().token` when present.
- Response interceptor: unwraps `{ success, data, message, errors }`. If `success===false`, throws `ApiError(message, errors, status)`. On 401, clears auth and redirects to `/admin/login`.
- `src/api/types.ts` — typed DTOs mirroring backend responses.

### Task 29: Zustand auth store + theme provider

- `src/store/auth.ts`: `useAuth` with `{ token, user, login(token, user), logout() }`. Persists to `localStorage.auth`.
- `src/components/ThemeProvider.tsx`: toggles `document.documentElement.classList.toggle('dark')`, persists `localStorage.theme`. `useTheme()` hook.

### Task 30: React Query client + App root

- `src/main.tsx`: wrap `<App />` in `QueryClientProvider`, `ThemeProvider`, `I18nextProvider`, `BrowserRouter`.
- `src/App.tsx`: declares routes, all pages `React.lazy`-loaded inside `<Suspense fallback={<Skeleton/>}>`.
- `<RequireAdmin>` wrapper redirects to `/admin/login` when no token.

### Task 31: Layouts

- `layouts/PublicLayout.tsx` — header (logo, nav links to `/`, `/browse`, search box, theme toggle, language toggle), footer.
- `layouts/AdminLayout.tsx` — sidebar (Dashboard, Books, Authors, Genres, Reviews with pending-count badge via `useQuery(['admin','stats'], { refetchInterval: 30_000 })`), topbar with logout.

### Task 32: Shared components

- `components/Skeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `Pagination.tsx`, `BookCard.tsx`, `StarRating.tsx`, `LanguageToggle.tsx`, `ThemeToggle.tsx`, `SearchBox.tsx`.

## Phase 4 — Frontend public pages

### Task 33: Home `/`

- Featured row (`/api/books/featured`), recent books, latest reviews (`/api/reviews/latest?take=6`), CTA to `/browse`.
- React Query: `['books','featured']`, `['books',{page:1}]`, `['reviews','latest']`.

### Task 34: Browse `/browse`

- Filters: genre (chips), language (en/ar toggle), year range, sort (newest, top-rated, most-downloaded).
- Grid of `BookCard`s with pagination.
- Query key `['books', filters, page]`.

### Task 35: Search `/search?q=`

- Reads `q` from URL. `['books','search',q,page]`. Debounced search box in header pushes to this route.

### Task 36: Book detail `/books/:id`

- Cover, title, author link, description, year, genre chip, language badge, rating.
- Buttons: **Read online** (→ `/books/:id/read`), **Download** (calls `POST /api/books/:id/download` then triggers `<a href>` click on returned URL).
- Reviews list (approved, masked) + review form (react-hook-form + zod: `name>=2`, valid email, `rating in 1..5`, `content>=10`). 409 handled with friendly message.

### Task 37: Reader `/books/:id/read`

- `react-pdf` `<Document file={fileUrl}><Page pageNumber={page} /></Document>`.
- Toolbar: prev/next, zoom in/out with %, fullscreen toggle (Fullscreen API), focus-mode toggle (dark bg, toolbar auto-hide after 2s idle).
- Keyboard: `←`/`→` nav, `Esc` returns.
- Loading skeleton + error state.
- Set pdf.js workerSrc using `pdfjs-dist/build/pdf.worker.min.js` (vite asset or CDN).

## Phase 5 — Frontend admin

### Task 38: Login `/admin/login`

Standalone page (no layout). Form → `POST /api/auth/login` → stores token + user → redirects to `/admin`.

### Task 39: Dashboard `/admin`

Calls `/api/admin/stats`; renders cards (total books, published, pending reviews, downloads, views) + a small recent-activity list.

### Task 40: Books admin `/admin/books` + form

- Table with columns: cover, title, author, genre, published, featured, actions.
- Filters: published/unpublished, genre, search.
- Row actions: edit, publish toggle, delete (with confirm dialog).
- `new` and `:id` form share a component: `react-hook-form + zod`, file inputs for cover + PDF with `axios onUploadProgress` → progress bar. Uploading PDF auto-sets published on the backend.

### Task 41: Authors admin `/admin/authors`

Table + modal CRUD form with photo upload. 409 surfaced as toast: "This author has books — reassign or delete those first."

### Task 42: Genres admin `/admin/genres`

Table + modal form (name + slug). Same 409 handling.

### Task 43: Reviews moderation `/admin/reviews`

- Filter tabs: Pending / Approved / Rejected / All.
- Row: book title, rating, reviewer, content, created_at, action buttons (approve/reject/delete).
- After any action, invalidate both `['admin','reviews']` and `['admin','stats']` query keys.

### Task 44: NotFound `*`

Localized 404 page with link home.

## Phase 6 — Deploy

### Task 45: Supabase setup

- Create project; copy URL, anon key, service role key.
- SQL editor: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`.
- Create public buckets `book-covers` and `book-files`.

### Task 46: Railway deploy (backend)

- Create service from `backend/` with Dockerfile.
- Env vars: `ConnectionStrings__Default`, `Jwt__{Issuer,Audience,Key}`, `Supabase__{Url,ServiceRoleKey,CoversBucket,FilesBucket}`, `Cors__AllowedOrigins`, `ASPNETCORE_ENVIRONMENT=Production`.
- After first deploy: run `dotnet ef database update` against prod connection string from a local shell.

### Task 47: Vercel deploy (frontend)

- Import `frontend/` as a Vercel project.
- `vercel.json` already committed.
- Env: `VITE_API_BASE_URL=https://<railway>.up.railway.app/api`.
- After deploy, copy the Vercel URL back into Railway `Cors__AllowedOrigins` and redeploy backend.

### Task 48: Smoke test

- Browse home (public) in both languages, both themes.
- Admin login, upload a PDF, verify publish flag flips, download works, submit a review anonymously, moderate it.
