"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "@/components/cart-context";

export function SiteHeader() {
  const { count, isOpen, open, close, items, subtotal, remove, setQuantity } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponFeedback, setCouponFeedback] = useState("");

  async function applyCoupon() {
    try {
      const response = await fetch(`/api/coupons?code=${encodeURIComponent(couponCode)}&subtotalCents=${Math.round(subtotal * 100)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Cupom inválido.");
      localStorage.setItem("atenas-coupon", data.code);
      setCouponFeedback(`${data.discountPercent}% de desconto aplicado no checkout.`);
    } catch (error) {
      localStorage.removeItem("atenas-coupon");
      setCouponFeedback(error instanceof Error ? error.message : "Cupom inválido.");
    }
  }

  useEffect(() => {
    document.body.classList.toggle("cart-open", isOpen);
    return () => document.body.classList.remove("cart-open");
  }, [isOpen]);

  return (
    <>
      <div className="announcement">FRETE GRÁTIS ACIMA DE R$ 299 · 10% OFF NA PRIMEIRA COMPRA COM ATENAS10</div>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Atenas Fitness — início">
          <Image src="/atenas-logo.png" alt="Atenas Fitness — moda fitness e suplementos" width={2000} height={840} priority />
        </Link>
        <nav className="main-nav" aria-label="Navegação principal">
          <Link href="/catalogo?categoria=Feminino">Feminino</Link>
          <Link href="/catalogo?categoria=Masculino">Masculino</Link>
          <Link href="/catalogo?categoria=Acessórios">Acessórios</Link>
          <Link href="/#mais-vendidos">Mais vendidos</Link>
        </nav>
        <div className="header-actions">
          <Link href="/catalogo" className="icon-button search-link" aria-label="Buscar produtos"><span>⌕</span></Link>
          <button className="icon-button cart-button" onClick={open} aria-label={`Abrir carrinho, ${count} itens`}><span>Bag</span><i>{count}</i></button>
        </div>
      </header>
      <div className={`drawer-backdrop ${isOpen ? "visible" : ""}`} onClick={close} aria-hidden="true" />
      <aside className={`cart-drawer ${isOpen ? "visible" : ""}`} aria-label="Carrinho de compras" aria-modal={isOpen} role="dialog">
        <div className="drawer-heading"><div><span className="eyebrow">SUA SELEÇÃO</span><h2>Sacola <span>({count})</span></h2></div><button className="close-button" onClick={close} aria-label="Fechar sacola">×</button></div>
        <div className="drawer-items">
          {items.length === 0 ? <div className="empty-cart"><span className="empty-bag">○</span><h3>Sua sacola está esperando</h3><p>Encontre as peças que vão acompanhar seu próximo treino.</p><button className="button button-dark" onClick={close}>CONTINUAR COMPRANDO</button></div> : items.map((item) => <article className="drawer-item" key={`${item.slug}-${item.size}-${item.color}`}>
            <div className="drawer-image"><Image src={item.image} alt={item.name} width={108} height={132} unoptimized /></div>
            <div className="drawer-item-content"><div className="drawer-item-title"><div><strong>{item.name}</strong><p>{item.color} · {item.size}</p></div><button onClick={() => remove(item.slug, item.size, item.color)} aria-label={`Remover ${item.name}`}>×</button></div><div className="drawer-item-bottom"><div className="quantity-control"><button onClick={() => setQuantity(item.slug, item.size, item.color, item.quantity - 1)} aria-label="Diminuir quantidade">−</button><span>{item.quantity}</span><button onClick={() => setQuantity(item.slug, item.size, item.color, item.quantity + 1)} aria-label="Aumentar quantidade">+</button></div><strong>{formatPrice(item.price * item.quantity)}</strong></div></div>
          </article>)}
        </div>
        {items.length > 0 && <div className="drawer-footer"><label htmlFor="coupon">Código de desconto</label><div className="coupon-entry"><input id="coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Ex.: ATENAS10" /><button type="button" onClick={() => void applyCoupon()}>APLICAR</button></div>{couponFeedback && <p className="coupon-feedback" role="status">{couponFeedback}</p>}<div className="drawer-total"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><p className="drawer-shipping">Frete calculado na próxima etapa</p><Link className="button button-gold checkout-link" href="/checkout" onClick={close}>IR PARA O CHECKOUT <span>→</span></Link><p className="secure-note">⌑ Pagamento seguro · até 6x sem juros</p></div>}
      </aside>
    </>
  );
}

export function SiteFooter() {
  return <footer className="site-footer"><Link className="footer-logo" href="/">ATENAS<span>FITNESS</span></Link><p>Feita para você ir além.</p><div><Link href="/catalogo">Coleção</Link><Link href="/politica-de-privacidade">Privacidade</Link><a href="mailto:oi@atenasfitness.com.br">Fale com a gente</a></div><small>© Atenas Fitness. Todos os direitos reservados.</small></footer>;
}
