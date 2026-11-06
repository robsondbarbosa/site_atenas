import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({ code: z.string().trim().toUpperCase().min(1).max(32), subtotalCents: z.coerce.number().int().positive().max(10_000_000) });

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Cupom inválido." }, { status: 400 });
  const { code, subtotalCents } = parsed.data;
  const coupon = await prisma.coupon.findFirst({ where: { code, active: true } });
  if (!coupon) return NextResponse.json({ error: "Cupom inválido ou expirado." }, { status: 404 });
  return NextResponse.json({ code, discountPercent: coupon.discountPercent, discountCents: Math.floor(subtotalCents * coupon.discountPercent / 100) });
}
