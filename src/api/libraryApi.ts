import { apiFetch } from "./client";

export type LibraryBook = {
  token: string;
  session_id: string;
  title: string;
  author_name: string;
  genre: string;
  chapters: number;
  length: "short" | "medium" | "long";
  score: number;
  rating: number;
  rating_count: number;
  views: number;
  popularity: number;
  card_url?: string;
  book_url: string;
  excerpt?: string;
  listed_at?: string;
  age_rating?: string;
  is_listed?: boolean;
  moderation_status?: string;
};

export type LibraryFilters = {
  genre?: string;
  length?: "short" | "medium" | "long" | "";
  sort?: "popular" | "new" | "rating" | "views" | "long";
  minRating?: number;
  page?: number;
  pageSize?: number;
};

export function getLibraryBooks(filters: LibraryFilters = {}) {
  const query = new URLSearchParams();
  if (filters.genre) query.set("genre", filters.genre);
  if (filters.length) query.set("length", filters.length);
  query.set("sort", filters.sort || "popular");
  if (filters.minRating) query.set("min_rating", String(filters.minRating));
  query.set("page", String(filters.page || 1));
  query.set("page_size", String(filters.pageSize || 18));
  return apiFetch<{
    books: LibraryBook[];
    genres: string[];
    page: number;
    page_size: number;
    total: number;
    pages: number;
  }>(`/library/books?${query.toString()}`);
}

export function getPublication(sessionId: string) {
  return apiFetch<{ publication: LibraryBook | null }>(`/library/publication?session_id=${encodeURIComponent(sessionId)}`);
}

export function getLibraryBook(token: string) {
  return apiFetch<{ book: LibraryBook }>(`/library/books/${encodeURIComponent(token)}`);
}

export function setPublicationVisibility(token: string, isListed: boolean, consent: boolean) {
  return apiFetch<{ publication: LibraryBook }>(`/library/books/${encodeURIComponent(token)}/visibility`, {
    method: "POST",
    body: JSON.stringify({ is_listed: isListed, consent }),
  });
}

export function rateLibraryBook(token: string, rating: number) {
  return apiFetch<{ ok: boolean; rating: number; rating_count: number; your_rating: number }>(`/library/books/${encodeURIComponent(token)}/rating`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  });
}
