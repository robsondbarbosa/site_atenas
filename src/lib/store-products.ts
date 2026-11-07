import "server-only";

import { prisma } from "@/lib/prisma";
import type { StoreProduct } from "@/lib/catalog";

function toStoreProduct(product: {
  slug: string;
  name: string;
  category: string;
  price: { toNumber(): number };
  compareAt: { toNumber(): number } | null;
  description: string;
  fabric: string;
  imageUrl: string;
  images: unknown;
  badge: string | null;
  rating: { toNumber(): number };
  reviews: number;
  skuPrefix: string;
  variants: { size: string; color: string; colorCode: string; colorHex: string; active: boolean }[];
}): StoreProduct {
  const variants = product.variants.filter((variant) => variant.active);
  const colorMap = new Map<string, { name: string; code: string; hex: string }>();
  for (const variant of variants) {
    if (!colorMap.has(variant.colorCode)) {
      colorMap.set(variant.colorCode, { name: variant.color, code: variant.colorCode, hex: variant.colorHex });
    }
  }
  const images = Array.isArray(product.images)
    ? product.images.filter((image): image is string => typeof image === "string")
    : [];

  return {
    slug: product.slug,
    name: product.name,
    category: product.category as StoreProduct["category"],
    price: product.price.toNumber(),
    compareAt: product.compareAt?.toNumber(),
    description: product.description,
    fabric: product.fabric,
    image: product.imageUrl,
    images,
    badge: product.badge ?? undefined,
    rating: product.rating.toNumber(),
    reviews: product.reviews,
    skuPrefix: product.skuPrefix,
    colors: [...colorMap.values()],
    sizes: [...new Set(variants.map((variant) => variant.size))],
  };
}

export async function getStoreProducts() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { variants: { where: { active: true }, orderBy: [{ colorCode: "asc" }, { size: "asc" }] } },
    orderBy: { createdAt: "asc" },
  });
  return products.map(toStoreProduct);
}

export async function getStoreProduct(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, active: true },
    include: { variants: { where: { active: true }, orderBy: [{ colorCode: "asc" }, { size: "asc" }] } },
  });
  return product ? toStoreProduct(product) : null;
}
