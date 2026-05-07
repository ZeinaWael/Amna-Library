import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from './client';
import type {
  AdminReviewDto,
  AdminStatsDto,
  AuthorDto,
  BookDetailDto,
  BookSummaryDto,
  DownloadResponse,
  GenreDto,
  LatestReviewDto,
  LoginResponse,
  Paged,
  PublicReviewDto,
} from '../types/api';

export type BookListFilters = {
  page?: number;
  pageSize?: number;
  genre?: string;
  language?: string;
  year?: number;
  sort?: 'newest' | 'top-rated' | 'most-downloaded';
};

export function useFeatured(take = 6) {
  return useQuery({
    queryKey: ['books', 'featured', take],
    queryFn: async () => (await api.get<BookSummaryDto[]>(`/books/featured`, { params: { take } })).data,
  });
}

export function useBooks(filters: BookListFilters = {}) {
  return useQuery({
    queryKey: ['books', 'list', filters],
    queryFn: async () => (await api.get<Paged<BookSummaryDto>>(`/books`, { params: filters })).data,
    placeholderData: keepPreviousData,
  });
}

export function useSearchBooks(q: string, page = 1, pageSize = 12) {
  return useQuery({
    queryKey: ['books', 'search', q, page, pageSize],
    queryFn: async () => (await api.get<Paged<BookSummaryDto>>(`/books/search`, { params: { q, page, pageSize } })).data,
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useBooksByIds(ids: string[]) {
  return useQuery({
    queryKey: ['books', 'byIds', ids],
    queryFn: async () =>
      (await api.get<BookSummaryDto[]>(`/books/by-ids`, { params: { ids: ids.join(',') } })).data,
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
}

export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: ['book', id],
    queryFn: async () => (await api.get<BookDetailDto>(`/books/${id}`)).data,
    enabled: !!id,
  });
}

export function useBookReviews(id: string | undefined) {
  return useQuery({
    queryKey: ['book', id, 'reviews'],
    queryFn: async () => (await api.get<PublicReviewDto[]>(`/books/${id}/reviews`)).data,
    enabled: !!id,
  });
}

export function useSubmitReview(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { reviewerName: string; reviewerEmail: string; rating: number; content: string }) =>
      (await api.post<PublicReviewDto>(`/books/${bookId}/reviews`, body)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['book', bookId, 'reviews'] });
    },
  });
}

export function useDownload() {
  return useMutation({
    mutationFn: async (bookId: string) => (await api.post<DownloadResponse>(`/books/${bookId}/download`)).data,
  });
}

export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: async () => (await api.get<GenreDto[]>(`/genres`)).data,
  });
}

export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: async () => (await api.get<AuthorDto[]>(`/authors`)).data,
  });
}

export function useLatestReviews(take = 6) {
  return useQuery({
    queryKey: ['reviews', 'latest', take],
    queryFn: async () => (await api.get<LatestReviewDto[]>(`/reviews/latest`, { params: { take } })).data,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) =>
      (await api.post<LoginResponse>(`/auth/login`, body)).data,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await api.get<AdminStatsDto>(`/admin/stats`)).data,
    refetchInterval: 30_000,
  });
}

export function useAdminBooks(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['admin', 'books', page, pageSize],
    queryFn: async () => (await api.get<Paged<BookSummaryDto>>(`/admin/books`, { params: { page, pageSize } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useAdminReviews(status?: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['admin', 'reviews', status ?? 'all', page, pageSize],
    queryFn: async () => (await api.get<Paged<AdminReviewDto>>(`/admin/reviews`, { params: { status, page, pageSize } })).data,
    placeholderData: keepPreviousData,
  });
}
