import { BookOpen, Send } from "lucide-react";
import { telegramMiniAppLink } from "../telegram/telegram";

export function WebLandingScreen() {
  return (
    <section className="web-landing">
      <div className="brand-mark">
        <img src={`${import.meta.env.BASE_URL}images/icon_YG.png`} alt="Твои правила" />
      </div>
      <span className="eyebrow">Интерактивная игра-книга</span>
      <h1>Твои правила</h1>
      <p>История создаётся под тебя: жанр, герой, выборы, последствия, предметы, улики и финал, который зависит от прохождения.</p>
      <div className="crash-actions">
        <button className="primary-button" onClick={() => window.open(telegramMiniAppLink(), "_blank")} type="button">
          <Send size={18} /> Открыть в Telegram
        </button>
        <a className="secondary-button" href="#how-it-works">
          <BookOpen size={18} /> Как это работает
        </a>
      </div>
      <section id="how-it-works" className="panel web-landing-panel">
        <h2>Как это работает</h2>
        <p>Запускаешь Mini App в Telegram, выбираешь жанр и стиль, а дальше читаешь главы и принимаешь решения. Сильные ходы открывают улики и предметы, риск может ускорить финал.</p>
      </section>
    </section>
  );
}
