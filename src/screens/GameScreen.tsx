import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, Eye, HeartHandshake, Image, Lock, Maximize2, Mic, Minimize2, PackageOpen, Plus, Send, ShieldCheck, ShieldOff, Sparkles, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, PaymentRequiredError } from "../api/client";
import { getCurrentGame, transcribeAnswer, updateGameSettings } from "../api/gameApi";
import { generateChapterJob, generateImageJob, generateVoiceJob } from "../api/jobApi";
import { getInventory, setItemProtection } from "../api/inventoryApi";
import type { Choice, GameSession, Profile, UserItem } from "../api/types";
import { ChoiceCard } from "../components/ChoiceCard";
import { ProgressHeader } from "../components/ProgressHeader";
import { SceneCard } from "../components/SceneCard";
import { ChapterGenerationOverlay } from "../components/ChapterGenerationOverlay";
import { LimitStateCard } from "../components/LimitStateCard";
import { haptic, notify } from "../telegram/telegram";
import { itemSpriteStyle } from "../utils/itemSprites";
import { StoryAudioPlayer } from "../components/StoryAudioPlayer";
import type { AudioTrack } from "../audio/AudioPlayerContext";
import { trackClientEvent } from "../api/eventsApi";
import { ModalPortal } from "../components/ModalPortal";

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

type PendingMove = {
  kind: "choice" | "custom";
  choice?: Choice;
  text: string;
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
  const [expanded, setExpanded] = useState(false);
  const chapter = game.current_chapter;
  const traits = game.state.traits || {};
  const world = game.state.world || {};
  const traitDelta = chapter?.traits_delta || {};
  const worldDelta = chapter?.world_delta || {};
  const scoreDelta = chapter?.score_delta || 0;
  const roll = game.state.last_roll;
  const changedTraits = Object.entries(traitDelta).filter(([, value]) => value);
  const changedWorld = Object.entries(worldDelta).filter(([, value]) => value);
  const shortChanges = [
    ...changedTraits.map(([key, value]) => `${traitLabels[key] || key} ${value > 0 ? "+" : ""}${value}`),
    ...changedWorld.map(([key, value]) => `${worldLabels[key] || key} ${value > 0 ? "+" : ""}${value}`),
  ].slice(0, 3);
  return (
    <section className="rune-stats-panel">
      <button className="rune-summary" onClick={() => setExpanded((value) => !value)} type="button">
        <span>{roll?.comment ? outcomeText(roll.comment).replace("Итог хода: ", "").split(".")[0] : "След прошлого хода"}</span>
        <strong className="score-total">{game.score} очков <DeltaMark delta={scoreDelta} /></strong>
        {shortChanges.length > 0 && <small>{shortChanges.join(" · ")}</small>}
        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>
      {expanded && (
        <div className="rune-details">
          <div className="rune-stats-head">
            <span>Почему это произошло</span>
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
              {roll.used_items?.length ? ` ${roll.used_items.join(", ")}.` : ""}
              {roll.used_clues?.length ? ` Помогла улика: ${roll.used_clues.join(", ")}.` : ""}
            </p>
          )}
        </div>
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
  const selectedItem = selectedKey ? items.find((item) => item.key === selectedKey) : null;
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
      {selectedItem && (
        <div className={`selected-item-note rarity-${selectedItem.rarity}`}>
          <strong>{selectedItem.title}</strong>
          <span>{selectedItem.rarity_label}</span>
          <p>{selectedItem.description}</p>
          <small>{selectedItem.helps}</small>
        </div>
      )}
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

function ItemPickerSheet({
  items,
  selectedKey,
  onSelect,
  onProtect,
  onClose,
}: {
  items: UserItem[];
  selectedKey?: string | null;
  onSelect: (key: string | null) => void;
  onProtect: (key: string, protectedValue: boolean) => void;
  onClose: () => void;
}) {
  const selectedItem = selectedKey ? items.find((item) => item.key === selectedKey) : null;
  return (
    <ModalPortal onClose={onClose}>
      <section className="select-sheet modal-sheet item-sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="item-picker-title">
        <div className="sheet-handle" />
        <div className="section-head">
          <div>
            <h2 id="item-picker-title">Добавить предмет к ходу</h2>
            <p className="muted">Предмет расходуется после подтверждения хода. Если он не подходит сцене, польза не гарантирована.</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        {selectedItem && (
          <div className={`selected-item-note rarity-${selectedItem.rarity}`}>
            <strong>Используется: {selectedItem.title}</strong>
            <span>{selectedItem.rarity_label}</span>
            <p>{selectedItem.description}</p>
            <small>{selectedItem.helps}</small>
            <button className="text-button" onClick={() => onSelect(null)} type="button">
              Снять предмет
            </button>
          </div>
        )}
        <div className="item-sheet-list">
          {items.length ? (
            items.map((item) => {
              const active = selectedKey === item.key;
              const locked = Boolean(item.protected || ((item.protected_count || 0) > 0 && (item.available_count || 0) <= 0));
              return (
                <div
                  className={active ? `item-sheet-row active rarity-${item.rarity}` : `item-sheet-row rarity-${item.rarity}`}
                  key={item.key}
                >
                  <span className="item-art small" style={itemSpriteStyle(item)} />
                  <span className="item-sheet-copy">
                    <strong>{item.title}</strong>
                    <small>
                      {item.rarity_label}{item.count && item.count > 1 ? ` x${item.count}` : ""}
                      {locked ? " · защищён" : ""}
                    </small>
                    <em>{item.helps}</em>
                    {locked && <em>Нажми, чтобы снять защиту перед использованием.</em>}
                  </span>
                  <span className="item-sheet-actions">
                    <button
                      className="item-sheet-protect"
                      onClick={() => {
                        onProtect(item.key, !locked);
                        haptic("light");
                      }}
                      type="button"
                      aria-label={locked ? `Снять защиту с предмета «${item.title}»` : `Защитить предмет «${item.title}»`}
                    >
                      {locked ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                      <span>{locked ? "Снять защиту" : "Защитить"}</span>
                    </button>
                    <button
                      className="icon-button"
                      disabled={locked}
                      onClick={() => {
                        onSelect(active ? null : item.key);
                        haptic("light");
                      }}
                      type="button"
                      aria-label={active ? "Снять предмет с хода" : "Добавить предмет к ходу"}
                    >
                      {locked ? <Lock size={18} /> : active ? <Check size={18} /> : <Plus size={18} />}
                    </button>
                  </span>
                </div>
              );
            })
          ) : (
            <p className="muted">Пока нет предметов. Они выпадают за сильные ходы или покупаются в магазине.</p>
          )}
        </div>
      </section>
    </ModalPortal>
  );
}

function itemNeedsConfirmation(item?: UserItem | null) {
  return Boolean(item && ["rare", "epic", "legendary", "mythic"].includes(item.rarity));
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
  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [readingMode, setReadingMode] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [items, setItems] = useState<UserItem[]>([]);
  const [dropItem, setDropItem] = useState<GameSession["state"]["last_item_drop"]>(null);
  const [custom, setCustom] = useState("");
  const [answerRecording, setAnswerRecording] = useState(false);
  const [answerTranscribing, setAnswerTranscribing] = useState(false);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const answerRecorderRef = useRef<MediaRecorder | null>(null);
  const answerStreamRef = useRef<MediaStream | null>(null);
  const answerChunksRef = useRef<Blob[]>([]);
  const answerTimerRef = useRef<number | null>(null);
  const moveConfirmRef = useRef<HTMLElement | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | undefined>(
    (game?.current_chapter?.voice_version || 0) >= 2 ? game?.current_chapter?.voice_url : undefined,
  );
  const autoMediaAttempted = useRef<Set<string>>(new Set());
  const chapter = game?.current_chapter;
  const choices = useMemo(() => {
    const source = chapter?.choices || [];
    const hasCustom = source.some((choice) => choice.id === "custom" || choice.text.toLowerCase().includes("свой вариант"));
    if (game?.status === "active" && !hasCustom) {
      return [...source, { id: "custom", label: "✍️", text: "Свой вариант" }];
    }
    return source;
  }, [chapter, game?.status]);
  const hasCustomChoice = choices.some((choice) => choice.id === "custom" || choice.text.toLowerCase().includes("свой вариант"));
  const relevantRelations = useMemo(() => {
    const relations = Object.values(game?.state.npc_relations || {});
    const visible = new Set(
      (game?.state.last_writer_meta?.characters_present || []).map((name) => name.trim().toLocaleLowerCase("ru")),
    );
    return relations.sort((left, right) => {
      const leftVisible = visible.has((left.name || "").trim().toLocaleLowerCase("ru")) ? 1 : 0;
      const rightVisible = visible.has((right.name || "").trim().toLocaleLowerCase("ru")) ? 1 : 0;
      if (leftVisible !== rightVisible) return rightVisible - leftVisible;
      const leftStrength = Math.abs(Number(left.trust || 0)) + Math.abs(Number(left.respect || 0)) + Math.abs(Number(left.fear || 0));
      const rightStrength = Math.abs(Number(right.trust || 0)) + Math.abs(Number(right.respect || 0)) + Math.abs(Number(right.fear || 0));
      return rightStrength - leftStrength;
    });
  }, [game?.state.npc_relations, game?.state.last_writer_meta?.characters_present]);
  const selectedItem = selectedItemKey ? items.find((item) => item.key === selectedItemKey) : null;
  const imageCreditsAvailable = Number(profile?.image_credits || 0) + Number(profile?.premium_image_remaining || 0) > 0;
  const voiceCreditsAvailable = Number(profile?.voice_credits || 0) + Number(profile?.premium_voice_remaining || 0) > 0;
  const audioTrack = useMemo<AudioTrack | null>(() => {
    if (!voiceUrl || !game?.current_chapter) return null;
    return {
      id: `${game.id}:${game.current_chapter.id}:${voiceUrl}`,
      url: voiceUrl,
      title: `Глава ${game.current_chapter.chapter_number}`,
      subtitle: game.title,
      sessionId: game.id,
    };
  }, [game?.id, game?.title, game?.current_chapter?.id, game?.current_chapter?.chapter_number, voiceUrl]);
  const handleRevealDone = useCallback(() => setSceneRevealed(true), []);
  const confirmMoves = Boolean(profile?.confirm_moves);

  const refreshItems = useCallback(() => {
    getInventory()
      .then((payload) => setItems(payload.items || []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    setVoiceUrl((game?.current_chapter?.voice_version || 0) >= 2 ? game?.current_chapter?.voice_url : undefined);
  }, [game?.current_chapter?.id, game?.current_chapter?.voice_url, game?.current_chapter?.voice_version]);

  useEffect(() => {
    setSceneRevealed(false);
    setStoryLeaving(false);
    setSelectedChoiceId(null);
    setSelectedItemKey(null);
    setPendingMove(null);
    setItemSheetOpen(false);
    setShowCustomInput(false);
    setCustom("");
  }, [game?.current_chapter?.id]);

  useEffect(() => {
    if (readingMode) document.body.dataset.readingMode = "true";
    else delete document.body.dataset.readingMode;
    return () => {
      delete document.body.dataset.readingMode;
    };
  }, [readingMode]);

  useEffect(() => () => {
    if (answerTimerRef.current) window.clearTimeout(answerTimerRef.current);
    if (answerRecorderRef.current?.state === "recording") answerRecorderRef.current.stop();
    answerStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    refreshItems();
  }, [game?.id, game?.current_chapter?.id, refreshItems]);

  useEffect(() => {
    const drop = game?.state?.last_item_drop;
    const sessionId = game?.id;
    if (!drop?.drop_id || !sessionId) return;
    const seenKey = `yougame_item_drop_seen:${sessionId}:${drop.drop_id}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, "1");
    setDropItem(drop);
    notify("success");
    void trackClientEvent("item_drop_reveal", { item_key: drop.key, rarity: drop.rarity, chapter: drop.chapter }, sessionId).catch(() => null);
  }, [game?.id, game?.state?.last_item_drop?.drop_id]);

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
    const wantsVoice = Boolean(game.auto_generate_voice && (!game.current_chapter.voice_url || (game.current_chapter.voice_version || 0) < 2));
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
      setPendingMove(null);
      setShowCustomInput(false);
      refreshItems();
    } catch (err) {
      setStoryLeaving(false);
      setSelectedChoiceId(null);
      if (err instanceof PaymentRequiredError) {
        setLimitReason(err.reason);
        onPaywall(err.reason);
      } else {
        try {
          const current = await getCurrentGame();
          if (current.current_game && current.current_game.id !== activeGame.id) {
            onGame(current.current_game);
            setMediaNotice("Открыта актуальная активная история. Старая ветка уже находится в архиве.");
            return;
          }
        } catch {
          // The original error is reported below.
        }
        setMediaNotice(err instanceof ApiError || err instanceof Error ? err.message : "Не удалось продолжить историю. Повторите попытку.");
        notify("error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitMove(move: PendingMove) {
    if (busy || storyLeaving) return;
    if (itemNeedsConfirmation(selectedItem)) {
      const ok = window.confirm(`${selectedItem?.title} — редкий предмет. Он будет потрачен после хода. Использовать сейчас?`);
      if (!ok) return;
    }
    setStoryLeaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 620));
    if (move.kind === "choice" && move.choice) {
      await run(() => generateChapterJob(activeGame.id, { choiceId: move.choice!.id, itemKey: selectedItemKey || undefined }));
    } else {
      await run(() => generateChapterJob(activeGame.id, { customInput: move.text, itemKey: selectedItemKey || undefined }));
    }
  }

  async function select(choice: Choice) {
    if (busy || storyLeaving) return;
    if (choice.id === "custom" || choice.text.toLowerCase().includes("свой вариант")) {
      setSelectedChoiceId(choice.id);
      setShowCustomInput(true);
      setPendingMove(null);
      window.setTimeout(() => customInputRef.current?.focus(), 60);
      haptic("light");
      return;
    }
    setSelectedChoiceId(choice.id);
    haptic("light");
    const move: PendingMove = { kind: "choice", choice, text: choice.text };
    if (!confirmMoves) {
      await submitMove(move);
      return;
    }
    setPendingMove(move);
    window.setTimeout(() => moveConfirmRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }

  async function sendCustom() {
    if (custom.trim().length < 3) return;
    if (busy || storyLeaving) return;
    setSelectedChoiceId("custom");
    haptic("light");
    const move: PendingMove = { kind: "custom", text: custom.trim() };
    if (!confirmMoves) {
      await submitMove(move);
      return;
    }
    setPendingMove(move);
    window.setTimeout(() => moveConfirmRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }

  function stopVoiceAnswer() {
    if (answerTimerRef.current) window.clearTimeout(answerTimerRef.current);
    answerTimerRef.current = null;
    if (answerRecorderRef.current?.state === "recording") answerRecorderRef.current.stop();
  }

  async function applyVoiceAnswer(text: string) {
    const normalized = text.trim().toLowerCase();
    const numberWords: Array<[RegExp, number]> = [
      [/\b(?:1|один|перв(?:ый|ая)|first)\b/u, 0],
      [/\b(?:2|два|втор(?:ой|ая)|second)\b/u, 1],
      [/\b(?:3|три|трет(?:ий|ья)|third)\b/u, 2],
      [/\b(?:4|четыре|четв[её]рт(?:ый|ая)|fourth)\b/u, 3],
      [/\b(?:5|пять|пят(?:ый|ая)|fifth)\b/u, 4],
      [/\b(?:6|шесть|шест(?:ой|ая)|sixth)\b/u, 5],
    ];
    const matched = numberWords.find(([pattern]) => pattern.test(normalized));
    const regularChoices = choices.filter((choice) => choice.id !== "custom" && !choice.text.toLowerCase().includes("свой вариант"));
    if (matched && regularChoices[matched[1]]) {
      setMediaNotice(`Распознано: вариант ${matched[1] + 1}.`);
      await select(regularChoices[matched[1]]);
      return;
    }
    if (hasCustomChoice) {
      setSelectedChoiceId("custom");
      setShowCustomInput(true);
      setPendingMove(null);
      setCustom(text.trim());
      setMediaNotice("Голосовой ход распознан. Проверьте текст и отправьте его.");
      window.setTimeout(() => customInputRef.current?.focus(), 60);
      return;
    }
    setMediaNotice("Назовите номер предложенного варианта. Свободный ход в этой сцене закрыт.");
  }

  async function toggleVoiceAnswer() {
    if (answerRecording) {
      stopVoiceAnswer();
      return;
    }
    if (busy || storyLeaving || answerTranscribing) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMediaNotice("Запись голоса не поддерживается этим браузером. Выберите вариант кнопкой.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      answerStreamRef.current = stream;
      answerRecorderRef.current = recorder;
      answerChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) answerChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(answerChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        answerStreamRef.current = null;
        answerRecorderRef.current = null;
        setAnswerRecording(false);
        setAnswerTranscribing(true);
        void transcribeAnswer(activeGame.id, blob)
          .then((result) => applyVoiceAnswer(result.text))
          .catch((error) => setMediaNotice(error instanceof Error ? error.message : "Не удалось распознать голосовой ход."))
          .finally(() => setAnswerTranscribing(false));
      };
      recorder.start(250);
      setAnswerRecording(true);
      setMediaNotice("Слушаю. Назовите номер варианта или продиктуйте свой ход.");
      haptic("medium");
      answerTimerRef.current = window.setTimeout(stopVoiceAnswer, 15_000);
    } catch {
      setMediaNotice("Нет доступа к микрофону. Разрешите его в настройках браузера или Telegram.");
    }
  }

  function insertClue(clue: string) {
    if (!hasCustomChoice) {
      setMediaNotice("В этой сцене свободный ход закрыт. Улика сохранится и пригодится в следующей подходящей сцене.");
      return;
    }
    setSelectedChoiceId("custom");
    setShowCustomInput(true);
    setPendingMove(null);
    setCustom((current) => current.trim() ? `${current.trim()} Проверить улику: ${clue}` : `Проверить улику: ${clue}`);
    haptic("light");
    window.setTimeout(() => customInputRef.current?.focus(), 60);
  }

  async function confirmMove() {
    if (!pendingMove || busy || storyLeaving) return;
    await submitMove(pendingMove);
  }

  function cancelPendingMove() {
    setPendingMove(null);
    setSelectedChoiceId(null);
  }

  async function image() {
    if (!imageCreditsAvailable) {
      setLimitReason("no_image_credits");
      onPaywall("no_image_credits");
      return;
    }
    setImageBusy(true);
    setLimitReason(null);
    setMediaNotice(null);
    try {
      const result = await generateImageJob(activeGame.id);
      const next: GameSession = { ...activeGame, current_chapter: { ...activeChapter, image_url: result.image_url } };
      onGame(next);
      notify("success");
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setLimitReason(err.reason);
        onPaywall(err.reason);
      } else {
        setMediaNotice(err instanceof Error ? err.message : "Не удалось создать картинку. Кредит не списан.");
        notify("error");
      }
    } finally {
      setImageBusy(false);
    }
  }

  async function voice() {
    if (!voiceCreditsAvailable) {
      setLimitReason("no_voice_credits");
      onPaywall("no_voice_credits");
      return;
    }
    setVoiceBusy(true);
    setLimitReason(null);
    setMediaNotice(null);
    try {
      const result = await generateVoiceJob(activeGame.id);
      setVoiceUrl(result.voice_url);
      const next: GameSession = { ...activeGame, current_chapter: { ...activeChapter, voice_url: result.voice_url, voice_version: 2 } };
      onGame(next);
      notify("success");
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setLimitReason(err.reason);
        onPaywall(err.reason);
      } else {
        setMediaNotice(err instanceof Error ? err.message : "Не удалось создать озвучку. Кредит не списан.");
        notify("error");
      }
    } finally {
      setVoiceBusy(false);
    }
  }

  async function runAutoMedia(nextGame: GameSession) {
    let updated = nextGame;
    if (nextGame.auto_generate_images) {
      if (!imageCreditsAvailable) {
        setMediaNotice("Автокартинка пропущена: закончились кредиты или Premium-квота.");
      } else {
        setImageBusy(true);
        try {
          const result = await generateImageJob(nextGame.id);
          updated = { ...updated, current_chapter: updated.current_chapter ? { ...updated.current_chapter, image_url: result.image_url } : updated.current_chapter };
          onGame(updated);
        } catch (err) {
          setMediaNotice(err instanceof PaymentRequiredError
            ? "Глава готова, но картинка не создана: закончились кредиты или Premium-квота."
            : "Глава готова, но картинку сейчас создать не удалось. Кредит возвращён.");
        } finally {
          setImageBusy(false);
        }
      }
    }
    if (nextGame.auto_generate_voice) {
      if (!voiceCreditsAvailable) {
        setMediaNotice("Автоозвучка пропущена: закончились кредиты или Premium-квота.");
      } else {
        setVoiceBusy(true);
        try {
          const result = await generateVoiceJob(nextGame.id);
          setVoiceUrl(result.voice_url);
          updated = { ...updated, current_chapter: updated.current_chapter ? { ...updated.current_chapter, voice_url: result.voice_url, voice_version: 2 } : updated.current_chapter };
          onGame(updated);
        } catch (err) {
          setMediaNotice(err instanceof PaymentRequiredError
            ? "Глава готова, но озвучка не создана: закончились кредиты или Premium-квота."
            : "Глава готова, но озвучку сейчас создать не удалось. Кредит возвращён.");
        } finally {
          setVoiceBusy(false);
        }
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

  async function protectItem(itemKey: string, protectedValue: boolean) {
    try {
      const payload = await setItemProtection(itemKey, protectedValue);
      setItems(payload.items || []);
      if (selectedItemKey === itemKey && protectedValue) setSelectedItemKey(null);
      notify("success");
    } catch {
      notify("error");
    }
  }

  return (
    <section className={readingMode ? "game-screen reading-mode" : "game-screen"}>
      {busy && <ChapterGenerationOverlay />}
      {!busy && imageBusy && <ChapterGenerationOverlay variant="image" />}
      {!busy && !imageBusy && voiceBusy && <ChapterGenerationOverlay variant="voice" />}
      {!readingMode && <ProgressHeader game={game} profile={profile} />}
      {readingMode && (
        <header className="reading-header">
          <div>
            <small>Глава {chapter.chapter_number}</small>
            <strong>{game.title}</strong>
          </div>
          <button className="reading-exit" onClick={() => setReadingMode(false)} type="button">
            <Minimize2 size={16} /> Интерфейс
          </button>
        </header>
      )}
      {limitReason && <LimitStateCard reason={limitReason} onPrimary={() => onPaywall(limitReason)} onSecondary={() => setLimitReason(null)} />}
      {mediaNotice && <p className="notice">{mediaNotice}</p>}
      {!readingMode && <div className="auto-media-row">
        <button className={activeGame.auto_generate_images ? "chip auto-toggle active" : "chip auto-toggle"} onClick={() => toggleAuto("image")} type="button">
          Автокартинка {activeGame.auto_generate_images ? "вкл" : "выкл"}
        </button>
        <button className={activeGame.auto_generate_voice ? "chip auto-toggle active" : "chip auto-toggle"} onClick={() => toggleAuto("voice")} type="button">
          Автоозвучка {activeGame.auto_generate_voice ? "вкл" : "выкл"}
        </button>
        <button className="chip" onClick={() => setReadingMode(true)} type="button">
          <Maximize2 size={17} /> Читать без интерфейса
        </button>
      </div>}
      {(imageBusy || voiceBusy) && <p className="notice">{imageBusy && voiceBusy ? "Готовлю картинку и озвучку..." : imageBusy ? "Готовлю картинку..." : "Готовлю озвучку..."}</p>}
      <div className={storyLeaving ? "story-content story-leaving" : "story-content"}>
        {!readingMode && <StatChangePanel game={activeGame} />}
        {!readingMode && activeGame.state.last_item_outcome && (
          <aside className={activeGame.state.last_item_outcome.effective ? "item-outcome effective" : "item-outcome spent"}>
            <span className="item-outcome-icon" aria-hidden="true">
              {activeGame.state.last_item_outcome.effective ? <Sparkles size={20} /> : <PackageOpen size={20} />}
            </span>
            <span>
              <small>{activeGame.state.last_item_outcome.effective ? "Предмет повлиял на ход" : "Предмет израсходован"}</small>
              <strong>{activeGame.state.last_item_outcome.title}</strong>
              <p>{activeGame.state.last_item_outcome.reason}</p>
            </span>
          </aside>
        )}
        <SceneCard
          key={chapter.id}
          text={chapter.scene_text}
          imageUrl={chapter.image_url || undefined}
          onImage={readingMode ? undefined : image}
          onRevealDone={handleRevealDone}
          chapterNumber={chapter.chapter_number}
          mediaSlot={audioTrack ? <StoryAudioPlayer track={audioTrack} /> : undefined}
        />
        {audioTrack && <StoryAudioPlayer track={audioTrack} />}
      </div>

      {!readingMode && sceneRevealed && ((activeGame.state.clues || []).length > 0 || Object.keys(activeGame.state.npc_relations || {}).length > 0) && (
        <details className="story-intel-drawer">
          <summary>
            <span><Eye size={17} /> Досье хода</span>
            <small>{(activeGame.state.clues || []).length} улик · {Object.keys(activeGame.state.npc_relations || {}).length} связей</small>
          </summary>
          <div className="story-intel-body">
            {(activeGame.state.clues || []).length > 0 && (
              <section>
                <strong><Eye size={16} /> Улики не расходуются</strong>
                <p>Сошлись на конкретной детали в своём ходе: подходящая улика усилит внутреннюю проверку.</p>
                <div className="story-clue-actions">
                  {(activeGame.state.clues || []).slice(-3).map((clue) => (
                    <button key={clue} onClick={() => insertClue(clue)} type="button"><span>{clue}</span><small>{hasCustomChoice ? "Вставить в ход" : "Сохранена"}</small></button>
                  ))}
                </div>
              </section>
            )}
            {relevantRelations.length > 0 && (
              <section>
                <strong><HeartHandshake size={16} /> Персонажи помнят поступки</strong>
                <p>{relevantRelations.slice(0, 3).map((npc) => `${npc.name}${npc.role ? ` (${npc.role})` : ""}: доверие ${Number(npc.trust || 0)}, уважение ${Number(npc.respect || 0)}`).join(" · ")}</p>
              </section>
            )}
          </div>
        </details>
      )}

      {choices.length > 0 && (
        <div className={`${sceneRevealed ? "choice-list reveal-ready" : "choice-list reveal-waiting"} ${storyLeaving ? "story-leaving" : ""} ${readingMode ? "reading-choices" : ""}`}>
          {readingMode && <p className="reading-choice-label">Как продолжится твоя история?</p>}
          {choices.map((choice) => (
            <ChoiceCard key={choice.id} choice={choice} selected={selectedChoiceId === choice.id} disabled={busy || storyLeaving} onSelect={select} />
          ))}
        </div>
      )}

      {sceneRevealed && choices.length > 0 && (
        <div className={`voice-answer-control ${answerRecording ? "recording" : ""}`}>
          <button disabled={busy || storyLeaving || answerTranscribing} onClick={toggleVoiceAnswer} type="button" aria-pressed={answerRecording}>
            {answerRecording ? <Square size={17} /> : <Mic size={18} />}
            {answerRecording ? "Завершить запись" : answerTranscribing ? "Распознаю ход..." : "Ответить голосом"}
          </button>
          <small>{hasCustomChoice ? "Назовите номер варианта или продиктуйте свой ход" : "Назовите номер варианта"}</small>
        </div>
      )}

      {hasCustomChoice && showCustomInput && (
        <div className={`${sceneRevealed ? "custom-box reveal-ready" : "custom-box reveal-waiting"} ${storyLeaving ? "story-leaving" : ""}`}>
          <input ref={customInputRef} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Опишите свой ход..." />
          <button disabled={busy || custom.trim().length < 3} onClick={sendCustom} type="button" aria-label="Отправить свой ход">
            <Send size={18} />
          </button>
        </div>
      )}

      {!readingMode && sceneRevealed && (
        <div className="move-utility-row">
          <button className={selectedItem ? `secondary-button attached-item rarity-${selectedItem.rarity}` : "secondary-button"} onClick={() => setItemSheetOpen(true)} type="button">
            {selectedItem ? (
              <>
                <PackageOpen size={18} /> Используется: {selectedItem.title}
              </>
            ) : (
              <>
                <Plus size={18} /> Добавить предмет к ходу
              </>
            )}
          </button>
          <button className="secondary-button quiet" onClick={onInventory} type="button">
            <PackageOpen size={18} /> Инвентарь
          </button>
        </div>
      )}

      {confirmMoves && pendingMove && (
        <section ref={moveConfirmRef} className="move-confirm-panel reveal-ready">
          <span>Твой ход</span>
          <strong>«{pendingMove.text}»</strong>
          {selectedItem && (
            <p>
              Предмет: {selectedItem.title}. Он будет потрачен после подтверждения.
            </p>
          )}
          <div className="move-confirm-actions">
            <button className="primary-button" disabled={busy || storyLeaving} onClick={confirmMove} type="button">
              <Check size={18} /> Сделать ход
            </button>
            <button className="secondary-button" disabled={busy || storyLeaving} onClick={cancelPendingMove} type="button">
              <X size={18} /> Изменить
            </button>
          </div>
        </section>
      )}

      {!readingMode && <div className="game-actions">
        <button className="secondary-button" disabled={busy || imageBusy} onClick={image} type="button"><Image size={18} /> {imageBusy ? "Рисую..." : "Картинка"}</button>
        <button className="secondary-button" disabled={busy || voiceBusy} onClick={voice} type="button"><Mic size={18} /> {voiceBusy ? "Озвучиваю..." : "Озвучить"}</button>
      </div>}
      {itemSheetOpen && !readingMode && <ItemPickerSheet items={items} selectedKey={selectedItemKey} onSelect={setSelectedItemKey} onProtect={protectItem} onClose={() => setItemSheetOpen(false)} />}
      {dropItem && (
        <ModalPortal className="item-drop-backdrop" onClose={() => setDropItem(null)}>
          <section className={`item-drop-reveal rarity-${dropItem.rarity}`} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="item-drop-title" aria-describedby="item-drop-description">
            <div className="item-drop-runes" aria-hidden="true"><Sparkles size={24} /><Sparkles size={18} /><Sparkles size={30} /></div>
            <span className="eyebrow">Редкая находка</span>
            <div className="item-drop-art-wrap"><span className="item-art item-drop-art" style={itemSpriteStyle(dropItem)} /></div>
            <span className={`rarity-chip rarity-${dropItem.rarity}`}>{dropItem.rarity_label}</span>
            <h2 id="item-drop-title">{dropItem.title}</h2>
            <p id="item-drop-description">{dropItem.description}</p>
            <small>{dropItem.helps}</small>
            <div className="item-drop-actions">
              <button className="primary-button" onClick={() => setDropItem(null)} type="button"><Sparkles size={18} /> Продолжить</button>
              <button className="secondary-button" onClick={() => { setDropItem(null); onInventory(); }} type="button"><PackageOpen size={18} /> В инвентарь</button>
            </div>
          </section>
        </ModalPortal>
      )}
    </section>
  );
}
