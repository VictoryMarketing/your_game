import { ArrowRight, BadgePercent, Sparkles } from "lucide-react";
import type { Product } from "../api/types";

function productClass(code: string) {
  if (code.includes("image")) return "product-visual image-product";
  if (code.includes("voice")) return "product-visual voice-product";
  if (code.includes("premium")) return "product-visual premium-product";
  if (code.includes("artifact")) return "product-visual artifact-product";
  if (code.includes("chapter")) return "product-visual branch-product chapter-product";
  return "product-visual branch-product";
}

export function ShopProductCard({ product, busy, onBuy, webPrice = false }: { product: Product; busy?: boolean; onBuy: (code: string) => void; webPrice?: boolean }) {
  const currentPrice = webPrice ? (product.rub || product.stars) : product.stars;
  const regularPrice = webPrice ? product.regular_rub : product.regular_stars;
  const currency = webPrice ? "₽" : "⭐";
  const discounted = Boolean(product.discount_percent && regularPrice && regularPrice > currentPrice);

  return (
    <article className="product-card">
      <div className={productClass(product.code)} data-meta={product.meta_label || ""} aria-hidden="true" />
      <div className="product-card-copy">
        <div className="product-title">
          <strong>{product.title}</strong>
          {product.badge && <span>{product.badge}</span>}
        </div>
        <p>{product.description}</p>
        {(product.code.includes("image") || product.code.includes("voice")) && <p className="muted">1 генерация = 1 кредит</p>}
        {discounted && <p className="product-saving"><BadgePercent size={14} /> Экономия {product.discount_percent}% по акции</p>}
      </div>
      <button className="price-button product-buy-button" disabled={busy} onClick={() => onBuy(product.code)} type="button">
        <span className="buy-button-label"><Sparkles size={16} /> {busy ? "Открываем оплату" : "Купить"}</span>
        <span className="buy-button-price">
          {discounted && <del>{regularPrice} {currency}</del>}
          <strong>{currentPrice} {currency}</strong>
          <ArrowRight size={17} />
        </span>
      </button>
    </article>
  );
}
