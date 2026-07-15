import { BookOpen, ChevronLeft, ChevronRight, Eye, Library, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { getLibraryBook, getLibraryBooks, rateLibraryBook, type LibraryBook } from "../api/libraryApi";
import { getTelegram, isTelegram, notify } from "../telegram/telegram";

function openBook(url: string) {
  const tg = getTelegram();
  if (isTelegram() && tg?.openLink) tg.openLink(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}

function ratingLabel(book: LibraryBook) {
  return book.rating_count ? `${book.rating.toFixed(1)} · ${book.rating_count}` : "пока без оценок";
}

function BookCard({ book, onRate }: { book: LibraryBook; onRate: (book: LibraryBook, rating: number) => void }) {
  return (
    <article className="library-book-card">
      <button className="library-cover" onClick={() => openBook(book.book_url)} type="button" aria-label={`Читать «${book.title}»`}>
        {book.card_url ? <img src={book.card_url} alt={`Обложка книги «${book.title}»`} loading="lazy" /> : <Library size={42} />}
        <span>{book.age_rating}</span>
      </button>
      <div className="library-book-body">
        <div className="library-book-heading">
          <div><span>{book.genre}</span><h2>{book.title}</h2></div>
          <strong><Star size={15} fill="currentColor" /> {ratingLabel(book)}</strong>
        </div>
        <p className="library-author">Ветка игрока {book.author_name}</p>
        {book.excerpt && <p className="library-excerpt">{book.excerpt}</p>}
        <div className="library-book-meta">
          <span><BookOpen size={15} /> {book.chapters} глав</span>
          <span><Eye size={15} /> {book.views}</span>
          <span>{book.score} очков</span>
        </div>
        <div className="library-card-actions">
          <button className="secondary-button" onClick={() => openBook(book.book_url)} type="button"><BookOpen size={17} /> Читать</button>
          <div className="library-stars" aria-label="Оценить книгу">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} onClick={() => onRate(book, value)} title={`${value} из 5`} type="button"><Star size={18} /></button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function LibraryScreen() {
  const params = new URLSearchParams(window.location.search);
  const requestedToken = params.get("book") || "";
  const requestedRating = Number(params.get("rate") || 0);
  const ratingHandled = useRef(false);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [genre, setGenre] = useState("");
  const [length, setLength] = useState<"" | "short" | "medium" | "long">("");
  const [sort, setSort] = useState<"popular" | "new" | "rating" | "views" | "long">("popular");
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => setPage(1), [genre, length, sort, minRating]);

  useEffect(() => {
    setLoading(true);
    getLibraryBooks({ genre, length, sort, minRating, page, pageSize: 12 })
      .then((result) => {
        setBooks(result.books);
        setGenres(result.genres);
        setPages(result.pages);
        setTotal(result.total);
      })
      .catch(() => setNotice("Не удалось обновить библиотеку. Повторите чуть позже."))
      .finally(() => setLoading(false));
  }, [genre, length, sort, minRating, page]);

  useEffect(() => {
    if (!requestedToken) return;
    getLibraryBook(requestedToken)
      .then(({ book }) => setBooks((current) => current.some((item) => item.token === book.token) ? current : [book, ...current]))
      .catch(() => null);
  }, [requestedToken]);

  async function rate(book: LibraryBook, value: number) {
    try {
      const result = await rateLibraryBook(book.token, value);
      setBooks((current) => current.map((item) => item.token === book.token ? { ...item, rating: result.rating, rating_count: result.rating_count } : item));
      setNotice(`Ваша оценка ${value} из 5 сохранена. Её можно изменить.`);
      notify("success");
    } catch (error) {
      const message = error instanceof ApiError && typeof error.detail === "object" && error.detail && "message" in error.detail
        ? String((error.detail as { message: string }).message)
        : "Не удалось сохранить оценку. Войдите в аккаунт и повторите.";
      setNotice(message);
      notify("error");
    }
  }

  useEffect(() => {
    if (!requestedToken || requestedRating < 1 || requestedRating > 5 || ratingHandled.current) return;
    ratingHandled.current = true;
    getLibraryBook(requestedToken).then(({ book }) => rate(book, requestedRating)).catch(() => setNotice("Эта книга больше не опубликована в библиотеке."));
  }, [requestedRating, requestedToken]);

  return (
    <section className="screen-stack library-screen">
      <header className="image-hero top-hero library-hero">
        <span className="eyebrow">Открытая библиотека</span>
        <h1>Истории, выбранные читателями</h1>
        <p>Законченные ветки, которыми авторы добровольно поделились со всем миром.</p>
      </header>

      <section className="panel library-filters" aria-label="Фильтры библиотеки">
        <label><span>Жанр</span><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="">Все жанры</option>{genres.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Длина</span><select value={length} onChange={(event) => setLength(event.target.value as typeof length)}><option value="">Любая</option><option value="short">До 10 глав</option><option value="medium">11–30 глав</option><option value="long">Больше 30</option></select></label>
        <label><span>Сортировка</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="popular">Популярные</option><option value="rating">По оценке</option><option value="new">Новые</option><option value="views">По просмотрам</option><option value="long">Самые длинные</option></select></label>
        <label><span>Оценка</span><select value={minRating} onChange={(event) => setMinRating(Number(event.target.value))}><option value={0}>Любая</option><option value={3}>От 3</option><option value={4}>От 4</option><option value={4.5}>От 4,5</option></select></label>
      </section>

      <div className="section-head library-result-head"><div><span className="eyebrow">Каталог</span><h2>{total} книг</h2></div><span>Страница {page} из {pages}</span></div>
      {notice && <p className="notice" role="status">{notice}</p>}
      {loading ? <section className="empty-card"><h2>Открываем библиотеку</h2><p>Расставляем книги по полкам.</p></section> : (
        <div className="library-grid">{books.map((book) => <BookCard book={book} key={book.token} onRate={rate} />)}</div>
      )}
      {!loading && books.length === 0 && <section className="empty-card"><Library size={34} /><h2>На этой полке пока пусто</h2><p>Сбросьте фильтры или загляните позже.</p></section>}
      {pages > 1 && <div className="library-pagination"><button className="secondary-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button"><ChevronLeft size={18} /> Назад</button><button className="secondary-button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} type="button">Дальше <ChevronRight size={18} /></button></div>}
    </section>
  );
}
