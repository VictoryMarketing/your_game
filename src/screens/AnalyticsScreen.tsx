import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, CheckCircle2, CircleDollarSign, Cpu, Headphones, RefreshCw, UsersRound } from "lucide-react";
import {
  checkLlmProvider,
  getAnalyticsOverview,
  getJobCapacity,
  getLlmProviderStatus,
  switchLlmProvider,
  type AnalyticsOverview,
  type JobCapacity,
  type LlmProviderStatus,
} from "../api/analyticsApi";

const funnelLabels: Record<string, string> = {
  opened: "Открыли",
  onboarded: "Заполнили профиль",
  started_story: "Начали историю",
  reached_chapter_2: "Сделали выбор",
  finished_story: "Завершили историю",
  opened_shop: "Открыли магазин",
  created_payment: "Начали оплату",
  paid: "Оплатили",
};

const eventLabels: Record<string, string> = {
  home_view: "Главный экран",
  chapter_generated: "Созданные главы",
  game_start: "Новые истории",
  choice_select: "Выборы",
  shop_view: "Открытия магазина",
  inventory_view: "Открытия инвентаря",
  external_payment_success: "Успешные оплаты",
  generation_failed: "Ошибки генерации",
};

function number(value: number, digits = 0) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(value || 0);
}

function MiniBars({ data, valueKey }: { data: AnalyticsOverview["daily"]; valueKey: "active_users" | "new_users" | "chapters" }) {
  const max = Math.max(1, ...data.map((item) => item[valueKey]));
  return <div className="analytics-bars" aria-label="Динамика по дням">
    {data.map((item) => <i key={item.date} style={{ height: `${Math.max(5, item[valueKey] / max * 100)}%` }} title={`${item.date}: ${item[valueKey]}`} />)}
  </div>;
}

export function AnalyticsScreen() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [llm, setLlm] = useState<LlmProviderStatus | null>(null);
  const [capacity, setCapacity] = useState<JobCapacity | null>(null);
  const [llmBusy, setLlmBusy] = useState<"" | "openai" | "kimi">("");
  const [llmNotice, setLlmNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [overview, provider, jobs] = await Promise.all([getAnalyticsOverview(days), getLlmProviderStatus(), getJobCapacity()]);
      setData(overview);
      setLlm(provider);
      setCapacity(jobs);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось загрузить аналитику");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [days]);
  const maxFunnel = useMemo(() => Math.max(1, ...Object.values(data?.funnel || {})), [data]);

  async function checkProvider(provider: "openai" | "kimi") {
    setLlmBusy(provider);
    setLlmNotice("");
    try {
      const result = await checkLlmProvider(provider);
      setLlmNotice(`${provider === "kimi" ? "Kimi" : "OpenAI"} отвечает · ${result.latency_ms} мс`);
    } catch (requestError) {
      setLlmNotice(requestError instanceof Error ? requestError.message : "Проверка не пройдена");
    } finally {
      setLlmBusy("");
    }
  }

  async function activateProvider(provider: "openai" | "kimi") {
    setLlmBusy(provider);
    setLlmNotice("");
    try {
      const result = await switchLlmProvider(provider);
      setLlm(result);
      setLlmNotice(`${provider === "kimi" ? "Kimi" : "OpenAI"} включён для текстовых задач.`);
    } catch (requestError) {
      setLlmNotice(requestError instanceof Error ? requestError.message : "Не удалось переключить провайдера");
    } finally {
      setLlmBusy("");
    }
  }

  return <section className="screen-stack analytics-screen">
    <header className="analytics-hero">
      <div><span className="eyebrow">Панель владельца</span><h1>Пульс игры</h1><p>Воронка, удержание, истории и выручка в одном месте.</p></div>
      <Activity size={34} />
    </header>
    <div className="analytics-toolbar">
      <div className="segmented-control" aria-label="Период аналитики">
        {[7, 30, 90].map((period) => <button className={days === period ? "active" : ""} key={period} onClick={() => setDays(period)} type="button">{period} дней</button>)}
      </div>
      <button aria-label="Обновить" className="icon-button" disabled={loading} onClick={() => void load()} type="button"><RefreshCw className={loading ? "spin" : ""} size={19} /></button>
    </div>

    {error && <section className="panel error-panel"><strong>Аналитика недоступна</strong><p>{error}</p></section>}
    {loading && !data && <section className="panel analytics-loading"><RefreshCw className="spin" /><span>Собираем показатели...</span></section>}
    {data && <>
      {llm && <section className="panel llm-provider-panel">
        <div className="section-head"><div><span className="eyebrow">Генерация текста</span><h2>Активный ИИ</h2></div><span className={`llm-status ${llm.active_provider}`}><i />{llm.active_provider === "kimi" ? "Kimi" : "OpenAI"}</span></div>
        {llmNotice && <p className="llm-provider-notice" role="status">{llmNotice}</p>}
        <div className="llm-provider-grid">
          {(["openai", "kimi"] as const).map((provider) => {
            const info = llm.providers[provider];
            const active = llm.active_provider === provider;
            return <article className={active ? "active" : ""} key={provider}>
              <div><Cpu size={20} /><strong>{provider === "kimi" ? "Kimi" : "OpenAI"}</strong>{active && <CheckCircle2 size={17} />}</div>
              <p><b>Скрытая концепция:</b> {info.planner_model || info.first_model}</p>
              <p><b>Первая глава:</b> {info.first_chapter_model || info.first_model}</p>
              <p><b>Продолжения и проверки:</b> {info.routine_model}</p>
              <small>{info.configured ? "Ключ настроен" : "Ключ не настроен на сервере"}</small>
              {provider === "kimi" && info.key_count && <small>Ключей в пуле: {info.key_count}</small>}
              <div className="llm-provider-actions">
                <button className="secondary-button" disabled={Boolean(llmBusy) || !info.configured} onClick={() => void checkProvider(provider)} type="button">Проверить</button>
                <button className="primary-button" disabled={Boolean(llmBusy) || !info.configured || active} onClick={() => void activateProvider(provider)} type="button">{llmBusy === provider ? "Проверяем..." : active ? "Активен" : "Включить"}</button>
              </div>
            </article>;
          })}
        </div>
        <p className="llm-provider-note">Картинки, озвучка и распознавание голоса всегда остаются в OpenAI. {llm.routing?.kimi_to_openai_fallback ? "При перегрузке Kimi обычные истории продолжит OpenAI; истории 18+ остаются в Kimi-очереди." : "Автоматический fallback выключен."}</p>
        {capacity && <p className="llm-provider-note">Очередь: {capacity.queue.queued} ждут · {capacity.queue.running} выполняются · worker’ы {capacity.alive}/{capacity.configured.story + capacity.configured.media + capacity.configured.aux}.</p>}
      </section>}
      <section className="analytics-kpis">
        <article><UsersRound /><span>Активные</span><strong>{number(data.summary.active_users)}</strong><small>{number(data.summary.new_users)} новых</small></article>
        <article><Activity /><span>Возврат</span><strong>{number(data.summary.return_rate, 1)}%</strong><small>{number(data.summary.returning_users)} вернулись</small></article>
        <article><CircleDollarSign /><span>Выручка</span><strong>{number(data.summary.rub_revenue)} ₽</strong><small>{number(data.summary.stars_revenue)} Stars</small></article>
        <article><BookOpen /><span>Глубина</span><strong>{number(data.summary.average_chapters_per_started_story, 1)}</strong><small>глав на историю</small></article>
      </section>

      <section className="panel analytics-chart-card">
        <div className="section-head"><div><span className="eyebrow">Динамика</span><h2>Активность по дням</h2></div><strong>{number(data.summary.total_users)} всего</strong></div>
        <MiniBars data={data.daily} valueKey="active_users" />
        <div className="analytics-legend"><span><i className="active-dot" />активные</span><span>Telegram {data.summary.telegram_users}</span><span>Web {data.summary.web_users}</span></div>
      </section>

      <section className="panel analytics-funnel">
        <div className="section-head"><div><span className="eyebrow">Конверсия</span><h2>Продуктовая воронка</h2></div></div>
        {Object.entries(data.funnel).map(([key, value]) => <div className="funnel-row" key={key}>
          <span>{funnelLabels[key] || key}</span><div><i style={{ width: `${Math.max(2, value / maxFunnel * 100)}%` }} /></div><strong>{number(value)}</strong>
        </div>)}
      </section>

      <section className="analytics-split">
        <article className="panel analytics-retention"><span className="eyebrow">Удержание</span><h2>Возврат игроков</h2>
          <div><strong>{number(data.retention.d1?.rate || 0, 1)}%</strong><span>D1</span><small>{data.retention.d1?.retained || 0} из {data.retention.d1?.cohort || 0}</small></div>
          <div><strong>{number(data.retention.d7?.rate || 0, 1)}%</strong><span>D7</span><small>{data.retention.d7?.retained || 0} из {data.retention.d7?.cohort || 0}</small></div>
        </article>
        <article className="panel analytics-money"><span className="eyebrow">Платежи</span><h2>{number(data.summary.payers)} плательщиков</h2><strong>{number(data.summary.arppu_rub)} ₽</strong><small>ARPPU · {data.summary.paid_orders} оплат</small><p><Headphones size={16} /> {data.summary.open_support} открытых обращений</p></article>
      </section>

      <section className="panel analytics-list"><div className="section-head"><div><span className="eyebrow">Продажи</span><h2>Товары</h2></div></div>
        {data.products.length ? data.products.map((item) => <div key={`${item.product_code}:${item.currency}`}><span>{item.product_code}</span><strong>{item.orders} × · {number(item.revenue)} {item.currency === "RUB" ? "₽" : "Stars"}</strong></div>) : <p>Оплат за период нет.</p>}
      </section>

      <section className="panel analytics-list analytics-people"><div className="section-head"><div><span className="eyebrow">Контроль начислений</span><h2>Последние оплаты</h2></div></div>
        {data.recent_payments.length ? data.recent_payments.map((item) => <div key={item.id}><span><strong>{item.name || item.telegram_username || item.email || "Игрок"}</strong><small>{item.product_code} · {item.provider} · {new Date(item.paid_at).toLocaleString("ru-RU")}</small></span><strong>{item.currency === "RUB" ? `${item.amount_value || 0} ₽` : `${item.stars_amount} Stars`}</strong></div>) : <p>Оплат за период нет.</p>}
      </section>

      <section className="panel analytics-list analytics-people"><div className="section-head"><div><span className="eyebrow">Аудитория</span><h2>Активные игроки</h2></div></div>
        {data.active_players.slice(0, 12).map((item) => <div key={item.user_id}><span><strong>{item.name || item.telegram_username || item.email || item.user_id}</strong><small>{item.email ? "Web" : "Telegram"} · {item.active_days} дн. активности</small></span><strong>{item.chapters} глав</strong></div>)}
      </section>

      <section className="panel analytics-list"><div className="section-head"><div><span className="eyebrow">Контент</span><h2>Популярные жанры</h2></div></div>
        {data.genres.map((item) => <div key={item.genre}><span>{item.genre}</span><strong>{item.count}</strong></div>)}
      </section>

      <section className="panel analytics-list"><div className="section-head"><div><span className="eyebrow">События</span><h2>Частые действия</h2></div></div>
        {data.top_events.slice(0, 12).map((item) => <div key={item.event_name}><span>{eventLabels[item.event_name] || item.event_name}</span><strong>{item.count} · {item.users} чел.</strong></div>)}
      </section>
      <p className="analytics-updated">Обновлено {new Date(data.generated_at).toLocaleString("ru-RU")}</p>
    </>}
  </section>;
}
