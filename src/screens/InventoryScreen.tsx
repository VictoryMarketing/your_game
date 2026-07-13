import { type CSSProperties, type ReactNode, type WheelEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, ShieldOff, X } from "lucide-react";
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

function CarouselRail({ children, label, compact = false }: { children: ReactNode; label: string; compact?: boolean }) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setCanLeft(rail.scrollLeft > 4);
    setCanRight(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    rail.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      rail.removeEventListener("scroll", update);
    };
  }, [children, update]);

  function move(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(220, rail.clientWidth * 0.72), behavior: "smooth" });
  }

  function wheel(event: WheelEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    rail.scrollBy({ left: delta, behavior: "auto" });
  }

  return (
    <div className={compact ? "carousel-shell compact" : "carousel-shell"}>
      <button className="carousel-arrow left" disabled={!canLeft} onClick={() => move(-1)} type="button" aria-label={`Прокрутить ${label} влево`}><ChevronLeft size={20} /></button>
      <div className="catalog-carousel" onWheel={wheel} ref={railRef} role="region" aria-label={label}>{children}</div>
      <button className="carousel-arrow right" disabled={!canRight} onClick={() => move(1)} type="button" aria-label={`Прокрутить ${label} вправо`}><ChevronRight size={20} /></button>
    </div>
  );
}

function isLocked(item: UserItem) {
  return Boolean(item.protected || ((item.protected_count || 0) > 0 && (item.available_count || 0) <= 0));
}

export function InventoryScreen({ game, profile }: { game?: GameSession | null; profile?: Profile }) {
  const traits = game?.state?.traits || {};
  const world = game?.state?.world || {};
  const [items, setItems] = useState<UserItem[]>([]);
  const [catalog, setCatalog] = useState<UserItem[]>([]);
  const [collections, setCollections] = useState<NonNullable<Awaited<ReturnType<typeof getInventory>>["collections"]>>([]);
  const [rarity, setRarity] = useState<RarityFilter>("all");
  const [selectedItem, setSelectedItem] = useState<UserItem | null>(null);
  const relations = Object.values(game?.state?.npc_relations || {});
  const filteredItems = items.filter((item) => rarity === "all" || item.rarity === rarity);

  const refresh = useCallback(() => {
    getInventory()
      .then((payload) => {
        setItems(payload.items || []);
        setCatalog(payload.catalog || []);
        setCollections(payload.collections || []);
      })
      .catch(() => {
        setItems([]);
        setCatalog([]);
        setCollections([]);
      });
  }, []);

  useEffect(() => refresh(), [refresh]);

  async function protect(item: UserItem, protectedValue: boolean) {
    try {
      const payload = await setItemProtection(item.key, protectedValue);
      setItems(payload.items || []);
      setCatalog(payload.catalog || catalog);
      setCollections(payload.collections || collections);
      setSelectedItem((current) => current?.key === item.key ? { ...current, protected: protectedValue } : current);
    } catch {
      refresh();
    }
  }

  return (
    <section className="screen-stack inventory-screen">
      <header className="image-hero inventory-hero">
        <span className="eyebrow">Инвентарь</span>
        <h1>{profile?.name || "Игрок"}</h1>
        <p>Находки сохраняются между историями и могут изменить исход решающей проверки.</p>
      </header>
      <div className="stat-grid inventory-stats">
        <StatPill label="Смелость" value={traits.bravery || 0} />
        <StatPill label="Хитрость" value={traits.cunning || 0} />
        <StatPill label="Эмпатия" value={traits.empathy || 0} />
        <StatPill label="Логика" value={traits.logic || 0} />
        <StatPill label="Репутация" value={world.reputation || 0} />
        <StatPill label="Угроза" value={world.threat || 0} />
      </div>

      <section className="panel inventory-owned-panel">
        <div className="section-head"><div><span className="eyebrow">Коллекция героя</span><h2>Ваши предметы</h2></div><strong>{items.reduce((sum, item) => sum + Number(item.count || 1), 0)}</strong></div>
        <p className="muted">Нажми на находку, чтобы прочитать её действие или защитить от случайного расходования.</p>
        <div className="rarity-legend inventory-filters">
          {rarityOrder.map((value) => (
            <button className={rarity === value ? `rarity-chip active rarity-${value}` : `rarity-chip rarity-${value}`} key={value} onClick={() => setRarity(value)} type="button">
              {rarityNames[value]}
            </button>
          ))}
        </div>
        {filteredItems.length ? (
          <CarouselRail compact label="ваши предметы">
            {filteredItems.map((item) => (
              <button className={`owned-item-card rarity-${item.rarity}`} key={item.key} onClick={() => setSelectedItem(item)} type="button">
                <span className="item-art owned" style={itemSpriteStyle(item)} />
                <span><strong>{item.title}</strong><small className={`rarity-text rarity-${item.rarity}`}>{item.rarity_label}</small></span>
                <em>{item.count && item.count > 1 ? `x${item.count}` : isLocked(item) ? "защищён" : "1 шт."}</em>
              </button>
            ))}
          </CarouselRail>
        ) : <p className="muted empty-rail">Предметов этой редкости пока нет. Их можно найти за сильные решения или получить в магазине.</p>}
      </section>

      <section className="panel">
        <div className="section-head"><h2>Коллекции</h2><span>{collections.filter((item) => item.complete).length}/{collections.length}</span></div>
        <div className="collection-grid">
          {collections.map((item) => {
            const pct = Math.round((item.owned / Math.max(1, item.total)) * 100);
            return (
              <article className={`collection-card rarity-${item.rarity}`} key={item.rarity}>
                <div className="section-head"><strong>{item.rarity_label}</strong><span>{item.owned}/{item.total}</span></div>
                <div className="progress-track" aria-label={`Коллекция ${item.rarity_label}`}><i style={{ "--progress": `${pct}%` } as CSSProperties} /></div>
                <small>{item.complete ? "Полка собрана полностью." : item.reward_hint}</small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Улики текущей истории</h2>
        {(game?.state?.clues || []).length ? game?.state.clues.map((item) => <p key={item} className="list-item">{item}</p>) : <p className="muted">Улик пока нет. Наблюдай за деталями: несостыковка может стать ключом к развязке.</p>}
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
              <strong>{npc.name}</strong>{npc.role && <span>{npc.role}</span>}<p>{status}</p>{npc.unresolved_conflict && <small>{npc.unresolved_conflict}</small>}
            </article>
          );
        }) : <p className="muted">Связи появятся после знакомства с ключевыми персонажами.</p>}
      </section>

      <section className="panel catalog-panel">
        <span className="eyebrow">Энциклопедия находок</span>
        <h2>Каталог редкостей</h2>
        <p className="muted">Листай колесом, свайпом или стрелками. Нажми предмет, чтобы узнать его действие.</p>
        <div className="catalog-rows">
          {rarityGroups.map((group) => {
            const groupItems = catalog.filter((item) => item.rarity === group);
            if (!groupItems.length) return null;
            return (
              <section className="catalog-row" key={group}>
                <div className="section-head"><h3>{rarityNames[group]}</h3><span className={`rarity-text rarity-${group}`}>{groupItems.length}</span></div>
                <CarouselRail label={rarityNames[group]}>
                  {groupItems.map((item) => (
                    <button className={`catalog-card rarity-${item.rarity}`} key={item.key} onClick={() => setSelectedItem(item)} type="button">
                      <span className="item-art catalog" style={itemSpriteStyle(item)} />
                      <strong>{item.title}</strong><small>{item.rarity_label}</small>
                    </button>
                  ))}
                </CarouselRail>
              </section>
            );
          })}
        </div>
      </section>

      {selectedItem && (
        <div className="sheet-backdrop" onClick={() => setSelectedItem(null)}>
          <section className={`select-sheet item-detail-sheet rarity-${selectedItem.rarity}`} onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <button className="icon-button item-detail-close" onClick={() => setSelectedItem(null)} type="button" aria-label="Закрыть"><X size={18} /></button>
            <span className="item-art detail" style={itemSpriteStyle(selectedItem)} />
            <span className={`rarity-chip rarity-${selectedItem.rarity}`}>{selectedItem.rarity_label}</span>
            <h2>{selectedItem.title}{selectedItem.count && selectedItem.count > 1 ? ` · ${selectedItem.count} шт.` : ""}</h2>
            <p>{selectedItem.description}</p>
            <div className="item-help-callout"><strong>Чем помогает</strong><span>{selectedItem.helps}</span></div>
            {items.some((item) => item.key === selectedItem.key) && (
              <button className="secondary-button" onClick={() => protect(selectedItem, !isLocked(selectedItem))} type="button">
                {isLocked(selectedItem) ? <><ShieldOff size={18} /> Снять защиту</> : <><ShieldCheck size={18} /> Защитить предмет</>}
              </button>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
