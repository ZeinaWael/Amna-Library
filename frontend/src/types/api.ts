export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  message: string | null;
  errors: string[];
};

export type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type UserDto = { email: string; role: string };

export type LoginResponse = {
  token: string;
  expiresAt: string;
  user: UserDto;
};

export type BookSummaryDto = {
  id: string;
  title: string;
  language: string;
  year: number | null;
  coverUrl: string | null;
  averageRating: number;
  reviewCount: number;
  authorId: string;
  authorName: string;
  genreId: string;
  genreName: string;
};

export type BookDetailDto = BookSummaryDto & {
  description: string;
  isbn: string | null;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  pageCount: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AuthorDto = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  bookCount: number;
};

export type GenreDto = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  bookCount: number;
};

export type PublicReviewDto = {
  id: string;
  maskedReviewerName: string;
  rating: number;
  content: string;
  createdAt: string;
};

export type AdminReviewDto = {
  id: string;
  bookId: string;
  bookTitle: string;
  reviewerName: string;
  reviewerEmail: string;
  rating: number;
  content: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
};

export type LatestReviewDto = {
  bookId: string;
  bookTitle: string;
  coverUrl: string | null;
  maskedReviewerName: string;
  rating: number;
  content: string;
  createdAt: string;
};

export type DownloadResponse = { fileUrl: string };

export type AdminStatsDto = {
  totalBooks: number;
  publishedBooks: number;
  pendingReviews: number;
  approvedReviews: number;
  totalDownloads: number;
  totalViews: number;
};

export class ApiError extends Error {
  status: number;
  errors: string[];
  constructor(message: string, status: number, errors: string[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
