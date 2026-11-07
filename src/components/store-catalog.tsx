"use client";

import { useMemo, useState } from "react";
import { type StoreProduct } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

const categories = ["Todas", "Feminino", "Masculino", "Acessórios"];

export default function StoreCatalog({ initialCategory, products }: { initialCategory: string; products: StoreProduct[] }) {
  const [category, setCategory] = useState(categories.includes(initialCategory) ? initialCategory : "Todas");
  const [size, setSize] = useState("Todos");
  const [color, setColor] = useState("Todas");
  const [fabric, setFabric] = useState("Todos");
  const [maxPrice, setMaxPrice] = useState("500");
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const matchedCategory = category === "Todas" || product.category === category;
      const matchedSize = size === "Todos" || product.sizes.includes(size);
      const matchedColor = color === "Todas" || product.colors.some((item) => item.name === color);
      const matchedFabric = fabric === "Todos" || product.fabric.toLowerCase().includes(fabric.toLowerCase());
      return matchedCategory && matchedSize && matchedColor && matchedFabric && product.price <= Number(maxPrice);
    });
    if (sort === "price-asc") result.sort((first, second) => first.price - second.price);
    if (sort === "price-desc") result.sort((first, second) => second.price - first.price);
    return result;
  }, [category, color, fabric, maxPrice, products, size, sort]);

  return <main className="catalog-page"><div className="catalog-hero"><span className="eyebrow">A COLEÇÃO ATENAS</span><h1>Encontre seu <em>movimento.</em></h1><p>Peças que acompanham a sua força, em cada treino.</p></div><div className="catalog-layout"><aside className="catalog-filters"><span className="eyebrow">FILTRE SUA BUSCA</span><label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Tamanho<select value={size} onChange={(event) => setSize(event.target.value)}>{["Todos", "P", "M", "G", "GG", "Único"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Cor<select value={color} onChange={(event) => setColor(event.target.value)}>{["Todas", "Preto", "Oliva", "Areia", "Vinho", "Cinza", "Azul"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Tecido<select value={fabric} onChange={(event) => setFabric(event.target.value)}>{["Todos", "poliamida", "Dry-fit", "Aço inoxidável"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Preço máximo<strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(maxPrice))}</strong><input type="range" min="50" max="500" step="10" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></label><button className="text-link clear-filters" onClick={() => { setCategory("Todas"); setSize("Todos"); setColor("Todas"); setFabric("Todos"); setMaxPrice("500"); }}>LIMPAR FILTROS</button></aside><div className="catalog-results"><div className="catalog-results-heading"><span>{filtered.length} produtos</span><select aria-label="Ordenar produtos" value={sort} onChange={(event) => setSort(event.target.value as "featured" | "price-asc" | "price-desc")}><option value="featured">Em destaque</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></div>{filtered.length ? <div className="product-grid">{filtered.map((product, index) => <ProductCard key={product.slug} product={product} index={index} />)}</div> : <div className="empty-results"><h2>Nenhuma peça por aqui ainda.</h2><p>Tente outros filtros para encontrar seu movimento.</p></div>}</div></div></main>;
}
