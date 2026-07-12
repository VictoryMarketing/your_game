import { LoadingSkeleton } from "../components/LoadingSkeleton";
import type { BootstrapStage } from "../store/appStore";

const labels: Record<BootstrapStage, string> = {
  idle: "Готовим запуск...",
  detecting_environment: "Проверяем окружение...",
  authenticating: "Подключаем Telegram...",
  loading_profile: "Загружаем профиль...",
  loading_home: "Собираем главную страницу...",
  ready: "Открываем игру...",
  error: "Не удалось загрузить игру...",
  timeout: "Сервер отвечает слишком долго...",
};

export function SplashScreen({ stage = "loading_profile" }: { stage?: BootstrapStage }) {
  return (
    <section className="splash-screen">
      <div className="brand-mark">
        <img src={`${import.meta.env.BASE_URL}images/icon_YG.png`} alt="Твои правила" />
      </div>
      <h1>Твои правила</h1>
      <p>Интерактивная игра-книга, где каждый выбор меняет судьбу</p>
      <LoadingSkeleton label={labels[stage]} />
    </section>
  );
}
