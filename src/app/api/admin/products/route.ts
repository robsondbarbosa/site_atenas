import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { productErrorMessage, productSchema, saveProduct } from "@/lib/admin-products";

export async function GET(request: Request) {
  try {
    if (!await verifyAdminRequest(request)) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    const products = await prisma.product.findMany({
      include: { variants: { orderBy: [{ colorCode: "asc" }, { size: "asc" }] } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products.map((product) => ({
      ...product,
      price: product.price.toNumber(),
      compareAt: product.compareAt?.toNumber() ?? null,
      rating: product.rating.toNumber(),
    })));
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os produtos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!await verifyAdminRequest(request)) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de dados inválido." }, { status: 400 });
    }
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Confira os campos informados." }, { status: 400 });
    return NextResponse.json(await saveProduct(parsed.data), { status: 201 });
  } catch (error) {
    const result = productErrorMessage(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
