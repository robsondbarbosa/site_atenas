"use client";

import { createVerdentAuth } from "@verdent/auth-js";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Variant = { id?: string; size: string; color: string; colorCode: string; colorHex: string; stock: number; active?: boolean };
type Product = {
  id: string;
  slug: string;
  name: string;
  category: "Feminino" | "Masculino" | "Acessórios";
  price: number;
  compareAt: number | null;
  description: string;
  fabric: string;
  imageUrl: string;
  images: string[];
  badge: string | null;
  rating: number;
  reviews: number;
  skuPrefix: string;
  active: boolean;
  variants: Variant[];
};
type ProductInput = Omit<Product, "id" | "active" | "imageUrl" | "variants"> & { variants: Variant[] };

const supabase = getSupabaseBrowserClient();
const emptyProduct: ProductInput = {
  slug: "",
  name: "",
  category: "Feminino",
  price: 0,
  compareAt: null,
  description: "",
  fabric: "",
  images: [],
  badge: null,
  rating: 5,
  reviews: 0,
  skuPrefix: "",
  variants: [{ size: "P", color: "Preto", colorCode: "PRT", colorHex: "#191919", stock: 0 }],
};

function getBearer(session: Session | null): Record<string, string> {
  return session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {};
}

export default function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductInput>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(supabase ? "" : "O login ainda não está configurado neste ambiente.");
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async (currentSession: Session) => {
    const response = await fetch("/api/admin/products", { headers: getBearer(currentSession), cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível verificar o acesso administrativo.");
    setProducts(result as Product[]);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        try {
          await loadProducts(data.session);
        } catch (cause) {
          if (active) setError(cause instanceof Error ? cause.message : "Acesso administrativo não autorizado.");
        }
      }
      if (active) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setError("");
      if (nextSession) {
        setLoading(true);
        void loadProducts(nextSession)
          .catch((cause) => setError(cause instanceof Error ? cause.message : "Acesso administrativo não autorizado."))
          .finally(() => setLoading(false));
      } else {
        setProducts([]);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProducts]);

  const auth = useMemo(() => supabase && createVerdentAuth({ supabase, oauth: { authorizeUrl: process.env.NEXT_PUBLIC_VERDENT_OAUTH_INITIATE_URL } }), []);

  function openLogin() {
    auth?.openSignInModal({
      initialView: "signIn",
      redirectTo: `${window.location.origin}/admin`,
      appName: "Atenas Fitness",
      locale: "pt",
    });
  }

  function updateField<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateVariant(index: number, key: keyof Variant, value: string | number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [key]: value } : variant),
    }));
  }

  function startNewProduct() {
    setForm(emptyProduct);
    setEditingId(null);
    setError("");
    setNotice("");
  }

  function startEditing(product: Product) {
    setForm({
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      compareAt: product.compareAt,
      description: product.description,
      fabric: product.fabric,
      images: product.images.length ? product.images : [product.imageUrl],
      badge: product.badge,
      rating: product.rating,
      reviews: product.reviews,
      skuPrefix: product.skuPrefix,
      variants: product.variants.filter((variant) => variant.active),
    });
    setEditingId(product.id);
    setError("");
    setNotice("");
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length || !supabase) return;
    setUploading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Entre novamente para enviar imagens.");
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Use imagens JPG, PNG ou WebP.");
        if (file.size > 5 * 1024 * 1024) throw new Error("Cada imagem deve ter no máximo 5 MB.");
        const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const { error: uploadError } = await supabase.storage.from("product-media").upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("product-media").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setForm((current) => ({ ...current, images: [...current.images, ...uploaded].slice(0, 8) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sua sessão expirou. Entre novamente.");
      const payload = { ...form, images: form.images, badge: form.badge?.trim() || null };
      const response = await fetch(editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { ...getBearer(data.session), "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar o produto.");
      await loadProducts(data.session);
      setNotice(editingId ? "Produto atualizado." : "Produto cadastrado.");
      startNewProduct();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(product: Product) {
    if (!supabase || !window.confirm(`Desativar ${product.name}?`)) return;
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE", headers: getBearer(data.session) });
      const result = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(result?.error ?? "Não foi possível desativar o produto.");
      if (data.session) await loadProducts(data.session);
      if (editingId === product.id) startNewProduct();
      setNotice("Produto desativado. O histórico e o estoque foram preservados.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível desativar o produto.");
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProducts([]);
  }

  if (loading) return <main className="admin-page"><p className="admin-status">Carregando painel…</p></main>;
  if (!session || error.startsWith("Acesso não autorizado")) return <main className="admin-page"><section className="admin-login"><span className="eyebrow">ATENAS FITNESS · ACESSO RESTRITO</span><h1>Painel <em>administrativo.</em></h1><p>Acesse com a conta autorizada para cadastrar produtos, imagens e estoque.</p>{error && <p className="admin-error" role="alert">{error}</p>}{session ? <button className="button button-dark" onClick={() => void signOut()}>SAIR DA CONTA</button> : <button className="button button-dark" onClick={openLogin} disabled={!auth}>ENTRAR COM MINHA CONTA <span>↗</span></button>}<small>Somente a conta administradora verificada tem acesso.</small></section></main>;

  return <main className="admin-page"><div className="admin-heading"><div><span className="eyebrow">ATENAS FITNESS · GESTÃO DA LOJA</span><h1>Painel <em>administrativo.</em></h1><p>Produtos, fotos e estoque em um só lugar.</p></div><button className="admin-secondary" onClick={() => void signOut()}>SAIR DA CONTA</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    <div className="admin-layout"><section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">CATÁLOGO</span><h2>{products.length} produtos</h2></div><button className="button button-dark" onClick={startNewProduct}>NOVO PRODUTO <span>＋</span></button></div>
      {products.length ? <div className="admin-product-list">{products.map((product) => <article className={`admin-product ${product.active ? "" : "inactive"}`} key={product.id}><Image src={product.images[0] ?? product.imageUrl} alt="" width={64} height={64} unoptimized /><div className="admin-product-info"><strong>{product.name}</strong><span>{product.slug}</span><small>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)} · {product.variants.filter((variant) => variant.active).length} variações · {product.active ? "Ativo" : "Inativo"}</small></div><div className="admin-product-actions"><button onClick={() => startEditing(product)}>EDITAR</button>{product.active && <button onClick={() => void deactivate(product)}>DESATIVAR</button>}</div></article>)}</div> : <p className="admin-empty">Nenhum produto no banco ainda. Cadastre o primeiro item ou sincronize o catálogo inicial.</p>}
    </section>
    <form className="admin-panel admin-form" onSubmit={save}><div className="admin-panel-heading"><div><span className="eyebrow">{editingId ? "EDIÇÃO" : "NOVO CADASTRO"}</span><h2>{editingId ? "Editar produto" : "Dados do produto"}</h2></div></div>
      <div className="admin-fields"><label>Nome<input required minLength={2} maxLength={120} value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label><label>Slug da página<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => updateField("slug", event.target.value)} placeholder="legging-seamless-atenas" /></label><label>Categoria<select value={form.category} onChange={(event) => updateField("category", event.target.value as ProductInput["category"])}><option>Feminino</option><option>Masculino</option><option>Acessórios</option></select></label><label>Preço (R$)<input required type="number" min="0.01" step="0.01" value={form.price || ""} onChange={(event) => updateField("price", Number(event.target.value))} /></label><label>Preço anterior (R$)<input type="number" min="0.01" step="0.01" value={form.compareAt ?? ""} onChange={(event) => updateField("compareAt", event.target.value ? Number(event.target.value) : null)} /></label><label>Etiqueta<input maxLength={40} value={form.badge ?? ""} onChange={(event) => updateField("badge", event.target.value || null)} placeholder="Mais vendido" /></label><label className="admin-field-wide">Descrição<textarea required minLength={10} maxLength={4000} rows={4} value={form.description} onChange={(event) => updateField("description", event.target.value)} /></label><label>Composição / tecido<input required value={form.fabric} onChange={(event) => updateField("fabric", event.target.value)} placeholder="88% poliamida, 12% elastano" /></label><label>Prefixo SKU<input required value={form.skuPrefix} onChange={(event) => updateField("skuPrefix", event.target.value.toUpperCase())} placeholder="LEG-SEA" /></label><label>Avaliação<input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(event) => updateField("rating", Number(event.target.value))} /></label><label>Número de avaliações<input type="number" min="0" step="1" value={form.reviews} onChange={(event) => updateField("reviews", Number(event.target.value))} /></label></div>
      <div className="admin-upload"><div><strong>Fotos do produto</strong><small>JPG, PNG ou WebP · até 5 MB por foto · máximo 8</small></div><label className="admin-upload-button">{uploading ? "ENVIANDO…" : "ENVIAR IMAGENS"}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || form.images.length >= 8} onChange={(event) => { void uploadImages(event.target.files); event.target.value = ""; }} /></label></div>
      <div className="admin-image-list">{form.images.map((image, index) => <div key={`${image}-${index}`}><Image src={image} alt={`Foto ${index + 1}`} width={80} height={80} unoptimized /><button type="button" aria-label={`Remover foto ${index + 1}`} onClick={() => updateField("images", form.images.filter((_, imageIndex) => imageIndex !== index))}>×</button></div>)}</div>
      <div className="admin-variants-heading"><div><strong>Variações e estoque</strong><small>SKU gerado automaticamente por cor e tamanho.</small></div><button type="button" className="admin-add-variant" onClick={() => updateField("variants", [...form.variants, { size: "M", color: "Preto", colorCode: "PRT", colorHex: "#191919", stock: 0 }])}>＋ ADICIONAR</button></div>
      <div className="admin-variants">{form.variants.map((variant, index) => <div className="admin-variant" key={index}><label>Tamanho<input required maxLength={16} value={variant.size} onChange={(event) => updateVariant(index, "size", event.target.value)} /></label><label>Cor<input required maxLength={40} value={variant.color} onChange={(event) => updateVariant(index, "color", event.target.value)} /></label><label>Código<input required maxLength={8} value={variant.colorCode} onChange={(event) => updateVariant(index, "colorCode", event.target.value.toUpperCase())} /></label><label>Hex<input required type="color" value={variant.colorHex} onChange={(event) => updateVariant(index, "colorHex", event.target.value)} /></label><label>Estoque<input required type="number" min="0" step="1" value={variant.stock} onChange={(event) => updateVariant(index, "stock", Number(event.target.value))} /></label><button type="button" aria-label="Remover variação" disabled={form.variants.length === 1} onClick={() => updateField("variants", form.variants.filter((_, variantIndex) => variantIndex !== index))}>×</button></div>)}</div>
      {error && <p className="admin-error" role="alert">{error}</p>}<div className="admin-form-actions"><button type="button" className="admin-secondary" onClick={startNewProduct}>LIMPAR</button><button className="button button-gold" type="submit" disabled={saving || uploading}>{saving ? "SALVANDO…" : editingId ? "SALVAR ALTERAÇÕES" : "CADASTRAR PRODUTO"}</button></div>
    </form></div>
  </main>;
}
