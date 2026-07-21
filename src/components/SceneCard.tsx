import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo } from "react";

export function SceneCard({
  text,
  imageUrl,
  onImage,
  onRevealDone,
  chapterNumber = 1,
  mediaSlot,
  streaming = false,
  animate = true,
}: {
  text: string;
  imageUrl?: string;
  onImage?: () => void;
  onRevealDone?: () => void;
  chapterNumber?: number;
  mediaSlot?: ReactNode;
  streaming?: boolean;
  animate?: boolean;
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

  function animatedText(value: string, offset = 0, live = false) {
    const tokens = value.split(/(\s+)/);
    return tokens.map((token, index) => {
      if (!token.trim()) return token;
      return (
        <span
          className={live ? "ink-word streaming-ink-word" : "ink-word"}
          key={`${token}-${offset}-${index}`}
          style={live ? ({ "--ink-delay": `${((index + offset) % 7) * 0.055}s` } as CSSProperties) : inkStyle(index + offset, tokens.length + offset)}
        >
          {token}
        </span>
      );
    });
  }

  return (
    <section className="scene-card">
      <article className={animate ? "scene-text scene-lead typewriter-text" : "scene-text scene-lead"} aria-label={visible} key={streaming ? "stream-lead" : animate ? `${visible}-lead` : "ready-lead"}>
        {animate ? animatedText(parts.lead, 0, streaming) : parts.lead}
      </article>
      {mediaSlot && <div className="scene-audio-slot">{mediaSlot}</div>}
      {(!streaming || imageUrl) && <div className="scene-image">
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
      </div>}
      {parts.rest && (
        <article className={animate ? "scene-text scene-rest typewriter-text" : "scene-text scene-rest"} aria-hidden="true" key={streaming ? "stream-rest" : animate ? `${visible}-rest` : "ready-rest"}>
          {animate ? animatedText(parts.rest, parts.lead.split(/\s+/).length, streaming) : parts.rest}
        </article>
      )}
    </section>
  );
}
