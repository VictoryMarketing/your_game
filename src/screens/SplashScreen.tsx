import { LoadingSkeleton } from "../components/LoadingSkeleton";

export function SplashScreen() {
  return (
    <section className="splash-screen">
      <div className="brand-mark">
        <img src={`${import.meta.env.BASE_URL}images/icon_YG.png`} alt="YouGame" />
      </div>
      <h1>YouGame</h1>
      <p>AI-приключения, где каждый выбор меняет судьбу</p>
      <LoadingSkeleton label="Загрузка профиля..." />
    </section>
  );
}
