import type { GameSession, Profile } from "../api/types";
import { StatPill } from "../components/StatPill";

export function InventoryScreen({ game, profile }: { game?: GameSession | null; profile?: Profile }) {
  const traits = game?.state?.traits || {};
  const world = game?.state?.world || {};
  return (
    <section className="screen-stack">
      <header>
        <span className="eyebrow">Герой</span>
        <h1>{profile?.name || "Игрок"}</h1>
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
        <h2>Инвентарь</h2>
        {(game?.state?.inventory || []).length ? game?.state.inventory.map((item) => <p key={item} className="list-item">{item}</p>) : <p className="muted">Пока пусто.</p>}
      </section>
      <section className="panel">
        <h2>Улики</h2>
        {(game?.state?.clues || []).length ? game?.state.clues.map((item) => <p key={item} className="list-item">{item}</p>) : <p className="muted">Улики появятся по ходу истории.</p>}
      </section>
    </section>
  );
}
