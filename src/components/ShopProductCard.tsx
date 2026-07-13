import { Sparkles } from "lucide-react";
import type { Product } from "../api/types";

function productClass(code: string) {
  if (code.includes("image")) return "product-visual image-product";
  if (code.includes("voice")) return "product-visual voice-product";
  if (code.includes("premium")) return "product-visual premium-product";
  if (code.includes("artifact")) return "product-visual artifact-product";
  return "product-visual branch-product";
}

export function ShopProductCard({ product, busy, onBuy, webPrice = false }: { product: Product; busy?: boolean; onBuy: (code: string) => void; webPrice?: boolean }) {
  return (
    <article className="product-card">
      <div className={productClass(product.code)} data-meta={product.meta_label || ""} aria-hidden="true" />
      <div>
        <div className="product-title">
          <strong>{product.title}</strong>
          {product.badge && <span>{product.badge}</span>}
        </div>
        <p>{product.description}</p>
        {(product.code.includes("image") || product.code.includes("voice")) && <p className="muted">1 генерация = 1 кредит</p>}
      </div>
      <button className="price-button" disabled={busy} onClick={() => onBuy(product.code)} type="button">
        <Sparkles size={16} /> {webPrice ? `${product.rub || product.stars} ₽` : `${product.stars}⭐`}
      </button>
    </article>
  );
}
