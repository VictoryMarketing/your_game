import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createInvoice, getPaymentStatus, getProducts } from "../api/shopApi";
import type { Product, Profile } from "../api/types";
import { ShopProductCard } from "../components/ShopProductCard";
import { getTelegram, notify } from "../telegram/telegram";

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

export function ShopScreen({ profile, onPaid }: { profile?: Profile; onPaid?: () => void }) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<ShopTab>("premium");
  const [busyCode, setBusyCode] = useState("");
  const [message, setMessage] = useState("");
  const visibleProducts = products.filter((product) => inferCategory(product) === tab);
  const imageBalance = (profile?.image_credits || 0) + (profile?.premium_image_remaining || 0);
  const voiceBalance = (profile?.voice_credits || 0) + (profile?.premium_voice_remaining || 0);

  useEffect(() => {
    getProducts().then((result) => setProducts(result.products)).catch(() => setMessage("Не удалось открыть магазин."));
  }, []);

  async function buy(code: string) {
    setBusyCode(code);
    setMessage("");
    try {
      const invoice = await createInvoice(code);
      async function pollPaymentStatus() {
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
            void pollPaymentStatus();
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

  return (
    <section className="screen-stack">
      <header className="image-hero story-map-hero">
        <span className="eyebrow">Магазин</span>
        <h1>{t("shop.title")}</h1>
        <p>{t("shop.subtitle")}</p>
      </header>
      {message && <p className="notice">{message}</p>}
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
      <nav className="shop-tabs" aria-label="Разделы магазина">
        {tabs.map((item) => (
          <button className={tab === item.key ? "active" : ""} key={item.key} onClick={() => setTab(item.key)} type="button">
            {t(item.labelKey)}
          </button>
        ))}
      </nav>
      <div className="product-list">
        {visibleProducts.length ? (
          visibleProducts.map((product) => (
            <ShopProductCard key={product.code} product={product} busy={busyCode === product.code} onBuy={buy} />
          ))
        ) : (
          <section className="panel compact-panel">
            <h2>Раздел скоро пополнится</h2>
            <p>Пакеты этой категории временно недоступны. Проверь другой раздел магазина.</p>
          </section>
        )}
      </div>
    </section>
  );
}
