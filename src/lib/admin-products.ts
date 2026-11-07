import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const productSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  name: z.string().trim().min(2).max(120),
  category: z.enum(["Feminino", "Masculino", "Acessórios"]),
  price: z.number().finite().positive().max(1000000),
  compareAt: z.number().finite().positive().max(1000000).nullable(),
  description: z.string().trim().min(10).max(4000),
  fabric: z.string().trim().min(2).max(240),
  images: z.array(z.string().trim().url().or(z.string().trim().startsWith("/products/"))).min(1).max(8),
  badge: z.string().trim().max(40).nullable(),
  rating: z.number().finite().min(0).max(5),
  reviews: z.number().int().min(0).max(1000000),
  skuPrefix: z.string().trim().regex(/^[A-Z0-9]{2,8}(?:-[A-Z0-9]{2,8}){1,3}$/i),
  variants: z.array(z.object({
    size: z.string().trim().min(1).max(16),
    color: z.string().trim().min(2).max(40),
    colorCode: z.string().trim().regex(/^[A-Z0-9]{2,8}$/i),
    colorHex: z.string().trim().regex(/^#[0-9a-f]{6}$/i),
    stock: z.number().int().min(0).max(100000),
  })).min(1).max(100),
}).refine((product) => product.compareAt === null || product.compareAt >= product.price, {
  path: ["compareAt"],
  message: "O preço anterior precisa ser maior ou igual ao preço atual.",
});

export type ProductData = z.infer<typeof productSchema>;

function skuFor(product: ProductData, variant: ProductData["variants"][number]) {
  return `${product.skuPrefix}-${variant.colorCode}-${variant.size}`.toUpperCase();
}

export async function saveProduct(input: ProductData, id?: string) {
  const skus = input.variants.map((variant) => skuFor(input, variant));
  if (new Set(skus).size !== skus.length) {
    throw new Error("Cada combinação de cor e tamanho precisa gerar um SKU único.");
  }

  const existingSkus = await prisma.productVariant.findMany({ where: { sku: { in: skus } }, select: { sku: true, productId: true } });
  if (existingSkus.some((variant) => variant.productId !== id)) {
    throw new Error("Um ou mais SKUs já pertencem a outro produto.");
  }

  return prisma.$transaction(async (transaction) => {
    const values = {
      slug: input.slug,
      name: input.name,
      category: input.category,
      price: new Prisma.Decimal(input.price.toFixed(2)),
      compareAt: input.compareAt === null ? null : new Prisma.Decimal(input.compareAt.toFixed(2)),
      description: input.description,
      fabric: input.fabric,
      imageUrl: input.images[0],
      images: input.images,
      badge: input.badge || null,
      rating: new Prisma.Decimal(input.rating.toFixed(1)),
      reviews: input.reviews,
      skuPrefix: input.skuPrefix.toUpperCase(),
      active: true,
    };
    const product = id
      ? await transaction.product.update({ where: { id }, data: values })
      : await transaction.product.create({ data: values });

    await transaction.productVariant.updateMany({ where: { productId: product.id }, data: { active: false } });
    for (let index = 0; index < input.variants.length; index += 1) {
      const variant = input.variants[index];
      const sku = skus[index];
      await transaction.productVariant.upsert({
        where: { sku },
        create: { sku, size: variant.size, color: variant.color, colorCode: variant.colorCode.toUpperCase(), colorHex: variant.colorHex, stock: variant.stock, productId: product.id, active: true },
        update: { size: variant.size, color: variant.color, colorCode: variant.colorCode.toUpperCase(), colorHex: variant.colorHex, stock: variant.stock, productId: product.id, active: true },
      });
    }
    return product;
  });
}

export function productErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { message: "O slug ou SKU já está cadastrado.", status: 409 };
  }
  if (error instanceof Error && error.message.includes("SKU")) {
    return { message: error.message, status: 409 };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return { message: "Produto não encontrado.", status: 404 };
  }
  return { message: "Não foi possível salvar o produto.", status: 500 };
}
