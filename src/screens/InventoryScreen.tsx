import { useEffect, useState } from "react";
import { getInventory } from "../api/inventoryApi";
import type { GameSession, Profile, UserItem } from "../api/types";
import { StatPill } from "../components/StatPill";

export function InventoryScreen({ game, profile }: { game?: GameSession | null; profile?: Profile }) {
  const traits = game?.state?.traits || {};
  const world = game?.state?.world || {};
  const [items, setItems] = useState<UserItem[]>([]);
  const [catalog, setCatalog] = useState<UserItem[]>([]);

  useEffect(() => {
    getInventory()
      .then((payload) => {
        setItems(payload.items || []);
        setCatalog(payload.catalog || []);
      })
      .catch(() => {
        setItems([]);
        setCatalog([]);
      });
  }, []);

  return (
    <section className="screen-stack">
      <header className="image-hero inventory-hero">
        <span className="eyebrow">Герой</span>
        <h1>{profile?.name || "Игрок"}</h1>
        <p>Навыки, мир, предметы и улики текущей истории.</p>
      </header>
      <div className="stat-grid">
        <StatPill label="Смелость" value={traits.bravery || 0} />
        <StatPill label="Хитрость" value={traits.cunning || 0} />
        <StatPill label="Эмпатия" value={traits.empathy || 0} />
        <StatPill label="Логика" value={traits.logic || 0} />
        <StatPill label="Репутация" value={world.reputation || 0} />
        <StatPill label="Угроза" value={world.threat || 0} />
      </div>
      <section className="panel">
        <h2>Как это работает</h2>
        <p>Предметы сохраняются в профиле между историями. Если в своём варианте уместно использовать предмет или сослаться на улику, ход получает бонус. Если действие не подходит сцене, история не подстраивается под него и последствия могут ухудшиться.</p>
      </section>
      <section className="panel">
        <h2>Инвентарь профиля</h2>
        {items.length ? (
          <div className="item-grid">
            {items.map((item) => (
              <article className={`item-card rarity-${item.rarity}`} key={item.key}>
                <div className="item-card-head">
                  <span className="item-emoji">{item.emoji}</span>
                  <div>
                    <strong>{item.title}{item.count && item.count > 1 ? ` x${item.count}` : ""}</strong>
                    <p>{item.rarity_label}</p>
                  </div>
                </div>
                <p>{item.description}</p>
                <small>{item.helps}</small>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Инвентарь пока пуст. Предметы могут выпасть после сильных решений или появиться из магазина.</p>
        )}
      </section>
      <section className="panel">
        <h2>Предметы текущей истории</h2>
        {(game?.state?.inventory || []).length ? game?.state.inventory.map((item) => <p key={item} className="list-item">{item}</p>) : <p className="muted">В этой истории предметы ещё не подключены.</p>}
      </section>
      <section className="panel">
        <h2>Улики</h2>
        {(game?.state?.clues || []).length ? game?.state.clues.map((item) => <p key={item} className="list-item">{item}</p>) : <p className="muted">Улик пока нет. Наблюдай за деталями — даже пауза может стать уликой.</p>}
      </section>
      <section className="panel">
        <h2>Каталог редкостей</h2>
        <div className="rarity-legend">
          {["common", "uncommon", "rare", "epic", "legendary", "mythic"].map((rarity) => {
            const sample = catalog.find((item) => item.rarity === rarity);
            return sample ? <span className={`rarity-chip rarity-${rarity}`} key={rarity}>{sample.rarity_label}</span> : null;
          })}
        </div>
      </section>
    </section>
  );
}
