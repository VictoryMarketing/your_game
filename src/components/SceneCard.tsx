import { useState } from "react";

export function SceneCard({ text, imageUrl }: { text: string; imageUrl?: string }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 1300;
  const isLong = text.length > limit;
  const visible = expanded || !isLong ? text : `${text.slice(0, limit).trim()}...`;

  return (
    <section className="scene-card">
      <div className="scene-image">
        {imageUrl ? <img src={imageUrl} alt="Сцена истории" /> : <span>Иллюстрация появится здесь</span>}
      </div>
      <article className="scene-text">{visible}</article>
      {isLong && (
        <button className="text-button" onClick={() => setExpanded((value) => !value)} type="button">
          {expanded ? "Свернуть" : "Читать полностью"}
        </button>
      )}
    </section>
  );
}
