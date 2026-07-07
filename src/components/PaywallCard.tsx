import { Crown } from "lucide-react";
import { LimitStateCard } from "./LimitStateCard";

export function PaywallCard({ reason, onPremium, onBack }: { reason?: string; onPremium: () => void; onBack: () => void }) {
  if (reason) {
    return <LimitStateCard reason={reason} onPrimary={onPremium} onSecondary={onBack} />;
  }

  return (
    <section className="paywall-card">
      <Crown size={34} />
      <h2>Ты дошёл до важной развилки</h2>
      <p>{reason || "Бесплатные главы или кредиты для действия закончились."}</p>
      <ul>
        <li>продолжение без ожидания</li>
        <li>редкие ветки и больше вариантов</li>
        <li>длинные истории и сезонный рейтинг</li>
      </ul>
      <button className="primary-button" onClick={onPremium} type="button">Открыть Premium за 449 Stars</button>
      <button className="secondary-button" onClick={onBack} type="button">Вернуться</button>
    </section>
  );
}
