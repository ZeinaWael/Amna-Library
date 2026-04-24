# Online Book Library — Design Spec

**Date:** 2026-04-24
**Status:** Approved
**Scope:** Single implementation plan (one coherent full-stack app, no decomposition)

## 1. Purpose

A public website where anyone can browse, search, read online, and download books. A single admin logs in to a JWT-protected dashboard to manage books, authors, genres, and reviews. No reader accounts exist — the public surface is fully anonymous.

## 2. Stack

### Backend
- **ASP.NET Core 8** Web API (C#)
- **EF Core 8** with **Npgsql** provider (snake_case naming convention)
- **Supabase Postgres** as the single database
- **JWT Bearer** authentication with a minimal hand-rolled `users` table (no ASP.NET Identity)
- **BCrypt.Net-Next** for password hashing
- **HttpClient** against the **Supabase Storage REST API** (service role key); no Supabase C# SDK
- **AutoMapper** for entity ↔ DTO mapping
- Controllers are thin; business logic lives in Services; data access in Repositories

### Frontend
- **Vite + React 18 + TypeScript**
- **Tailwind CSS** with `darkMode: 'class'` and `tailwindcss-rtl` plugin
- **react-router-dom v6**, all pages code-split with `React.lazy` + `Suspense`
- **@tanstack/react-query** for server state, caching, and polling
- **i18next** + **react-i18next** (`en.json`, `ar.json`); every user-visible string uses `t('key')`
- **zustand** for lightweight client state (auth token, theme)
- **axios** API client with interceptors for JWT and the `ApiResponse<T>` envelope
- **react-pdf** (pdf.js wrapper) for the in-browser reader
- **react-hook-form + zod** for forms and validation

### Hosting
- **Railway** for the API (Dockerfile-based)
- **Vercel** for the frontend
- **Supabase** for Postgres + Storage (two public buckets: `book-covers`, `book-files`)

## 3. Repository Layout

```
Amna/
├── backend/
│   ├── BookLibrary.sln
│   └── BookLibrary.Api/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── vercel.json
│   └── package.json
├── docs/
│   └── superpowers/
│       └── specs/
└── README.md
```

## 4. Database Schema

All tables use `uuid` primary keys and `created_at` / `updated_at` timestamps (UTC). Column names below use logical names; EF Core + Npgsql naming convention maps to snake_case.

### users
| column        | type        | notes                       |
|---------------|-------------|-----------------------------|
| id            | uuid PK     |                             |
| email         | text unique |                             |
| password_hash | text        | BCrypt                      |
| role          | text        | `"Admin"`                   |
| created_at    | timestamptz |                             |

### authors
| column     | type        | notes |
|------------|-------------|-------|
| id         | uuid PK     |       |
| name       | text        |       |
| bio        | text null   |       |
| photo_url  | text null   |       |
| created_at | timestamptz |       |
| updated_at | timestamptz |       |

### genres
| column     | type        | notes |
|------------|-------------|-------|
| id         | uuid PK     |       |
| name       | text unique |       |
| slug       | text unique |       |
| created_at | timestamptz |       |

### books
| column          | type          | notes                                  |
|-----------------|---------------|----------------------------------------|
| id              | uuid PK       |                                        |
| title           | text          |                                        |
| description     | text          |                                        |
| language        | text          | `'en'` or `'ar'`                       |
| year            | int null      |                                        |
| isbn            | text null     |                                        |
| cover_url       | text null     | full Supabase CDN URL                  |
| file_url        | text null     | full Supabase CDN URL                  |
| file_size_bytes | bigint null   |                                        |
| page_count      | int null      |                                        |
| author_id       | uuid FK       | → authors.id (restrict delete)         |
| genre_id        | uuid FK       | → genres.id (restrict delete)          |
| is_published    | bool          | default false                          |
| is_featured     | bool          | default false                          |
| view_count      | int           | default 0                              |
| download_count  | int           | default 0                              |
| average_rating  | numeric(3,2)  | default 0                              |
| review_count    | int           | default 0                              |
| created_at      | timestamptz   |                                        |
| updated_at      | timestamptz   |                                        |

**Indexes on books:**
- `(is_published)`
- `(is_featured, is_published)`
- `(genre_id)`
- `(author_id)`
- GIN trigram (`pg_trgm`) on `title` and `description` for `ILIKE` search

### reviews
| column         | type        | notes                                                 |
|----------------|-------------|-------------------------------------------------------|
| id             | uuid PK     |                                                       |
| book_id        | uuid FK     | → books.id (cascade delete)                           |
| reviewer_name  | text        |                                                       |
| reviewer_email | text        | stored, never returned publicly                       |
| rating         | int         | 1–5 CHECK constraint                                  |
| content        | text        |                                                       |
| status         | text        | `'Pending'` / `'Approved'` / `'Rejected'`             |
| created_at     | timestamptz |                                                       |
| updated_at     | timestamptz |                                                       |

**Unique index:** `(book_id, lower(reviewer_email))` — enforces one review per email per book.

## 5. API Surface

All endpoints under `/api`. Response envelope everywhere:

```json
{ "success": true, "data": {...}, "message": null, "errors": [] }
```

Pagination defaults: `page=1`, `pageSize=12`, `pageSize` clamped to `[1, 50]`.

### Public (anonymous)
| Method | Path                          | Notes                                                                 |
|--------|-------------------------------|-----------------------------------------------------------------------|
| GET    | `/api/books`                  | Paginated; filters `genre`, `language`, `year`, `sort`. `is_published=true` always |
| GET    | `/api/books/featured`         | Featured row                                                          |
| GET    | `/api/books/search?q=`        | Searches title, author name, description, and exact book id. `is_published=true` |
| GET    | `/api/books/{id}`             | Detail; increments `view_count`                                       |
| POST   | `/api/books/{id}/download`    | Increments `download_count`, returns `{ fileUrl }`                    |
| GET    | `/api/books/{id}/reviews`     | Approved only; names masked; email omitted                            |
| POST   | `/api/books/{id}/reviews`     | Creates review, status=Pending                                        |
| GET    | `/api/genres`                 |                                                                       |
| GET    | `/api/authors`                |                                                                       |
| GET    | `/api/authors/{id}`           |                                                                       |
| GET    | `/api/reviews/latest`         | Latest approved reviews for home page                                 |

### Auth
| Method | Path              | Body                      | Returns                      |
|--------|-------------------|---------------------------|------------------------------|
| POST   | `/api/auth/login` | `{ email, password }`     | `{ token, expiresAt, user }` |

### Admin (`[Authorize(Roles="Admin")]`)
| Method | Path                                | Notes                                                       |
|--------|-------------------------------------|-------------------------------------------------------------|
| GET    | `/api/admin/stats`                  | All dashboard counters                                      |
| GET    | `/api/admin/books`                  | Paginated, unfiltered by publish status                     |
| POST   | `/api/admin/books`                  | Create                                                      |
| PUT    | `/api/admin/books/{id}`             | Update                                                      |
| DELETE | `/api/admin/books/{id}`             | Deletes files from Supabase Storage first                   |
| PATCH  | `/api/admin/books/{id}/publish`     | `{ isPublished }`                                           |
| POST   | `/api/admin/books/{id}/cover`       | multipart/form-data `file`                                  |
| POST   | `/api/admin/books/{id}/file`        | multipart/form-data `file`; auto-sets `is_published=true`   |
| GET/POST/PUT/DELETE | `/api/admin/authors[/{id}]` | DELETE returns 409 if author has books                 |
| POST   | `/api/admin/authors/{id}/photo`     | multipart/form-data                                         |
| GET/POST/PUT/DELETE | `/api/admin/genres[/{id}]`  | DELETE returns 409 if genre has books                  |
| GET    | `/api/admin/reviews?status=`        | Filter by status                                            |
| PATCH  | `/api/admin/reviews/{id}/approve`   | Recalculates `average_rating` and `review_count`            |
| PATCH  | `/api/admin/reviews/{id}/reject`    | Recalculates if review was previously approved              |
| DELETE | `/api/admin/reviews/{id}`           | Recalculates if review was approved                         |

## 6. Business Rules (canonical list)

1. Public book endpoints always filter `is_published = true`.
2. Uploading a PDF automatically sets `is_published = true` in the same transaction as persisting the file URL.
3. Reviews are created with `status='Pending'` and are not publicly visible until approved.
4. Any change to a review's effective approval state (approve, reject-a-previously-approved, delete-approved) triggers recalculation of the book's `average_rating` and `review_count` inside the same transaction.
5. A single email address can submit only one review per book. Attempting a second returns 409.
6. Reviewer emails are stored but never returned in any public response.
7. Reviewer names are masked in public responses as `"FirstName L."` using the first letter of the last whitespace-separated token. If the name is a single word, it is returned unchanged.
8. Deleting a book deletes its cover and PDF files from Supabase Storage before deleting the database row. Storage deletion failures are logged as warnings but do not block the row delete (prefer an orphaned file over a stuck admin).
9. Search always filters `is_published = true`.
10. Deleting an author or genre referenced by at least one book returns 409 with a clear error message.

## 7. Key Flows

### 7.1 Book PDF upload
1. Admin selects PDF in book form; browser uploads via `POST /api/admin/books/{id}/file` with `axios onUploadProgress` feeding a progress bar.
2. Backend streams the multipart file to Supabase Storage `PUT /storage/v1/object/book-files/{guid}.pdf` with `Authorization: Bearer <service-role-key>`.
3. On 200, backend stores `file_url = https://<proj>.supabase.co/storage/v1/object/public/book-files/{guid}.pdf`, `file_size_bytes`, `page_count` (if parseable — optional), and sets `is_published = true`.
4. Returns updated book DTO; frontend invalidates admin books query.

### 7.2 Cover image upload
Same flow against the `book-covers` bucket; does not change `is_published`.

### 7.3 Public download
1. Frontend calls `POST /api/books/{id}/download`.
2. Backend increments `download_count` atomically (`UPDATE ... SET download_count = download_count + 1`) and returns `{ fileUrl }`.
3. Frontend triggers the browser download via an `<a href={fileUrl} download>` click — backend never proxies bytes.

### 7.4 Review submission and moderation
1. Public `POST /api/books/{id}/reviews` validates, checks `UNIQUE (book_id, lower(reviewer_email))`, inserts as Pending.
2. Admin approves → service opens a transaction: updates review to Approved; recomputes `AVG(rating)` and `COUNT(*)` over `status='Approved'` reviews for that book; writes back to `books.average_rating` and `books.review_count`; commits.
3. Admin rejects/deletes a previously Approved review → same recalculation transaction.

### 7.5 Name masking
Pure function `MaskReviewerName(name)`:
- Split by whitespace, trim.
- If ≥ 2 tokens: return `tokens[0] + " " + tokens[last][0].ToUpper() + "."`.
- Else: return name unchanged.

### 7.6 Book deletion
1. Load book entity.
2. For each of `cover_url`, `file_url`: derive bucket+key, call `DELETE /storage/v1/object/{bucket}/{key}`. Log (don't throw) on non-2xx.
3. Delete row (reviews cascade via FK).

### 7.7 PDF reader page (`/books/{id}/read`)
- Loads `file_url` into `react-pdf` `<Document>`.
- Toolbar: page prev/next, zoom in/out with percentage display, fullscreen toggle (Fullscreen API), focus-mode toggle (dark bg, auto-hide toolbar after 2s idle).
- Keyboard: `←`/`→` page nav, `Esc` closes (navigates back).
- Loading skeleton and error state.

## 8. Frontend Details

### Layouts
- `PublicLayout` — header (logo, nav, search, theme toggle, language toggle), footer. Wraps all public pages.
- `AdminLayout` — sidebar (Dashboard, Books, Authors, Genres, Reviews with pending-count badge), topbar. Wraps all admin pages *except* login.
- Login page uses no layout wrapper.

### Routing
```
/                     → Home (public)
/browse               → Browse (public)
/search               → Search results (public)
/books/:id            → BookDetail (public)
/books/:id/read       → Reader (public, PDF viewer)
/admin/login          → Login (standalone)
/admin                → Dashboard (protected)
/admin/books          → Books table (protected)
/admin/books/new      → Book form (protected)
/admin/books/:id      → Book form (protected)
/admin/authors        → Authors table (protected)
/admin/genres         → Genres table (protected)
/admin/reviews        → Reviews moderation (protected)
*                     → NotFound
```

All routes are `React.lazy`-loaded and wrapped in `<Suspense fallback={<Skeleton/>}>`.

### i18n
- Resource bundles live in `src/i18n/en.json` and `src/i18n/ar.json`.
- Keys organized by namespace: `common.*`, `home.*`, `browse.*`, `book.*`, `reader.*`, `admin.*`, `errors.*`.
- No literal user-visible strings in TSX files — every text node uses `t('key')`.
- Switching language: call `i18n.changeLanguage('ar')`, set `document.documentElement.dir = 'rtl'`, persist to `localStorage` key `lang`.

### Dark mode
- `darkMode: 'class'` in Tailwind config.
- `ThemeProvider` toggles `document.documentElement.classList.toggle('dark')` and persists to `localStorage` key `theme`.
- Every styled component uses `dark:` variants.

### State and data
- `useAuth()` (zustand) — token, user, login/logout; token stored in `localStorage` key `auth`.
- TanStack Query keys: `['books', filters]`, `['book', id]`, `['book', id, 'reviews']`, `['admin', 'stats']`, etc.
- Admin reviews pending count: `useQuery({ queryKey:['admin','stats'], refetchInterval: 30_000 })`.

### Loading/error/empty states
Every page renders one of four states: `loading` (skeleton), `error` (retry button), `empty` (illustration + localized message), `content`.

### vercel.json
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

## 9. Backend Details

### Folder structure
```
BookLibrary.Api/
├── Controllers/
├── Services/
├── Repositories/
├── Data/
│   ├── AppDbContext.cs
│   ├── Migrations/
│   └── Seed/SeedData.cs
├── Entities/
├── Contracts/
│   ├── Requests/
│   ├── Responses/
│   └── ApiResponse.cs
├── Mapping/
├── Infrastructure/
│   ├── Storage/
│   │   └── SupabaseStorageClient.cs
│   ├── Auth/
│   │   ├── JwtTokenService.cs
│   │   └── PasswordHasher.cs
│   └── Middleware/
│       └── ExceptionHandlingMiddleware.cs
├── Filters/
├── Program.cs
├── appsettings.json
└── Dockerfile
```

### Response envelope
A single `ApiResponse<T>` record plus an `IAsyncActionFilter` that wraps non-wrapped results. Exceptions funnel through `ExceptionHandlingMiddleware` and emit `ApiResponse` with `success=false` and a problem-detail-ish payload.

### Authentication
- `JwtTokenService` issues HS256 tokens with claims `sub=userId`, `email`, `role`.
- Token lifetime: 8 hours.
- `POST /api/auth/login` verifies BCrypt hash, returns `{ token, expiresAt, user: { email, role } }`.
- Admin endpoints decorated `[Authorize(Roles="Admin")]`.

### Supabase Storage client
Single typed client `SupabaseStorageClient` with:
- `UploadAsync(string bucket, string objectKey, Stream content, string contentType, CancellationToken ct)` → returns public CDN URL
- `DeleteAsync(string bucket, string objectKey, CancellationToken ct)`
- `ExtractKeyFromPublicUrl(string url)` — parses the CDN URL back to bucket + key for delete

Configured via DI from `appsettings.json`:
```
Supabase:Url, Supabase:ServiceRoleKey, Supabase:CoversBucket, Supabase:FilesBucket
```

### Async/cancellation
Every service and repository method is `async Task<T>` and takes a `CancellationToken` threaded through from the controller.

### Program.cs wiring
- EF Core with `UseNpgsql` + `UseSnakeCaseNamingConvention`
- JwtBearer auth with issuer/audience/key from config
- CORS policy `AllowFrontend` reading `Cors:AllowedOrigins` (comma-separated)
- Swagger in Development only
- `app.UseExceptionHandling()` → `UseCors` → `UseAuthentication` → `UseAuthorization` → `MapControllers`

## 10. Seed Strategy

`SeedData.EnsureSeededAsync(AppDbContext db)` runs at startup in Development. Idempotent: checks for existing rows before inserting.

Inserts:
- **Admin user**: `admin@library.com` / BCrypt(`Admin@123`) / role `Admin`.
- **3 genres**: Fiction, Science, History (each with slug).
- **4 authors**: names + short bios, photo_url null initially.
- **10 books**: all `is_published=true`; 2 with `is_featured=true`; 2 point to sample PDF URLs (placeholder Supabase URLs), the rest have no `file_url`; all have sample cover placeholder URLs.
- **6 approved reviews** spread across 4 books (some books get 2, some 1, some 0).

After reviews insert, the seeder runs the same recalculation routine the service uses to set each book's `average_rating` and `review_count`.

## 11. Testing

**Deferred for first pass** per user approval. The architecture (Service + Repository + thin Controller + pure helpers like name-masking and review-recalc) is test-friendly and a later test suite can be added without refactor.

## 12. Deployment Checklist

### Supabase
- [ ] Create project; copy `URL`, `anon key`, `service_role key`.
- [ ] In SQL editor: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- [ ] Storage → create bucket `book-covers` (public).
- [ ] Storage → create bucket `book-files` (public).
- [ ] Run `dotnet ef database update` against production connection string.

### Railway (backend)
Environment variables:
- `ConnectionStrings__Default` — Supabase Postgres connection string
- `Jwt__Issuer`, `Jwt__Audience`, `Jwt__Key` (32+ random bytes, base64)
- `Supabase__Url`
- `Supabase__ServiceRoleKey`
- `Supabase__CoversBucket=book-covers`
- `Supabase__FilesBucket=book-files`
- `Cors__AllowedOrigins` — Vercel production URL
- `ASPNETCORE_ENVIRONMENT=Production`
- `PORT` — provided by Railway

### Vercel (frontend)
Environment variables:
- `VITE_API_BASE_URL` — `https://<railway-app>.up.railway.app/api`

`vercel.json` rewrite must be present at project root.

### CORS
Backend `Cors:AllowedOrigins` must include the exact Vercel origin(s) (production + any preview URL pattern if needed).

### Production migration
```bash
cd backend/BookLibrary.Api
dotnet ef database update --connection "$PROD_CONN"
```

Seeder runs only in Development; production data is entered through the admin dashboard.

## 13. Explicitly Out of Scope

- Reader registration / accounts / favorites
- Email notifications
- ASP.NET Identity
- Redis or any cache
- Rate limiting beyond the ASP.NET defaults
- Automated tests (first pass)
- Full-text search engine (Postgres trigram is sufficient)
- Backend-proxied file serving
