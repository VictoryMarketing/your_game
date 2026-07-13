import { Bitcoin, Headphones, QrCode, RefreshCw, ShieldCheck, UserRound, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createInvoice, createWebPayment, getPaymentStatus, getProducts, getWebPaymentMethods, type WebPaymentMethod } from "../api/shopApi";
import { getWebAuthStatus } from "../api/profileApi";
import type { Product, Profile } from "../api/types";
import { ShopProductCard } from "../components/ShopProductCard";
import { getTelegram, isTelegram, notify } from "../telegram/telegram";

const PENDING_WEB_PAYMENT_KEY = "yougame_pending_web_payment";
const PAYMENT_TERMS_KEY = "yougame_payment_terms_accepted";
const SHOP_PRODUCTS_CACHE_KEY = "yougame_shop_products_v3";

function cachedProducts(): Product[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(SHOP_PRODUCTS_CACHE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

type ShopTab = "premium" | "images" | "voice" | "branches" | "artifacts";

const tabs: Array<{ key: ShopTab; labelKey: string }> = [
  { key: "premium", labelKey: "shop.tabs.premium" },
  { key: "images", labelKey: "shop.tabs.images" },
  { key: "voice", labelKey: "shop.tabs.voice" },
  { key: "branches", labelKey: "shop.tabs.branches" },
  { key: "artifacts", labelKey: "shop.tabs.artifacts" },
];

function inferCategory(product: Product): ShopTab {
  if (product.category) return product.category;
  if (product.code.includes("image")) return "images";
  if (product.code.includes("voice")) return "voice";
  if (product.code.includes("artifact")) return "artifacts";
  if (product.code.includes("branch") || product.code.includes("extra")) return "branches";
  return "premium";
}

export function ShopScreen({ profile, onPaid, onAccount, onSupport }: { profile?: Profile; onPaid?: () => void; onAccount?: () => void; onSupport?: () => void }) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>(cachedProducts);
  const [productsLoading, setProductsLoading] = useState(() => cachedProducts().length === 0);
  const [productsError, setProductsError] = useState(false);
  const [tab, setTab] = useState<ShopTab>("premium");
  const [busyCode, setBusyCode] = useState("");
  const [message, setMessage] = useState("");
  const [webMethods, setWebMethods] = useState<WebPaymentMethod[]>([]);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [webAuthenticated, setWebAuthenticated] = useState<boolean | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(() => localStorage.getItem(PAYMENT_TERMS_KEY) === "1");
  const visibleProducts = products.filter((product) => inferCategory(product) === tab);
  const imageBalance = (profile?.image_credits || 0) + (profile?.premium_image_remaining || 0);
  const voiceBalance = (profile?.voice_credits || 0) + (profile?.premium_voice_remaining || 0);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(false);
    try {
      const result = await getProducts();
      setProducts(result.products);
      sessionStorage.setItem(SHOP_PRODUCTS_CACHE_KEY, JSON.stringify(result.products));
    } catch {
      setProductsError(true);
      setMessage("Не удалось загрузить товары. Проверьте соединение и повторите.");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("shop_tab") as ShopTab | null;
    if (requestedTab && tabs.some((item) => item.key === requestedTab)) setTab(requestedTab);
    void loadProducts();
    if (!isTelegram()) {
      getWebPaymentMethods().then((result) => setWebMethods(result.methods)).catch(() => setWebMethods([]));
      getWebAuthStatus().then((result) => setWebAuthenticated(result.authenticated)).catch(() => setWebAuthenticated(false));
    }
  }, [loadProducts]);

  const pollPaymentStatus = useCallback(async (paymentId: string, attempts = 45) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => window.setTimeout(resolve, 2000));
      const current = await getPaymentStatus(paymentId);
      if (current.status === "paid") {
        localStorage.removeItem(PENDING_WEB_PAYMENT_KEY);
        setMessage("Оплата подтверждена. Покупка уже начислена.");
        notify("success");
        onPaid?.();
        return true;
      }
      if (current.status === "test_paid") {
        localStorage.removeItem(PENDING_WEB_PAYMENT_KEY);
        setMessage("Тестовая оплата ЮMoney подтверждена. Деньги не списаны, реальные кредиты не начислены.");
        notify("success");
        return true;
      }
      if (current.status === "failed") {
        localStorage.removeItem(PENDING_WEB_PAYMENT_KEY);
        setMessage("Платёж не завершён. Можно выбрать другой способ.");
        return false;
      }
    }
    setMessage("Ждём подтверждение платёжного сервиса. Статус обновится автоматически при следующем открытии магазина.");
    return false;
  }, [onPaid]);

  useEffect(() => {
    if (isTelegram()) return;
    const paymentId = localStorage.getItem(PENDING_WEB_PAYMENT_KEY);
    if (paymentId) void pollPaymentStatus(paymentId, 3);
  }, [pollPaymentStatus]);

  async function buy(code: string) {
    if (!termsAccepted) {
      setMessage("Перед оплатой подтвердите согласие с условиями покупки и политикой конфиденциальности.");
      document.querySelector(".checkout-consent")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!isTelegram()) {
      if (webAuthenticated === false) {
        setMessage("Сначала сохраните гостевой прогресс через email. Тогда покупка останется доступна на любом устройстве.");
        return;
      }
      const product = products.find((item) => item.code === code);
      if (product) {
        setPendingProduct(product);
        setAutoRenew(false);
      }
      return;
    }
    setBusyCode(code);
    setMessage("");
    try {
      const invoice = await createInvoice(code);
      async function pollTelegramPaymentStatus() {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
          const current = await getPaymentStatus(invoice.payment_id);
          if (current.status === "paid") {
            setMessage("✅ Оплата подтверждена. Доступ начислен.");
            notify("success");
            onPaid?.();
            return;
          }
        }
        setMessage("Оплата может обрабатываться чуть дольше. Баланс обновится после открытия профиля или дома.");
      }
      if (invoice.invoice_url && getTelegram()?.openInvoice) {
        getTelegram()?.openInvoice?.(invoice.invoice_url, (status) => {
          if (status === "paid") {
            setMessage("Проверяем начисление...");
            void pollTelegramPaymentStatus();
          } else if (status === "cancelled") {
            setMessage("Оплата отменена.");
          } else if (status === "failed") {
            setMessage("Оплата не прошла. Попробуйте ещё раз.");
            notify("error");
          }
        });
      } else if (invoice.invoice_url) {
        getTelegram()?.openLink?.(invoice.invoice_url) || window.open(invoice.invoice_url, "_blank");
      }
      setMessage("Открыл оплату Telegram Stars.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось создать инвойс.");
      notify("error");
    } finally {
      setBusyCode("");
    }
  }

  async function buyWeb(provider: WebPaymentMethod["code"]) {
    if (!pendingProduct) return;
    const paymentWindow = window.open("about:blank", "yourrulesgame_payment");
    if (paymentWindow) {
      paymentWindow.document.title = "Переход к безопасной оплате";
      paymentWindow.document.body.textContent = "Открываем защищённую страницу оплаты...";
    }
    setBusyCode(pendingProduct.code);
    setMessage("");
    setPaymentLink("");
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}?screen=shop&payment=return&shop_tab=${encodeURIComponent(tab)}`;
      const result = await createWebPayment(pendingProduct.code, provider, autoRenew, returnUrl);
      localStorage.setItem(PENDING_WEB_PAYMENT_KEY, result.payment_id);
      setPendingProduct(null);
      setMessage("Счёт открыт. После оплаты вернитесь в этот магазин, начисление произойдёт автоматически.");
      if (paymentWindow) {
        paymentWindow.opener = null;
        paymentWindow.location.replace(result.payment_url);
      } else {
        setPaymentLink(result.payment_url);
        setMessage("Браузер заблокировал новое окно. Нажмите «Открыть оплату» ниже.");
      }
      void pollPaymentStatus(result.payment_id);
    } catch (error) {
      paymentWindow?.close();
      setMessage(error instanceof Error ? error.message : "Не удалось открыть оплату.");
      notify("error");
    } finally {
      setBusyCode("");
    }
  }

  return (
    <section className="screen-stack">
      <header className="image-hero story-map-hero">
        <span className="eyebrow">Магазин</span>
        <h1>{t("shop.title")}</h1>
        <p>{t("shop.subtitle")}</p>
      </header>
      {message && <div className="notice shop-message"><span>{message}</span>{paymentLink && <a className="secondary-button" href={paymentLink} rel="noopener noreferrer" target="_blank"><QrCode size={17} /> Открыть оплату</a>}{!isTelegram() && webAuthenticated === false && onAccount && <button className="text-button" onClick={onAccount} type="button"><UserRound size={16} /> Сохранить прогресс</button>}</div>}
      <section className="panel shop-balance-panel">
        <div>
          <span>Premium</span>
          <strong>{profile?.premium_until ? "активен" : "нет"}</strong>
        </div>
        <div>
          <span>Картинки</span>
          <strong>{imageBalance}</strong>
        </div>
        <div>
          <span>Голос</span>
          <strong>{voiceBalance}</strong>
        </div>
        <div>
          <span>Ветки</span>
          <strong>{profile?.branch_tokens || 0}</strong>
        </div>
      </section>
      <label className={`checkout-consent ${termsAccepted ? "accepted" : ""}`}>
        <input
          checked={termsAccepted}
          onChange={(event) => {
            const checked = event.target.checked;
            setTermsAccepted(checked);
            if (checked) localStorage.setItem(PAYMENT_TERMS_KEY, "1");
            else localStorage.removeItem(PAYMENT_TERMS_KEY);
          }}
          type="checkbox"
        />
        <span>
          Я принимаю <a href="/terms.html" rel="noreferrer" target="_blank">условия покупки</a> и <a href="/privacy.html" rel="noreferrer" target="_blank">политику конфиденциальности</a>
        </span>
      </label>
      <nav className="shop-tabs" aria-label="Разделы магазина">
        {tabs.map((item) => (
          <button className={tab === item.key ? "active" : ""} key={item.key} onClick={() => setTab(item.key)} type="button">
            {t(item.labelKey)}
          </button>
        ))}
      </nav>
      <div className="product-list">
        {productsLoading && products.length === 0 ? (
          <div className="shop-loading-list" aria-label="Загружаем товары">
            {[0, 1, 2].map((item) => <div className="shop-product-skeleton" key={item}><i /><span /><span /></div>)}
          </div>
        ) : visibleProducts.length ? (
          visibleProducts.map((product) => (
            <ShopProductCard key={product.code} product={product} busy={busyCode === product.code} onBuy={buy} webPrice={!isTelegram()} />
          ))
        ) : productsError ? (
          <section className="panel compact-panel">
            <h2>Магазин не загрузился</h2>
            <p>Товары и цены не скрыты: сервер просто не ответил вовремя.</p>
            <button className="secondary-button" onClick={() => void loadProducts()} type="button"><RefreshCw size={17} /> Повторить</button>
          </section>
        ) : (
          <section className="panel compact-panel">
            <h2>Раздел скоро пополнится</h2>
            <p>Пакеты этой категории временно недоступны. Проверь другой раздел магазина.</p>
          </section>
        )}
      </div>
      <section className="panel shop-support-link">
        <div><strong>Вопрос об оплате или начислении?</strong><p>Обращение сохранится с номером, чтобы его можно было проверить.</p></div>
        <button className="secondary-button" onClick={onSupport} type="button"><Headphones size={17} /> Техподдержка</button>
      </section>
      {pendingProduct && (
        <div className="sheet-backdrop" onClick={() => setPendingProduct(null)}>
          <section className="select-sheet payment-method-sheet slide-up" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="section-head">
              <div><span className="eyebrow">Безопасная оплата</span><h2>{pendingProduct.title}</h2></div>
              <button className="icon-button" onClick={() => setPendingProduct(null)} type="button" aria-label="Закрыть"><X size={18} /></button>
            </div>
            <div className="web-checkout-total"><span>К оплате</span><strong>{pendingProduct.rub || pendingProduct.stars} ₽</strong></div>
            {pendingProduct.recurring_eligible && (
              <label className={`checkout-consent recurring-consent ${autoRenew ? "accepted" : ""}`}>
                <input checked={autoRenew} disabled={!webMethods.some((method) => method.recurring_available)} onChange={(event) => setAutoRenew(event.target.checked)} type="checkbox" />
                <span><strong>Автоматически продлевать Premium</strong><small>Повторное списание {pendingProduct.rub} ₽ через {pendingProduct.period_months || 1} мес. Можно отключить в профиле до следующего списания.</small></span>
              </label>
            )}
            {pendingProduct.recurring_eligible && !webMethods.some((method) => method.recurring_available) && <p className="muted">Автопродление появится после активации рекуррентных платежей ЮKassa. Разовая покупка уже доступна.</p>}
            <div className="payment-method-list">
              {webMethods.map((method) => (
                <button className="payment-method-button" disabled={!method.available || Boolean(busyCode) || (autoRenew && !method.recurring_available)} key={method.code} onClick={() => buyWeb(method.code)} type="button">
                  <span className="payment-method-icon">
                    {method.code === "yookassa_sbp" ? <QrCode size={23} /> : method.code.includes("yoomoney") ? <WalletCards size={23} /> : <Bitcoin size={23} />}
                  </span>
                  <span><strong>{method.title}</strong><small>{method.available ? method.description : "Подключение завершается владельцем проекта"}</small></span>
                </button>
              ))}
            </div>
            <p className="secure-payment-note"><ShieldCheck size={17} /> Доступ выдаётся сервером только после подтверждения платежа. Повторное уведомление не начислит покупку дважды.</p>
          </section>
        </div>
      )}
    </section>
  );
}
