import type { CSSProperties } from "react";
import { useEffect, useMemo } from "react";

export function SceneCard({
  text,
  imageUrl,
  onImage,
  onRevealDone,
}: {
  text: string;
  imageUrl?: string;
  onImage?: () => void;
  onRevealDone?: () => void;
}) {
  const visible = text;
  const tokens = useMemo(() => visible.split(/(\s+)/), [visible]);

  useEffect(() => {
    const id = window.setTimeout(() => onRevealDone?.(), 5400);
    return () => window.clearTimeout(id);
  }, [visible, onRevealDone]);

  function inkStyle(index: number, total: number): CSSProperties {
    const flow = total <= 1 ? 0 : (index / Math.max(1, total - 1)) * 3.8;
    const jitter = ((index * 37) % 19) / 19 * 0.95;
    const delay = Math.min(4.65, flow + jitter);
    const x = ((index * 23) % 17) - 8;
    const y = ((index * 31) % 13) - 6;
    return {
      "--ink-delay": `${delay.toFixed(2)}s`,
      "--ink-x": `${x}px`,
      "--ink-y": `${y}px`,
    } as CSSProperties;
  }

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
      <article className="scene-text typewriter-text" aria-label={visible} key={visible}>
        {tokens.map((token, index) => {
          if (!token.trim()) return token;
          return (
            <span className="ink-word" key={`${token}-${index}`} style={inkStyle(index, tokens.length)}>
              {token}
            </span>
          );
        })}
      </article>
    </section>
  );
}
