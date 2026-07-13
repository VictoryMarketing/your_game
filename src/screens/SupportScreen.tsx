import { Headphones, LoaderCircle, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { createSupportRecord, getSupportRecords, type SupportRecord } from "../api/supportApi";
import { SelectSheet } from "../components/SelectSheet";
import { notify } from "../telegram/telegram";

const topics = [
  ["billing", "Оплата или начисление"],
  ["game", "История или игровой процесс"],
  ["media", "Картинки или озвучка"],
  ["account", "Аккаунт и вход"],
  ["support", "Другой вопрос"],
] as const;

function formatDate(value: string) {
  const date = new Date(value.replace(" ", "T") + "Z");
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function SupportScreen() {
  const [topic, setTopic] = useState("billing");
  const [text, setText] = useState("");
  const [records, setRecords] = useState<SupportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<number | null>(null);

  useEffect(() => {
    getSupportRecords().then((result) => setRecords(result.records)).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function submit() {
    const message = text.trim();
    if (message.length < 10 || sending) return;
    setSending(true);
    try {
      const result = await createSupportRecord({ topic, text: message });
      setSentId(result.record_id);
      setText("");
      const refreshed = await getSupportRecords();
      setRecords(refreshed.records);
      notify("success");
    } catch {
      notify("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="screen-stack support-screen">
      <header className="support-hero">
        <Headphones size={29} />
        <div><span className="eyebrow">Помощь</span><h1>Техническая поддержка</h1><p>Опишите проблему. Обращение сохранится в аккаунте и получит номер.</p></div>
      </header>

      {sentId && <section className="panel support-success"><ShieldCheck size={22} /><div><strong>Обращение #{sentId} принято</strong><p>Мы получили сообщение. Для вопросов об оплате не отправляйте данные карты, пароль или коды из SMS.</p></div></section>}

      <section className="panel form-panel">
        <SelectSheet
          label="Тема обращения"
          value={topics.find(([key]) => key === topic)?.[1] || topics[0][1]}
          options={topics.map(([, label]) => label)}
          onChange={(label) => setTopic(topics.find(([, value]) => value === label)?.[0] || "support")}
        />
        <label className="field">
          <span>Что произошло</span>
          <textarea maxLength={2000} onChange={(event) => setText(event.target.value)} placeholder="Например: оплатил 20 озвучек, но баланс не изменился..." rows={6} value={text} />
          <small>{text.trim().length}/2000 · укажите примерное время и товар, если вопрос об оплате</small>
        </label>
        <button className="primary-button tall" disabled={sending || text.trim().length < 10} onClick={() => void submit()} type="button">
          {sending ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />} {sending ? "Отправляем..." : "Отправить обращение"}
        </button>
      </section>

      <section className="panel compact-panel">
        <div className="section-head"><h2>Мои обращения</h2><span>{records.length}</span></div>
        {loading ? <p>Загружаем историю...</p> : records.length ? <div className="support-records">{records.map((record) => (
          <article key={record.id}><div><strong>#{record.id} · {topics.find(([key]) => key === record.topic)?.[1] || "Вопрос"}</strong><span className={`support-status ${record.status}`}>{record.status === "open" ? "принято" : record.status}</span></div><p>{record.text}</p><small>{formatDate(record.created_at)}</small></article>
        ))}</div> : <p>Здесь появятся отправленные обращения.</p>}
      </section>
    </section>
  );
}
