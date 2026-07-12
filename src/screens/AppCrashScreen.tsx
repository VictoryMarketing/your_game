import { BUILD_ID } from "../config/runtime";
import { telegramMiniAppLink } from "../telegram/telegram";

export function AppCrashScreen({
  title = "Не удалось загрузить игру",
  message,
  errorId,
  onRetry,
}: {
  title?: string;
  message?: string;
  errorId?: string;
  onRetry?: () => void;
}) {
  function hardReload() {
    window.location.reload();
  }

  return (
    <section className="empty-state crash-screen">
      <h1>{title}</h1>
      <p>{message || "Попробуйте повторить загрузку. Если ошибка останется, отправьте ID ошибки в поддержку."}</p>
      <div className="crash-actions">
        {onRetry && <button className="primary-button" onClick={onRetry} type="button">Повторить</button>}
        <button className="secondary-button" onClick={hardReload} type="button">Перезапустить приложение</button>
        <button className="secondary-button" onClick={() => window.open(telegramMiniAppLink(), "_blank")} type="button">Открыть в Telegram</button>
      </div>
      <small className="diagnostic-id">Build: {BUILD_ID} {errorId ? `· Error: ${errorId}` : ""}</small>
    </section>
  );
}
