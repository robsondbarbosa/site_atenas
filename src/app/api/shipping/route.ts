import { NextResponse } from "next/server";
import { getShippingQuote } from "@/lib/shipping";

export async function GET(request: Request) {
  const postalCode = new URL(request.url).searchParams.get("postalCode") ?? "";
  const subtotalCents = Number(new URL(request.url).searchParams.get("subtotalCents") ?? 0);
  if (!/^\d{5}-?\d{3}$/.test(postalCode) || !Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    return NextResponse.json({ error: "Informe um CEP válido." }, { status: 400 });
  }
  try {
    return NextResponse.json(await getShippingQuote(postalCode, subtotalCents));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao calcular o frete.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
