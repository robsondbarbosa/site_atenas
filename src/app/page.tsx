import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import StoreHome from "@/components/store-home";
import { getStoreProducts } from "@/lib/store-products";

export const metadata: Metadata = {
  title: "Atenas Fitness | Moda Fitness para ir além",
  description: "Roupas fitness e acessórios Atenas Fitness. Performance, conforto e presença em cada movimento. Até 6x sem juros e frete grátis acima de R$ 299.",
  alternates: { canonical: "/" },
};

async function HomeContent() {
  await connection();
  const products = await getStoreProducts();
  return <StoreHome products={products} />;
}

export default function Home() {
  return <Suspense fallback={<main className="section-container"><p>Carregando coleção...</p></main>}><HomeContent /></Suspense>;
}
