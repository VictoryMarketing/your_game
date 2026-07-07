import { useState } from "react";

export function SceneCard({ text, imageUrl, onImage }: { text: string; imageUrl?: string; onImage?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 1300;
  const isLong = text.length > limit;
  const visible = expanded || !isLong ? text : `${text.slice(0, limit).trim()}...`;

  return (
    <section className="scene-card">
      <div className="scene-image">
        {imageUrl ? (
          <img src={imageUrl} alt="Сцена истории" />
        ) : (
          <div className="scene-placeholder">
            <strong>Иллюстрация появится здесь</strong>
            {onImage && (
              <button className="secondary-button" onClick={onImage} type="button">
                Создать иллюстрацию
              </button>
            )}
          </div>
        )}
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
