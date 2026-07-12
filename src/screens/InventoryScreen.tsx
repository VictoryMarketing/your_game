import { useEffect, useState } from "react";
import { getInventory, setItemProtection } from "../api/inventoryApi";
import type { GameSession, Profile, UserItem } from "../api/types";
import { StatPill } from "../components/StatPill";
import { itemSpriteStyle } from "../utils/itemSprites";

type RarityFilter = "all" | UserItem["rarity"];

const rarityOrder: RarityFilter[] = ["all", "common", "uncommon", "rare", "epic", "legendary", "mythic"];
const rarityGroups = rarityOrder.filter((value): value is UserItem["rarity"] => value !== "all");
const rarityNames: Record<RarityFilter, string> = {
  all: "все",
  common: "обычные",
  uncommon: "необычные",
  rare: "редкие",
  epic: "эпические",
  legendary: "легендарные",
  mythic: "мифические",
};

export function InventoryScreen({ game, profile }: { game?: GameSession | null; profile?: Profile }) {
  const traits = game?.state?.traits || {};
  const world = game?.state?.world || {};
  const [items, setItems] = useState<UserItem[]>([]);
  const [catalog, setCatalog] = useState<UserItem[]>([]);
  const [rarity, setRarity] = useState<RarityFilter>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const relations = Object.values(game?.state?.npc_relations || {});

  function refresh() {
    getInventory()
      .then((payload) => {
        setItems(payload.items || []);
        setCatalog(payload.catalog || []);
      })
      .catch(() => {
        setItems([]);
        setCatalog([]);
      });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function protect(item: UserItem, protectedValue: boolean) {
    try {
      const payload = await setItemProtection(item.key, protectedValue);
      setItems(payload.items || []);
      setCatalog(payload.catalog || catalog);
    } catch {
      refresh();
    }
  }

  return (
    <section className="screen-stack">
      <header className="image-hero inventory-hero">
        <span className="eyebrow">Инвентарь</span>
        <h1>{profile?.name || "Игрок"}</h1>
        <p>Предметы профиля, улики текущей истории и редкости.</p>
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
        <p>Предметы сохраняются в профиле между историями. В игре выбери предмет в карусели под вариантами ответа, затем сделай ход. Предмет потратится, исчезнет и даст бонус к проверке.</p>
      </section>
      <section className="panel">
        <h2>Ваши предметы</h2>
        <div className="rarity-legend">
          {rarityOrder.map((value) => (
            <button className={rarity === value ? `rarity-chip active rarity-${value}` : `rarity-chip rarity-${value}`} key={value} onClick={() => setRarity(value)} type="button">
              {rarityNames[value]}
            </button>
          ))}
        </div>
        {items.filter((item) => rarity === "all" || item.rarity === rarity).length ? (
          <div className="item-grid">
            {items.filter((item) => rarity === "all" || item.rarity === rarity).map((item) => {
              const locked = Boolean(item.protected || ((item.protected_count || 0) > 0 && (item.available_count || 0) <= 0));
              return (
              <article className={`item-card rarity-${item.rarity}`} key={item.key}>
                <button className="item-card-main" onClick={() => setExpandedKey(expandedKey === item.key ? null : item.key)} type="button">
                <div className="item-card-head">
                  <span className="item-art" style={itemSpriteStyle(item)} />
                  <div>
                    <strong>{item.title}{item.count && item.count > 1 ? ` x${item.count}` : ""}</strong>
                    <p className={`rarity-text rarity-${item.rarity}`}>{item.rarity_label}{locked ? " · защищён" : ""}</p>
                  </div>
                </div>
                {expandedKey === item.key && (
                  <div className="item-details">
                    <p>{item.description}</p>
                    <small>{item.helps}</small>
                  </div>
                )}
                </button>
                <button className="text-button item-protect-button" onClick={() => protect(item, !locked)} type="button">
                  {locked ? "Снять защиту" : "Защитить"}
                </button>
              </article>
            );
            })}
          </div>
        ) : (
          <p className="muted">Предметов этой редкости пока нет. Их можно найти в истории или купить в магазине.</p>
        )}
      </section>
      <section className="panel">
        <h2>Улики</h2>
        {(game?.state?.clues || []).length ? game?.state.clues.map((item) => <p key={item} className="list-item">{item}</p>) : <p className="muted">Улик пока нет. Наблюдай за деталями — даже пауза может стать уликой.</p>}
      </section>
      <section className="panel">
        <h2>Связи</h2>
        {relations.length ? relations.map((npc) => {
          const trust = Number(npc.trust || 0);
          const fear = Number(npc.fear || 0);
          const respect = Number(npc.respect || 0);
          const status = trust >= 6 ? "доверяет больше" : fear >= 4 ? "насторожен" : respect >= 4 ? "уважает" : "присматривается";
          return (
            <article className="relation-card" key={npc.name}>
              <strong>{npc.name}</strong>
              {npc.role && <span>{npc.role}</span>}
              <p>{status}</p>
              {npc.unresolved_conflict && <small>{npc.unresolved_conflict}</small>}
            </article>
          );
        }) : <p className="muted">Связи появятся, когда история познакомит героя с ключевыми персонажами.</p>}
      </section>
      <section className="panel">
        <h2>Каталог редкостей</h2>
        <p className="muted">Нажми на предмет, чтобы увидеть действие. В игре предмет тратится только через карусель под ответами.</p>
        <div className="catalog-rows">
          {rarityGroups.map((group) => {
            const groupItems = catalog.filter((item) => item.rarity === group);
            if (!groupItems.length) return null;
            return (
              <section className="catalog-row" key={group}>
                <div className="section-head">
                  <h3>{rarityNames[group]}</h3>
                  <span className={`rarity-text rarity-${group}`}>{groupItems.length}</span>
                </div>
                <div className="catalog-carousel">
                  {groupItems.map((item) => (
                    <button className={`catalog-card rarity-${item.rarity}`} key={item.key} onClick={() => setExpandedKey(expandedKey === item.key ? null : item.key)} type="button">
                      <span className="item-art catalog" style={itemSpriteStyle(item)} />
                      <strong>{item.title}</strong>
                      <small>{item.rarity_label}</small>
                      {expandedKey === item.key && (
                        <span className="item-details catalog-details">
                          <span>{item.description}</span>
                          <small>{item.helps}</small>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </section>
  );
}
