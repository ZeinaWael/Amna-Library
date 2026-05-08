import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { RequireAdmin } from './components/RequireAdmin';
import { PageSkeleton } from './components/Skeleton';

const HomePage = lazy(() => import('./pages/public/HomePage'));
const BrowsePage = lazy(() => import('./pages/public/BrowsePage'));
const SearchPage = lazy(() => import('./pages/public/SearchPage'));
const BookDetailPage = lazy(() => import('./pages/public/BookDetailPage'));
const ShelfPage = lazy(() => import('./pages/public/ShelfPage'));
const ReaderPage = lazy(() => import('./pages/public/ReaderPage'));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'));

const LoginPage = lazy(() => import('./pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const AdminBooksPage = lazy(() => import('./pages/admin/AdminBooksPage'));
const AdminAuthorsPage = lazy(() => import('./pages/admin/AdminAuthorsPage'));
const AdminGenresPage = lazy(() => import('./pages/admin/AdminGenresPage'));
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'));
const AccountSettingsPage = lazy(() => import('./pages/admin/AccountSettingsPage'));

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="browse" element={<BrowsePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="books/:id" element={<BookDetailPage />} />
          <Route path="shelf" element={<ShelfPage />} />
        </Route>
        <Route path="books/:id/read" element={<ReaderPage />} />

        <Route path="admin/login" element={<LoginPage />} />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="books" element={<AdminBooksPage />} />
          <Route path="authors" element={<AdminAuthorsPage />} />
          <Route path="genres" element={<AdminGenresPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="account" element={<AccountSettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
