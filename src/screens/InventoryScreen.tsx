import type { GameSession, Profile } from "../api/types";
import { StatPill } from "../components/StatPill";

export function InventoryScreen({ game, profile }: { game?: GameSession | null; profile?: Profile }) {
  const traits = game?.state?.traits || {};
  const world = game?.state?.world || {};
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
        <p>Предметы и улики появляются после сильных, логичных или наблюдательных ходов. Если в своём варианте уместно использовать предмет или сослаться на улику, внутренняя проверка получает бонус. Если ход не подходит сцене, история не подстраивается под него и последствия могут ухудшиться.</p>
      </section>
      <section className="panel">
        <h2>Инвентарь</h2>
        {(game?.state?.inventory || []).length ? game?.state.inventory.map((item) => <p key={item} className="list-item">{item}</p>) : <p className="muted">Инвентарь пока пуст. Предметы появятся, когда ты начнёшь принимать решения.</p>}
      </section>
      <section className="panel">
        <h2>Улики</h2>
        {(game?.state?.clues || []).length ? game?.state.clues.map((item) => <p key={item} className="list-item">{item}</p>) : <p className="muted">Улик пока нет. Наблюдай за деталями — даже пауза может стать уликой.</p>}
      </section>
    </section>
  );
}
