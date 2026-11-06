import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/product-detail";
import { products } from "@/lib/catalog";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) return { title: "Produto não encontrado" };
  return { title: product.name, description: `${product.description} Composição: ${product.fabric}.`, alternates: { canonical: `/produto/${product.slug}` }, openGraph: { title: `${product.name} | Atenas Fitness`, description: product.description, images: [product.image] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description, image: product.image, brand: { "@type": "Brand", name: "Atenas Fitness" }, offers: { "@type": "Offer", priceCurrency: "BRL", price: product.price.toFixed(2), availability: "https://schema.org/InStock", url: `/produto/${product.slug}` }, aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews } };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><ProductDetail product={product} /></>;
}
