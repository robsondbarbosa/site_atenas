import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { productErrorMessage, productSchema, saveProduct } from "@/lib/admin-products";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    if (!await verifyAdminRequest(request)) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de dados inválido." }, { status: 400 });
    }
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Confira os campos informados." }, { status: 400 });
    return NextResponse.json(await saveProduct(parsed.data, id));
  } catch (error) {
    const result = productErrorMessage(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    if (!await verifyAdminRequest(request)) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    const { id } = await context.params;
    await prisma.$transaction([
      prisma.productVariant.updateMany({ where: { productId: id }, data: { active: false } }),
      prisma.product.update({ where: { id }, data: { active: false } }),
    ]);
    return new Response(null, { status: 204 });
  } catch (error) {
    const result = productErrorMessage(error);
    return NextResponse.json({ error: result.message.replace("salvar", "desativar") }, { status: result.status });
  }
}
