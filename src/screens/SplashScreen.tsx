import { LoadingSkeleton } from "../components/LoadingSkeleton";

export function SplashScreen() {
  return (
    <section className="splash-screen">
      <div className="brand-mark">
        <img src={`${import.meta.env.BASE_URL}images/icon_YG.png`} alt="Твои правила" />
      </div>
      <h1>Твои правила</h1>
      <p>Интерактивная игра-книга, где каждый выбор меняет судьбу</p>
      <LoadingSkeleton label="Загрузка профиля..." />
    </section>
  );
}
