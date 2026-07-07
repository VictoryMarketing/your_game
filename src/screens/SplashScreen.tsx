import { LoadingSkeleton } from "../components/LoadingSkeleton";

export function SplashScreen() {
  return (
    <section className="splash-screen">
      <div className="brand-mark">YG</div>
      <h1>YouGame</h1>
      <p>AI-приключения, где каждый выбор меняет судьбу</p>
      <LoadingSkeleton label="Загрузка профиля..." />
    </section>
  );
}
