import { apiFetch } from "./client";
import type { StartPolicy } from "./gameApi";
import type { GameSession } from "./types";

export type CuratedBook = {
  id: string;
  title: string;
  genre: string;
  tagline: string;
  description: string;
  max_chapters: number;
  ending_count: number;
  choices_per_run: number;
  path_count: number;
  age_rating: string;
  cover_image?: string;
  free: boolean;
};

export function getCuratedBooks() {
  return apiFetch<{ books: CuratedBook[] }>("/curated/books");
}

export function startCuratedBook(bookId: string, startPolicy: StartPolicy = "archive_old") {
  return apiFetch<GameSession>("/curated/start", {
    method: "POST",
    body: JSON.stringify({ book_id: bookId, start_policy: startPolicy }),
  });
}
