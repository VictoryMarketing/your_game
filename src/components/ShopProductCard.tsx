import { Sparkles } from "lucide-react";
import type { Product } from "../api/types";

export function ShopProductCard({ product, busy, onBuy }: { product: Product; busy?: boolean; onBuy: (code: string) => void }) {
  return (
    <article className="product-card">
      <div>
        <div className="product-title">
          <strong>{product.title}</strong>
          {product.badge && <span>{product.badge}</span>}
        </div>
        <p>{product.description}</p>
      </div>
      <button className="price-button" disabled={busy} onClick={() => onBuy(product.code)} type="button">
        <Sparkles size={16} /> {product.stars}⭐
      </button>
    </article>
  );
}
