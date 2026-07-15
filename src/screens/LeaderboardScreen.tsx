import { BookOpen, Star } from "lucide-react";
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

export function LeaderboardScreen({ onLibrary }: { onLibrary?: () => void }) {
  const [metric, setMetric] = useState<RankingMetric>("best_score");
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (metric === "community_rating") {
      getLibraryBooks({ sort: "rating", pageSize: 50 })
        .then((result) => setBooks(result.books))
        .catch(() => setBooks([]))
        .finally(() => setLoading(false));
    } else {
      getLeaderboard(metric)
        .then((result) => setLeaders(result.leaders))
        .catch(() => setLeaders([]))
        .finally(() => setLoading(false));
    }
  }, [metric]);

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
          <button className={metric === tab.key ? "active" : ""} key={tab.key} onClick={() => setMetric(tab.key)} type="button">
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
        ) : metric === "community_rating" && books.length ? (
          <>{books.map((book, index) => <CommunityBookRow book={book} key={book.token} rank={index + 1} />)}{onLibrary && <button className="secondary-button leaderboard-library-button" onClick={onLibrary} type="button"><BookOpen size={18} /> Открыть всю библиотеку</button>}</>
        ) : metric !== "community_rating" && leaders.length ? (
          leaders.map((leader) => <LeaderRow key={`${leader.user_id}-${leader.rank}`} leader={leader} metric={metric} />)
        ) : (
          <section className="empty-card">
            <h2>Сезон только начинается</h2>
            <p>{metric === "community_rating" ? "Публичные книги появятся после согласия их авторов." : "Заверши историю, чтобы попасть в рейтинг."}</p>
          </section>
        )}
      </div>
    </section>
  );
}
