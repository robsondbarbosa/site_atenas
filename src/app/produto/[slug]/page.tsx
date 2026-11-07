import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProductDetail from "@/components/product-detail";
import { getStoreProduct } from "@/lib/store-products";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: `${product.description} Composição: ${product.fabric}.`,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: { title: `${product.name} | Atenas Fitness`, description: product.description, images: [product.image] },
  };
}

async function ProductContent({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images?.length ? product.images : product.image,
    brand: { "@type": "Brand", name: "Atenas Fitness" },
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: product.price.toFixed(2),
      availability: "https://schema.org/InStock",
      url: `/produto/${product.slug}`,
    },
    aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews },
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><ProductDetail product={product} /></>;
}

export default function ProductPage(props: ProductPageProps) {
  return <Suspense fallback={<main className="section-container"><p>Carregando produto...</p></main>}><ProductContent params={props.params} /></Suspense>;
}
