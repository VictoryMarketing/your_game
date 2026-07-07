import { Crown, Image, Mic, Sparkles } from "lucide-react";

export type LimitReason = "daily_limit" | "no_image_credits" | "no_voice_credits" | "premium_required" | "payment_required" | "unknown";

const copy: Record<LimitReason, { icon: "crown" | "image" | "mic" | "spark"; title: string; text: string; primary: string; secondary: string }> = {
  daily_limit: {
    icon: "crown",
    title: "Главы на сегодня закончились",
    text: "Ты уже использовал бесплатные главы. Premium снимает дневной лимит и позволяет продолжить историю без ожидания.",
    primary: "Открыть Premium",
    secondary: "Вернуться завтра",
  },
  no_image_credits: {
    icon: "image",
    title: "Кредиты картинок закончились",
    text: "Каждая иллюстрация расходует 1 кредит. Купи пакет, чтобы продолжить создавать сцены.",
    primary: "Купить картинки",
    secondary: "Продолжить без картинки",
  },
  no_voice_credits: {
    icon: "mic",
    title: "Голосовые кредиты закончились",
    text: "Озвучка главы расходует 1 кредит. Можно купить пакет или продолжить читать текстом.",
    primary: "Купить озвучку",
    secondary: "Читать без голоса",
  },
  premium_required: {
    icon: "crown",
    title: "Эта ветка доступна в Premium",
    text: "Premium открывает расширенные истории, больше глав и редкие развилки.",
    primary: "Открыть Premium",
    secondary: "Выбрать другой путь",
  },
  payment_required: {
    icon: "spark",
    title: "Нужен доступ",
    text: "Для действия нужен Premium или подходящий пакет кредитов.",
    primary: "Открыть магазин",
    secondary: "Назад",
  },
  unknown: {
    icon: "spark",
    title: "Действие временно недоступно",
    text: "Попробуй ещё раз чуть позже или вернись к истории.",
    primary: "Открыть магазин",
    secondary: "Назад",
  },
};

function Icon({ name }: { name: "crown" | "image" | "mic" | "spark" }) {
  if (name === "image") return <Image size={28} />;
  if (name === "mic") return <Mic size={28} />;
  if (name === "crown") return <Crown size={28} />;
  return <Sparkles size={28} />;
}

export function LimitStateCard({
  reason,
  onPrimary,
  onSecondary,
}: {
  reason?: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const normalized = (reason || "unknown") as LimitReason;
  const item = copy[normalized] || copy.unknown;
  return (
    <section className="limit-card">
      <div className="limit-icon">
        <Icon name={item.icon} />
      </div>
      <div>
        <h2>{item.title}</h2>
        <p>{item.text}</p>
      </div>
      <div className="limit-actions">
        <button className="primary-button" onClick={onPrimary} type="button">
          {item.primary}
        </button>
        <button className="secondary-button" onClick={onSecondary} type="button">
          {item.secondary}
        </button>
      </div>
    </section>
  );
}
