import { BookOpen, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { getLibraryBooks, type LibraryBook } from "../api/libraryApi";
import { getLeaderboard, type LeaderboardEntry, type LeaderboardMetric } from "../api/shopApi";

type RankingMetric = LeaderboardMetric | "community_rating";

const metricTabs: Array<{ key: RankingMetric; label: string; hint: string }> = [
  { key: "best_score", label: "Рекорд", hint: "максимум за одну историю" },
  { key: "total_score", label: "Все очки", hint: "сумма всех историй" },
  { key: "games_played", label: "Игры", hint: "количество завершений" },
  { key: "community_rating", label: "Книги", hint: "оценки зарегистрированных читателей" },
];

function medal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  if (rank <= 10) return "🏅";
  return "✦";
}

function metricUnit(metric: LeaderboardMetric) {
  if (metric === "games_played") return "игр";
  if (metric === "total_score") return "очков всего";
  return "очков";
}

function LeaderRow({ leader, metric }: { leader: LeaderboardEntry; metric: LeaderboardMetric }) {
  return (
    <article className={leader.is_current_user ? "leader-row current-user" : "leader-row"}>
      <div className="leader-rank">
        <span>{medal(leader.rank)}</span>
        <strong>#{leader.rank}</strong>
      </div>
      <div className="leader-main">
        <div>
          <strong>{leader.name || "Игрок"}</strong>
          {leader.is_current_user && <em>это вы</em>}
        </div>
        <span>{leader.username_mask || "ник скрыт"}</span>
        <small>
          игр {leader.games_played} · рекорд {leader.best_score} · всего {leader.total_score}
        </small>
      </div>
      <div className="leader-score">
        <strong>{leader.score}</strong>
        <span>{metricUnit(metric)}</span>
      </div>
    </article>
  );
}

function CommunityBookRow({ book, rank }: { book: LibraryBook; rank: number }) {
  return (
    <article className="leader-row community-book-row">
      <div className="leader-rank"><span>{medal(rank)}</span><strong>#{rank}</strong></div>
      <div className="leader-main"><div><strong>{book.title}</strong></div><span>{book.genre} · {book.author_name}</span><small>{book.chapters} глав · {book.views} просмотров</small></div>
      <div className="leader-score"><strong>{book.rating_count ? book.rating.toFixed(1) : "—"}</strong><span><Star size={12} fill="currentColor" /> {book.rating_count}</span></div>
    </article>
  );
}

function pageNumbers(page: number, pages: number) {
  const values = new Set([1, pages, page - 1, page, page + 1]);
  return [...values].filter((value) => value >= 1 && value <= pages).sort((a, b) => a - b);
}

export function LeaderboardScreen({ onLibrary }: { onLibrary?: () => void }) {
  const [metric, setMetric] = useState<RankingMetric>("best_score");
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    setError("");
    if (metric === "community_rating") {
      getLibraryBooks({ sort: "rating", page, pageSize })
        .then((result) => {
          setBooks(result.books);
          setPages(result.pages);
          setTotal(result.total);
        })
        .catch(() => {
          setBooks([]);
          setError("Не удалось загрузить рейтинг книг. Попробуйте обновить страницу.");
        })
        .finally(() => setLoading(false));
    } else {
      getLeaderboard(metric, page, pageSize)
        .then((result) => {
          setLeaders(result.leaders);
          setPages(result.pages);
          setTotal(result.total);
        })
        .catch(() => {
          setLeaders([]);
          setError("Не удалось загрузить рейтинг. Попробуйте обновить страницу.");
        })
        .finally(() => setLoading(false));
    }
  }, [metric, page]);

  const activeTab = metricTabs.find((tab) => tab.key === metric) || metricTabs[0];

  return (
    <section className="screen-stack">
      <header className="image-hero top-hero leaderboard-hero">
        <span className="eyebrow">Рейтинг</span>
        <h1>Лучшие ветки сезона</h1>
        <p>{activeTab.hint}.</p>
      </header>

      <div className="segmented leaderboard-tabs">
        {metricTabs.map((tab) => (
          <button className={metric === tab.key ? "active" : ""} key={tab.key} onClick={() => { setMetric(tab.key); setPage(1); }} type="button">
            {tab.label}
          </button>
        ))}
      </div>

      <div className="panel leaderboard-panel">
        {loading ? (
          <section className="empty-card">
            <h2>Сверяем рейтинг</h2>
            <p>Поднимаем последние результаты и обновляем места.</p>
          </section>
        ) : error ? (
          <section className="empty-card"><h2>Рейтинг временно недоступен</h2><p>{error}</p></section>
        ) : metric === "community_rating" && books.length ? (
          <>{books.map((book, index) => <CommunityBookRow book={book} key={book.token} rank={(page - 1) * pageSize + index + 1} />)}{onLibrary && <button className="secondary-button leaderboard-library-button" onClick={onLibrary} type="button"><BookOpen size={18} /> Открыть всю библиотеку</button>}</>
        ) : metric !== "community_rating" && leaders.length ? (
          leaders.map((leader) => <LeaderRow key={`${leader.user_id}-${leader.rank}`} leader={leader} metric={metric} />)
        ) : (
          <section className="empty-card">
            <h2>Сезон только начинается</h2>
            <p>{metric === "community_rating" ? "Публичные книги появятся после согласия их авторов." : "Заверши историю, чтобы попасть в рейтинг."}</p>
          </section>
        )}
      </div>
      {!loading && !error && total > 0 && (
        <nav className="leaderboard-pagination" aria-label="Страницы рейтинга">
          <button aria-label="Предыдущая страница" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button"><ChevronLeft size={18} /></button>
          {pageNumbers(page, pages).map((value, index, values) => (
            <span className="pagination-slot" key={value}>
              {index > 0 && value - values[index - 1] > 1 && <i aria-hidden="true">…</i>}
              <button aria-current={page === value ? "page" : undefined} className={page === value ? "active" : ""} onClick={() => setPage(value)} type="button">{value}</button>
            </span>
          ))}
          <button aria-label="Следующая страница" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} type="button"><ChevronRight size={18} /></button>
          <small>{total} {metric === "community_rating" ? "книг" : "игроков"}</small>
        </nav>
      )}
    </section>
  );
}
