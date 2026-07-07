export function ErrorScreen({ title = "Что-то пошло не так", message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <section className="empty-state">
      <h1>{title}</h1>
      <p>{message || "Попробуйте обновить приложение или открыть его через Telegram."}</p>
      {onRetry && <button className="primary-button" onClick={onRetry} type="button">Повторить</button>}
    </section>
  );
}
