import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { products } from "../src/lib/catalog";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  for (const product of products) {
    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: { name: product.name, description: product.description, fabric: product.fabric, category: product.category, imageUrl: product.image, images: product.images ?? [product.image], price: product.price, compareAt: product.compareAt ?? null, badge: product.badge ?? null, rating: product.rating, reviews: product.reviews, skuPrefix: product.skuPrefix, active: true },
      create: { slug: product.slug, name: product.name, description: product.description, fabric: product.fabric, category: product.category, imageUrl: product.image, images: product.images ?? [product.image], price: product.price, compareAt: product.compareAt ?? null, badge: product.badge ?? null, rating: product.rating, reviews: product.reviews, skuPrefix: product.skuPrefix },
    });
    for (const color of product.colors) {
      for (const size of product.sizes) {
        const sku = `${product.skuPrefix}-${color.code}-${size}`.toUpperCase();
        await prisma.productVariant.upsert({ where: { sku }, update: { size, color: color.name, colorCode: color.code, colorHex: color.hex, active: true, productId: savedProduct.id }, create: { sku, size, color: color.name, colorCode: color.code, colorHex: color.hex, productId: savedProduct.id, stock: 20 } });
      }
    }
  }
  await prisma.coupon.upsert({ where: { code: "ATENAS10" }, update: { discountPercent: 10, active: true }, create: { code: "ATENAS10", discountPercent: 10 } });
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
