import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getStoreProducts } from "@/lib/store-products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const baseUrl = process.env.APP_BASE_URL ?? "https://atenasfitness.com.br";
  const products = await getStoreProducts();
  return [
    { url: new URL("/", baseUrl).toString(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/catalogo", baseUrl).toString(), changeFrequency: "daily", priority: 0.8 },
    { url: new URL("/politica-de-privacidade", baseUrl).toString(), changeFrequency: "yearly", priority: 0.3 },
    ...products.map((product) => ({ url: new URL(`/produto/${product.slug}`, baseUrl).toString(), changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
