import { useState } from "react";
import { createShareCard } from "../api/shopApi";
import type { GameSession } from "../api/types";
import { SceneCard } from "../components/SceneCard";
import { getTelegram, notify } from "../telegram/telegram";

const traitLabels: Record<string, string> = {
  bravery: "храбрость",
  cunning: "хитрость",
  empathy: "эмпатия",
  logic: "логика",
};

function dominantTrait(game?: GameSession | null) {
  const traits = game?.state?.traits || {};
  const [key, value] = Object.entries(traits).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || ["logic", 0];
  return `${traitLabels[key] || key} ${value}`;
}

function endingTone(game?: GameSession | null) {
  const score = game?.score || 0;
  const world = game?.state?.world || {};
  const threat = Number(world.threat || 0);
  if (score >= 40 && threat <= 5) return "Сильная концовка: герой сохранил контроль и закрыл главные угрозы.";
  if (score >= 15) return "Неоднозначная победа: цель близко, но часть цены осталась в мире.";
  if (threat >= 10 || score < 0) return "Тяжёлый финал: ошибки и риск привели к дорогим последствиям.";
  return "Смешанный финал: история завершилась без полного поражения, но с заметной ценой.";
}

export function FinalScreen({ game, onShare, onNewGame }: { game?: GameSession | null; onShare: () => void; onNewGame: () => void }) {
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const scene = game?.current_chapter?.scene_text;
  const world = game?.state?.world || {};
  const summary = game?.state?.final_summary;

  async function buildCard() {
    if (!game?.id || cardBusy) return;
    setCardBusy(true);
    try {
      const card = await createShareCard(game.id);
      setCardUrl(card.card_url);
      notify("success");
    } catch {
      notify("error");
    } finally {
      setCardBusy(false);
    }
  }

  function openCard() {
    if (!cardUrl) return;
    const tg = getTelegram();
    if (tg?.openLink) tg.openLink(cardUrl);
    else window.open(cardUrl, "_blank");
  }

  return (
    <section className="screen-stack">
      <header className="image-hero story-map-hero">
        <span className="eyebrow">Финал</span>
        <h1>{summary?.title || game?.title || "История завершена"}</h1>
        <p>{summary ? `${summary.rarity_label} концовка · ${summary.playstyle_archetype}` : `Очки: ${game?.score || 0} · главный стиль: ${dominantTrait(game)}`}</p>
      </header>
      {scene && <SceneCard text={scene} imageUrl={game?.current_chapter?.image_url} />}
      <section className="panel">
        <h2>Итог прохождения</h2>
        <p>{summary?.hero_fate || endingTone(game)}</p>
        <p>{summary?.world_fate || `Мир после финала: репутация ${world.reputation || 0}, ресурсы ${world.resources || 0}, угроза ${world.threat || 0}.`}</p>
      </section>
      {summary && <section className="final-ledger">
        {summary.key_decisions.length > 0 && <div><span className="eyebrow">Решения, изменившие ветку</span>{summary.key_decisions.map((item) => <p key={item}>«{item}»</p>)}</div>}
        {summary.npc_fates.length > 0 && <div><span className="eyebrow">Судьбы персонажей</span>{summary.npc_fates.map((item) => <p key={item.name}><strong>{item.name}</strong> · {item.fate}</p>)}</div>}
        <div><span className="eyebrow">Тайны</span><p>Найдено секретов: {summary.secrets_found.length}</p><p>Осталось незакрытых линий: {summary.missed_mysteries}</p></div>
      </section>}
      <section className="panel share-card-panel">
        <div className="section-head">
          <h2>Карточка финала</h2>
          <button className="text-button" disabled={cardBusy} onClick={buildCard} type="button">
            {cardBusy ? "Создаю..." : cardUrl ? "Обновить" : "Создать"}
          </button>
        </div>
        {cardUrl ? (
          <>
            <img src={cardUrl} alt="Карточка финала" />
            <button className="secondary-button" onClick={openCard} type="button">Открыть карточку</button>
          </>
        ) : (
          <p>Сделай красивую карточку результата, чтобы сохранить финал или отправить друзьям вместе со ссылкой на игру.</p>
        )}
      </section>
      <button className="primary-button tall" onClick={onShare} type="button">Поделиться финалом</button>
      <button className="secondary-button" onClick={onNewGame} type="button">Играть ещё раз</button>
    </section>
  );
}
