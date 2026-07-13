import type { CSSProperties } from "react";
import { useEffect, useMemo } from "react";

export function SceneCard({
  text,
  imageUrl,
  onImage,
  onRevealDone,
  chapterNumber = 1,
}: {
  text: string;
  imageUrl?: string;
  onImage?: () => void;
  onRevealDone?: () => void;
  chapterNumber?: number;
}) {
  const visible = text;
  const parts = useMemo(() => {
    const paragraphs = visible.split(/\n\s*\n/).filter(Boolean);
    const leadCount = Math.min(paragraphs.length, chapterNumber % 3 === 0 ? 2 : 1);
    return {
      lead: paragraphs.slice(0, leadCount).join("\n\n"),
      rest: paragraphs.slice(leadCount).join("\n\n"),
    };
  }, [chapterNumber, visible]);

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

  function animatedText(value: string, offset = 0) {
    const tokens = value.split(/(\s+)/);
    return tokens.map((token, index) => {
      if (!token.trim()) return token;
      return (
        <span className="ink-word" key={`${token}-${offset}-${index}`} style={inkStyle(index + offset, tokens.length + offset)}>
          {token}
        </span>
      );
    });
  }

  return (
    <section className="scene-card">
      <article className="scene-text scene-lead typewriter-text" aria-label={visible} key={`${visible}-lead`}>
        {animatedText(parts.lead)}
      </article>
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
      {parts.rest && (
        <article className="scene-text scene-rest typewriter-text" aria-hidden="true" key={`${visible}-rest`}>
          {animatedText(parts.rest, parts.lead.split(/\s+/).length)}
        </article>
      )}
    </section>
  );
}
