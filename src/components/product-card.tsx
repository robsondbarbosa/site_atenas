"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice, type StoreProduct } from "@/lib/catalog";
import { useCart } from "@/components/cart-context";

export function ProductCard({ product, index = 0 }: { product: StoreProduct; index?: number }) {
  const { add } = useCart();
  return <article className="product-card" style={{ "--card-index": index } as React.CSSProperties}>
    <Link className="product-photo" href={`/produto/${product.slug}`}>
      <Image src={product.image} alt={product.name} width={720} height={900} unoptimized loading="lazy" />
      {product.badge && <span className="product-badge">{product.badge}</span>}
      <span className="quick-view">VER PRODUTO <span>↗</span></span>
    </Link>
    <div className="product-card-info"><div className="product-card-heading"><Link href={`/produto/${product.slug}`}>{product.name}</Link><span>★ {product.rating}</span></div>
      <p className="product-category">{product.category} <span>·</span> {product.fabric.split(",")[0]}</p>
      <div className="product-price"><strong>{formatPrice(product.price)}</strong>{product.compareAt && <del>{formatPrice(product.compareAt)}</del>}{product.price >= 100 && <span>até 6x sem juros</span>}</div>
      <div className="product-swatches" aria-label={`Cores: ${product.colors.map((color) => color.name).join(", ")}`}>{product.colors.map((color) => <button key={color.code} style={{ background: color.hex }} aria-label={color.name} onClick={() => add(product, product.sizes[1] ?? product.sizes[0], color)} />)}</div>
    </div>
  </article>;
}
