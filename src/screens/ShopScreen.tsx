import { useEffect, useState } from "react";
import { createInvoice, getProducts } from "../api/shopApi";
import type { Product } from "../api/types";
import { ShopProductCard } from "../components/ShopProductCard";
import { notify } from "../telegram/telegram";

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
      await createInvoice(code);
      setMessage("Инвойс отправлен в чат Telegram. После оплаты баланс обновится автоматически.");
      notify("success");
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
