import type { Metadata } from "next";
import { Suspense } from "react";
import StoreCatalog from "@/components/store-catalog";

export const metadata: Metadata = { title: "Coleção fitness", description: "Explore a coleção Atenas Fitness: roupas fitness e acessórios para todos os movimentos." };

type CatalogPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function CatalogContent({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const category = typeof params.categoria === "string" ? params.categoria : "Todas";
  return <StoreCatalog initialCategory={category} />;
}

export default function CatalogPage(props: CatalogPageProps) {
  return <Suspense fallback={<main className="section-container"><p>Carregando coleção...</p></main>}><CatalogContent searchParams={props.searchParams} /></Suspense>;
}
