import { ArrowDown, ArrowUp, Image, Mic, PackageOpen, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PaymentRequiredError } from "../api/client";
import { answerGame, customAnswerGame, generateImage, generateVoice, updateGameSettings } from "../api/gameApi";
import { getInventory } from "../api/inventoryApi";
import type { Choice, GameSession, Profile, UserItem } from "../api/types";
import { ChoiceCard } from "../components/ChoiceCard";
import { ProgressHeader } from "../components/ProgressHeader";
import { SceneCard } from "../components/SceneCard";
import { ChapterGenerationOverlay } from "../components/ChapterGenerationOverlay";
import { LimitStateCard } from "../components/LimitStateCard";
import { haptic, notify } from "../telegram/telegram";
import { itemSpriteStyle } from "../utils/itemSprites";

type Props = {
  game: GameSession | null | undefined;
  profile?: Profile;
  onGame: (game: GameSession) => void;
  onInventory: () => void;
  onPaywall: (reason: string) => void;
};

const traitLabels: Record<string, string> = {
  bravery: "Храбрость",
  cunning: "Хитрость",
  empathy: "Эмпатия",
  logic: "Логика",
};

const worldLabels: Record<string, string> = {
  reputation: "Репутация",
  resources: "Ресурсы",
  threat: "Угроза",
};

function DeltaMark({ delta }: { delta: number }) {
  if (delta > 0) return <span className="delta up"><ArrowUp size={13} /> +{delta}</span>;
  if (delta < 0) return <span className="delta down"><ArrowDown size={13} /> {delta}</span>;
  return null;
}

function outcomeText(comment?: string) {
  switch ((comment || "").toLowerCase()) {
    case "критический успех":
      return "Итог хода: сильный успех. Решение дало заметное преимущество и может открыть редкую возможность.";
    case "успех":
      return "Итог хода: успех. Решение сработало и улучшило позицию героя.";
    case "частичный провал":
      return "Итог хода: частичный провал. План сработал не полностью, появились осложнения.";
    case "тяжёлый провал":
      return "Итог хода: тяжёлый провал. Решение ухудшило ситуацию и усилило риск.";
    default:
      return "Итог хода повлиял на очки, навыки и следующую сцену.";
  }
}

function StatChangePanel({ game }: { game: GameSession }) {
  const chapter = game.current_chapter;
  const traits = game.state.traits || {};
  const world = game.state.world || {};
  const traitDelta = chapter?.traits_delta || {};
  const worldDelta = chapter?.world_delta || {};
  const scoreDelta = chapter?.score_delta || 0;
  const roll = game.state.last_roll;
  return (
    <section className="rune-stats-panel">
      <div className="rune-stats-head">
        <span>След прошлого хода</span>
        <strong className="score-total">{game.score} очков <DeltaMark delta={scoreDelta} /></strong>
      </div>
      <div className="rune-stat-grid">
        {Object.entries(traitLabels).map(([key, label]) => (
          <div className="rune-stat" key={key}>
            <span>{label}</span>
            <strong className="stat-value">{traits[key] ?? 0}<DeltaMark delta={traitDelta[key] || 0} /></strong>
          </div>
        ))}
        {Object.entries(worldLabels).map(([key, label]) => (
          <div className="rune-stat" key={key}>
            <span>{label}</span>
            <strong className="stat-value">{world[key] ?? 0}<DeltaMark delta={worldDelta[key] || 0} /></strong>
          </div>
        ))}
      </div>
      {roll?.comment && (
        <p className="rune-roll">
          {outcomeText(roll.comment)}
          {roll.used_items?.length ? ` Сработал предмет: ${roll.used_items.join(", ")}.` : ""}
          {roll.used_clues?.length ? ` Помогла улика: ${roll.used_clues.join(", ")}.` : ""}
        </p>
      )}
    </section>
  );
}

function ItemCarousel({
  items,
  selectedKey,
  onSelect,
}: {
  items: UserItem[];
  selectedKey?: string | null;
  onSelect: (key: string | null) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="item-carousel-panel">
      <div className="section-head">
        <h2>Предмет для хода</h2>
        {selectedKey && (
          <button className="text-button" onClick={() => onSelect(null)} type="button">
            Снять
          </button>
        )}
      </div>
      <p className="muted">Нажми предмет, затем выбери ход. Предмет потратится и исчезнет из инвентаря.</p>
      <div className="item-carousel">
        {items.map((item) => {
          const active = selectedKey === item.key;
          return (
            <button className={active ? `item-token active rarity-${item.rarity}` : `item-token rarity-${item.rarity}`} key={item.key} onClick={() => onSelect(active ? null : item.key)} type="button">
              <span className="item-art small" style={itemSpriteStyle(item)} />
              <strong>{item.title}</strong>
              <small>{item.rarity_label}{item.count && item.count > 1 ? ` x${item.count}` : ""}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function GameScreen({ game, profile, onGame, onInventory, onPaywall }: Props) {
  const [busy, setBusy] = useState(false);
  const [limitReason, setLimitReason] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [sceneRevealed, setSceneRevealed] = useState(false);
  const [storyLeaving, setStoryLeaving] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [items, setItems] = useState<UserItem[]>([]);
  const [custom, setCustom] = useState("");
  const [voiceUrl, setVoiceUrl] = useState<string | undefined>(game?.current_chapter?.voice_url);
  const autoMediaAttempted = useRef<Set<string>>(new Set());
  const chapter = game?.current_chapter;
  const choices = useMemo(() => chapter?.choices || [], [chapter]);
  const handleRevealDone = useCallback(() => setSceneRevealed(true), []);

  const refreshItems = useCallback(() => {
    getInventory()
      .then((payload) => setItems(payload.items || []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    setVoiceUrl(game?.current_chapter?.voice_url);
  }, [game?.current_chapter?.id, game?.current_chapter?.voice_url]);

  useEffect(() => {
    setSceneRevealed(false);
    setStoryLeaving(false);
    setSelectedChoiceId(null);
    setSelectedItemKey(null);
  }, [game?.current_chapter?.id]);

  useEffect(() => {
    refreshItems();
  }, [game?.id, game?.current_chapter?.id, refreshItems]);

  useEffect(() => {
    const active = busy || imageBusy || voiceBusy;
    if (!active) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [busy, imageBusy, voiceBusy]);

  useEffect(() => {
    if (!game || !game.current_chapter) return;
    const wantsImage = Boolean(game.auto_generate_images && !game.current_chapter.image_url);
    const wantsVoice = Boolean(game.auto_generate_voice && !game.current_chapter.voice_url);
    if (!wantsImage && !wantsVoice) return;
    const key = `${game.id}:${game.current_chapter.id}:${wantsImage ? "i" : ""}${wantsVoice ? "v" : ""}`;
    if (autoMediaAttempted.current.has(key)) return;
    autoMediaAttempted.current.add(key);
    void runAutoMedia(game);
  }, [game?.id, game?.current_chapter?.id, game?.auto_generate_images, game?.auto_generate_voice]);

  if (!game || !chapter) {
    return (
      <section className="empty-state">
        <h1>Активной истории нет</h1>
        <p>Создай новую историю, чтобы начать прохождение.</p>
      </section>
    );
  }
  const activeGame = game;
  const activeChapter = chapter;

  async function run(action: () => Promise<GameSession>) {
    setBusy(true);
    setLimitReason(null);
    setMediaNotice(null);
    try {
      const next = await action();
      haptic("medium");
      onGame(next);
      setCustom("");
      setSelectedItemKey(null);
      refreshItems();
    } catch (err) {
      setStoryLeaving(false);
      setSelectedChoiceId(null);
      if (err instanceof PaymentRequiredError) {
        setLimitReason(err.reason);
        onPaywall(err.reason);
      } else {
        notify("error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function select(choice: Choice) {
    if (choice.id === "custom") return;
    if (busy || storyLeaving) return;
    setSelectedChoiceId(choice.id);
    setStoryLeaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 760));
    await run(() => answerGame(activeGame.id, choice.id, selectedItemKey || undefined));
  }

  async function sendCustom() {
    if (custom.trim().length < 3) return;
    if (busy || storyLeaving) return;
    setStoryLeaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 520));
    await run(() => customAnswerGame(activeGame.id, custom.trim(), selectedItemKey || undefined));
  }

  async function image() {
    setImageBusy(true);
    setLimitReason(null);
    setMediaNotice(null);
    try {
      const result = await generateImage(activeGame.id);
      const next: GameSession = { ...activeGame, current_chapter: { ...activeChapter, image_url: result.image_url } };
      onGame(next);
      notify("success");
    } catch (err) {
      const reason = err instanceof PaymentRequiredError ? err.reason : "no_image_credits";
      setLimitReason(reason);
      onPaywall(reason);
    } finally {
      setImageBusy(false);
    }
  }

  async function voice() {
    setVoiceBusy(true);
    setLimitReason(null);
    setMediaNotice(null);
    try {
      const result = await generateVoice(activeGame.id);
      setVoiceUrl(result.voice_url);
      const next: GameSession = { ...activeGame, current_chapter: { ...activeChapter, voice_url: result.voice_url } };
      onGame(next);
      notify("success");
    } catch (err) {
      const reason = err instanceof PaymentRequiredError ? err.reason : "no_voice_credits";
      setLimitReason(reason);
      onPaywall(reason);
    } finally {
      setVoiceBusy(false);
    }
  }

  async function runAutoMedia(nextGame: GameSession) {
    let updated = nextGame;
    if (nextGame.auto_generate_images) {
      setImageBusy(true);
      try {
        const result = await generateImage(nextGame.id);
        updated = { ...updated, current_chapter: updated.current_chapter ? { ...updated.current_chapter, image_url: result.image_url } : updated.current_chapter };
        onGame(updated);
      } catch (err) {
        if (err instanceof PaymentRequiredError) setMediaNotice("Глава готова, но картинка не создана: закончились кредиты или Premium-квота.");
      } finally {
        setImageBusy(false);
      }
    }
    if (nextGame.auto_generate_voice) {
      setVoiceBusy(true);
      try {
        const result = await generateVoice(nextGame.id);
        setVoiceUrl(result.voice_url);
        updated = { ...updated, current_chapter: updated.current_chapter ? { ...updated.current_chapter, voice_url: result.voice_url } : updated.current_chapter };
        onGame(updated);
      } catch (err) {
        if (err instanceof PaymentRequiredError) setMediaNotice("Глава готова, но озвучка не создана: закончились кредиты или Premium-квота.");
      } finally {
        setVoiceBusy(false);
      }
    }
  }

  async function toggleAuto(kind: "image" | "voice") {
    const payload = kind === "image" ? { auto_generate_images: !activeGame.auto_generate_images } : { auto_generate_voice: !activeGame.auto_generate_voice };
    try {
      const next = await updateGameSettings(activeGame.id, payload);
      onGame(next);
      notify("success");
    } catch {
      notify("error");
    }
  }

  return (
    <section className="game-screen">
      {busy && <ChapterGenerationOverlay />}
      {!busy && imageBusy && <ChapterGenerationOverlay variant="image" />}
      {!busy && !imageBusy && voiceBusy && <ChapterGenerationOverlay variant="voice" />}
      <ProgressHeader game={game} profile={profile} />
      {limitReason && <LimitStateCard reason={limitReason} onPrimary={() => onPaywall(limitReason)} onSecondary={() => setLimitReason(null)} />}
      {mediaNotice && <p className="notice">{mediaNotice}</p>}
      <div className="auto-media-row">
        <button className={activeGame.auto_generate_images ? "chip auto-toggle active" : "chip auto-toggle"} onClick={() => toggleAuto("image")} type="button">
          Автокартинка {activeGame.auto_generate_images ? "вкл" : "выкл"}
        </button>
        <button className={activeGame.auto_generate_voice ? "chip auto-toggle active" : "chip auto-toggle"} onClick={() => toggleAuto("voice")} type="button">
          Автоозвучка {activeGame.auto_generate_voice ? "вкл" : "выкл"}
        </button>
      </div>
      {(imageBusy || voiceBusy) && <p className="notice">{imageBusy && voiceBusy ? "Готовлю картинку и озвучку..." : imageBusy ? "Готовлю картинку..." : "Готовлю озвучку..."}</p>}
      <div className={storyLeaving ? "story-content story-leaving" : "story-content"}>
        <StatChangePanel game={activeGame} />
        <SceneCard text={chapter.scene_text} imageUrl={chapter.image_url} onImage={image} onRevealDone={handleRevealDone} />
        {voiceUrl && <audio controls src={voiceUrl} className="audio-player" />}
      </div>

      <div className={`${sceneRevealed ? "choice-list reveal-ready" : "choice-list reveal-waiting"} ${storyLeaving ? "story-leaving" : ""}`}>
        {choices.map((choice) => (
          <ChoiceCard key={choice.id} choice={choice} selected={selectedChoiceId === choice.id} disabled={busy || storyLeaving} onSelect={select} />
        ))}
      </div>

      <div className={sceneRevealed ? "reveal-ready" : "reveal-waiting"}>
        <ItemCarousel items={items} selectedKey={selectedItemKey} onSelect={setSelectedItemKey} />
      </div>

      <div className={`${sceneRevealed ? "custom-box reveal-ready" : "custom-box reveal-waiting"} ${storyLeaving ? "story-leaving" : ""}`}>
        <input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Свой ход..." />
        <button disabled={busy || custom.trim().length < 3} onClick={sendCustom} type="button" aria-label="Отправить свой ход">
          <Send size={18} />
        </button>
      </div>

      <div className="game-actions">
        <button className="secondary-button" disabled={busy || imageBusy} onClick={image} type="button"><Image size={18} /> {imageBusy ? "Рисую..." : "Картинка"}</button>
        <button className="secondary-button" disabled={busy || voiceBusy} onClick={voice} type="button"><Mic size={18} /> {voiceBusy ? "Озвучиваю..." : "Озвучить"}</button>
        <button className="secondary-button" onClick={onInventory} type="button"><PackageOpen size={18} /> Инвентарь</button>
      </div>
    </section>
  );
}
