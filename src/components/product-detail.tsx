"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart-context";
import { formatPrice, type StoreProduct } from "@/lib/catalog";

export default function ProductDetail({ product }: { product: StoreProduct }) {
  const { add } = useCart();
  const [activeImage, setActiveImage] = useState(product.image);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [postalCode, setPostalCode] = useState("");
  const [shipping, setShipping] = useState<{ feeCents: number; city: string; state: string; free: boolean } | null>(null);
  const [shippingError, setShippingError] = useState("");
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [zoom, setZoom] = useState(false);
  const gallery = useMemo(() => product.images?.length ? product.images : [product.image, product.image.replace("w=1200", "w=1100&sat=-18"), product.image.replace("w=1200", "w=1200&crop=entropy")], [product.image, product.images]);

  async function calculateShipping(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingShipping(true);
    setShippingError("");
    try {
      const postalCodeNormalized = postalCode.replace(/\D/g, "");
      if (postalCodeNormalized.length !== 8) throw new Error("Digite um CEP válido com 8 números.");
      const response = await fetch(`/api/shipping?postalCode=${postalCodeNormalized}&subtotalCents=${Math.round(product.price * 100)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível calcular o frete.");
      setShipping(result);
    } catch (error) {
      setShipping(null);
      setShippingError(error instanceof Error ? error.message : "Não foi possível calcular o frete.");
    } finally {
      setLoadingShipping(false);
    }
  }

  return <main className="product-page">
    <div className="breadcrumbs"><Link href="/">Início</Link><span>/</span><Link href={`/catalogo?categoria=${encodeURIComponent(product.category)}`}>{product.category}</Link><span>/</span><strong>{product.name}</strong></div>
    <div className="product-layout">
      <section className="product-gallery" aria-label="Galeria do produto"><div className="gallery-thumbnails">{gallery.map((image, index) => <button className={activeImage === image ? "active" : ""} key={`${image}-${index}`} onClick={() => setActiveImage(image)} aria-label={`Ver imagem ${index + 1}`}><Image src={image} alt="" width={100} height={130} unoptimized /></button>)}</div><button className={`product-main-image ${zoom ? "zoomed" : ""}`} onClick={() => setZoom((current) => !current)} aria-label="Ampliar foto do produto"><Image src={activeImage} alt={`${product.name}, roupa fitness Atenas Fitness`} width={960} height={1200} priority unoptimized /><span className="zoom-hint">{zoom ? "−" : "+"} AMPLIAR</span><span className="product-photo-index">0{gallery.indexOf(activeImage) + 1} / 0{gallery.length}</span></button><div className="gallery-caption"><span>ATENAS / STUDIO</span><span>PERFORMANCE · CONFORTO · PRESENÇA</span></div></section>
      <section className="product-info"><span className="eyebrow"><i /> {product.category.toUpperCase()} · {product.badge?.toUpperCase() ?? "COLEÇÃO ESSENCIAL"}</span><h1>{product.name}</h1><div className="product-rating"><span>★★★★★</span><strong>{product.rating}</strong><a href="#avaliacoes">({product.reviews} avaliações)</a></div><div className="product-detail-price"><strong>{formatPrice(product.price)}</strong>{product.compareAt && <del>{formatPrice(product.compareAt)}</del>}{product.compareAt && <span className="discount-pill">-{Math.round((1 - product.price / product.compareAt) * 100)}%</span>}<p>ou até 6x de {formatPrice(product.price / 6)} sem juros</p></div><div className="detail-divider" />
        <p className="product-description">{product.description}</p><div className="feature-tags"><span>◎ SECAGEM RÁPIDA</span><span>⌁ TOQUE SUAVE</span><span>↗ ALTA PERFORMANCE</span></div>
        <div className="selection-heading"><span>Cor: <strong>{selectedColor.name}</strong></span><div className="detail-color-swatches">{product.colors.map((color) => <button key={color.code} className={selectedColor.code === color.code ? "selected" : ""} style={{ "--swatch": color.hex } as React.CSSProperties} onClick={() => setSelectedColor(color)} aria-label={`Selecionar cor ${color.name}`} />)}</div></div>
        <div className="selection-heading size-heading"><span>Tamanho: <strong>{selectedSize || "Selecione"}</strong></span><button className="size-guide-trigger" onClick={() => setShowSizeGuide(true)}>GUIA DE MEDIDAS <span>↗</span></button></div><div className="size-options">{product.sizes.map((size) => <button key={size} className={selectedSize === size ? "selected" : ""} onClick={() => { setSelectedSize(size); setShippingError(""); }}>{size}</button>)}</div><p className="size-hint">⌁ Modelagem fiel ao tamanho. Na dúvida, escolha o maior.</p>
        <button className="button button-gold add-to-bag" onClick={() => selectedSize ? add(product, selectedSize, selectedColor) : setShippingError("Escolha um tamanho antes de adicionar à sacola.")}>ADICIONAR À SACOLA <span>↗</span></button>{shippingError.startsWith("Escolha") && <p className="size-hint error-text">{shippingError}</p>}
        <form className="shipping-form" onSubmit={calculateShipping}><label htmlFor="product-postal-code">Calcule o frete <span>ENTREGA EM TODO O BRASIL</span></label><div><span>⌖</span><input id="product-postal-code" value={postalCode} onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="00000-000" /><button type="submit" disabled={loadingShipping}>{loadingShipping ? "CALCULANDO" : "CALCULAR"}</button></div>{shippingError && !shippingError.startsWith("Escolha") && <small className="error-text">{shippingError}</small>}{shipping && <small className="shipping-result">{shipping.free ? "Frete grátis" : formatPrice(shipping.feeCents / 100)} · {shipping.city}, {shipping.state}</small>}<a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer">NÃO SEI MEU CEP <span>↗</span></a></form>
        <div className="product-assurances"><div><span>◈</span><p><strong>TROCA GRÁTIS</strong><small>até 30 dias após receber</small></p></div><div><span>⌑</span><p><strong>COMPRA SEGURA</strong><small>dados protegidos</small></p></div><div><span>↗</span><p><strong>ENVIO RÁPIDO</strong><small>rastreio em cada etapa</small></p></div></div>
        <details className="detail-accordion" open><summary>DESCRIÇÃO E TECNOLOGIA <span>−</span></summary><p>{product.description} Desenvolvida para oferecer liberdade de movimento e confiança em todos os níveis de treino. <b>Composição:</b> {product.fabric}. Lave com cores semelhantes em ciclo delicado.</p></details><details className="detail-accordion"><summary>MEDIDAS DA PEÇA <button onClick={(event) => { event.preventDefault(); setShowSizeGuide(true); }}>VER TABELA</button></summary><p>Consulte a tabela de medidas antes de escolher o tamanho.</p></details>
      </section>
    </div>
    <section className="product-story"><div><span className="eyebrow">MOVIMENTO SEM LIMITES</span><h2>Ritmo seu.<br /><em>Confiança nossa.</em></h2><p>Da primeira repetição ao último quilômetro, a Atenas acompanha você sem pedir licença para o movimento.</p></div><div className="product-story-image"><Image src={product.image} alt={`Detalhe do tecido e modelagem ${product.name}`} width={1000} height={700} unoptimized loading="lazy" /><span>ATENAS — MOVE WITH INTENT</span></div></section>
    <section className="section-container product-reviews" id="avaliacoes"><div className="section-heading"><div><span className="eyebrow">QUEM JÁ VESTIU</span><h2>Movimento <em>aprovado.</em></h2></div><div className="rating-overall"><strong>{product.rating}</strong><div><span>★★★★★</span><small>{product.reviews} avaliações</small></div></div></div><div className="reviews-grid"><article><div className="review-stars">★★★★★</div><p>“Veste muito bem e o tecido é incrível. Já quero outra cor.”</p><strong>Carolina S.</strong><small>COMPRA VERIFICADA</small></article><article><div className="review-stars">★★★★★</div><p>“Material de ótima qualidade e caimento perfeito. Recomendo.”</p><strong>Isabela M.</strong><small>COMPRA VERIFICADA</small></article><article><div className="review-stars">★★★★★</div><p>“Confortável do início ao fim do treino. Amei a experiência.”</p><strong>Julia A.</strong><small>COMPRA VERIFICADA</small></article></div></section>
    {showSizeGuide && <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSizeGuide(false); }}><section className="size-modal" role="dialog" aria-modal="true" aria-labelledby="size-guide-title"><button className="close-button" onClick={() => setShowSizeGuide(false)} aria-label="Fechar guia">×</button><span className="eyebrow">ESCOLHA COM CONFIANÇA</span><h2 id="size-guide-title">Guia de <em>medidas.</em></h2><p>Compare suas medidas com a tabela abaixo. Se ficar entre dois tamanhos, prefira o maior.</p><table><thead><tr><th>TAMANHO</th><th>CINTURA</th><th>QUADRIL</th><th>BUSTO</th></tr></thead><tbody><tr><th>P</th><td>64–70 cm</td><td>90–96 cm</td><td>82–88 cm</td></tr><tr><th>M</th><td>70–76 cm</td><td>96–102 cm</td><td>88–94 cm</td></tr><tr><th>G</th><td>76–84 cm</td><td>102–110 cm</td><td>94–102 cm</td></tr><tr><th>GG</th><td>84–92 cm</td><td>110–118 cm</td><td>102–110 cm</td></tr></tbody></table><small>Medidas corporais aproximadas. Pode haver variação de até 2 cm.</small></section></div>}
  </main>;
}
