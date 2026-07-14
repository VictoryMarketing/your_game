import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "yourrules_cookie_notice_v1";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // The notice still works when browser storage is unavailable.
    }
    const timer = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      // Closing the notice should never block the game.
    }
  }

  if (!visible) return null;

  return (
    <aside className="cookie-notice" aria-label="Уведомление о файлах cookie">
      <Cookie className="cookie-notice-icon" size={20} aria-hidden="true" />
      <p>
        Технические cookies нужны для входа, безопасности и сохранения настроек.{" "}
        <a href="/privacy.html">Подробнее</a>
      </p>
      <button className="cookie-notice-accept" type="button" onClick={dismiss}>Понятно</button>
      <button className="cookie-notice-close" type="button" onClick={dismiss} aria-label="Закрыть уведомление">
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  );
}
