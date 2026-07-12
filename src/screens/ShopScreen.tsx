import { useEffect, useState } from "react";
import { createInvoice, getPaymentStatus, getProducts } from "../api/shopApi";
import type { Product } from "../api/types";
import { ShopProductCard } from "../components/ShopProductCard";
import { getTelegram, notify } from "../telegram/telegram";

export function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [busyCode, setBusyCode] = useState("");
  const [message, setMessage] = useState("");

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
        <h1>Кредиты и Premium</h1>
        <p>Голос и картинки расходуют по 1 кредиту. Premium снимает дневной лимит глав.</p>
      </header>
      {message && <p className="notice">{message}</p>}
      <section className="panel">
        <h2>Premium · Картинки · Голос · Редкие ветки</h2>
        <p>Выбирай пакет под стиль игры: читать без пауз, добавлять арт к главам или слушать сцены голосом.</p>
      </section>
      <div className="product-list">
        {products.map((product) => (
          <ShopProductCard key={product.code} product={product} busy={busyCode === product.code} onBuy={buy} />
        ))}
      </div>
    </section>
  );
}
