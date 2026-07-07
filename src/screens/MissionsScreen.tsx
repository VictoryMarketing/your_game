import type { Mission } from "../api/types";

export function MissionsScreen({ missions }: { missions: Mission[] }) {
  return (
    <section className="screen-stack">
      <header>
        <span className="eyebrow">Миссии</span>
        <h1>Дневные цели</h1>
        <p>Выполняй задания, чтобы чаще возвращаться к редким веткам и наградам.</p>
      </header>
      <div className="panel mission-list">
        {missions.map((mission) => (
          <div className="mission-row" key={mission.k}>
            <span>⬜️</span>
            <p>{mission.title}</p>
            <strong>{mission.target}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
