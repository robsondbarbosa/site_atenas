import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoPaymentClient } from "@/lib/payments/mercado-pago";

function validSignature(signature: string | null, requestId: string | null, paymentId: string, secret: string) {
  if (!signature || !requestId) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=", 2) as [string, string]));
  const timestamp = Number(parts.ts);
  const received = parts.v1;
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp * 1000) > 5 * 60_000 || !received || !/^[a-f\d]{64}$/i.test(received)) return false;
  const expected = createHmac("sha256", secret).update(`id:${paymentId};request-id:${requestId};ts:${parts.ts};`).digest();
  const actual = Buffer.from(received, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function mapProviderStatus(status: string | undefined) {
  if (status === "approved") return "APPROVED" as const;
  if (status === "rejected") return "FAILED" as const;
  if (status === "cancelled") return "CANCELLED" as const;
  if (status === "refunded" || status === "charged_back") return "REFUNDED" as const;
  return "PENDING" as const;
}

/* Verifica a assinatura, consulta o pagamento canônico e aplica transições idempotentes ao pedido. */
export async function POST(request: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  let body: { action?: string; type?: string; data?: { id?: string | number } };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Payload inválido." }, { status: 400 }); }
  if (body.type !== "payment" && !body.action?.startsWith("payment.")) return NextResponse.json({ received: true });

  const paymentId = new URL(request.url).searchParams.get("data.id") ?? String(body.data?.id ?? "");
  const requestId = request.headers.get("x-request-id");
  if (!/^\d+$/.test(paymentId) || !validSignature(request.headers.get("x-signature"), requestId, paymentId, secret)) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });

  try {
    const payment = await getMercadoPagoPaymentClient().get({ id: paymentId });
    if (String(payment.id) !== paymentId || !payment.external_reference) return NextResponse.json({ error: "Pagamento sem pedido válido." }, { status: 400 });
    const orderId = payment.external_reference;
    const mappedStatus = mapProviderStatus(payment.status);
    const amountCents = Math.round(Number(payment.transaction_amount ?? 0) * 100);

    await prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findUnique({ where: { id: orderId } });
      if (!order || (order.providerPaymentId !== null && order.providerPaymentId !== paymentId) || Math.round(Number(order.total) * 100) !== amountCents || payment.currency_id !== "BRL") throw new Error("Pagamento não corresponde ao pedido.");
      await transaction.paymentEvent.create({ data: { providerRequestId: requestId!, providerPaymentId: paymentId, providerStatus: payment.status ?? "unknown", orderId } });

      const nextStatus = order.status === "REFUNDED" || (order.status === "APPROVED" && mappedStatus !== "REFUNDED") || (mappedStatus === "PENDING" && order.status !== "PENDING") ? order.status : mappedStatus;
      const releaseStock = (nextStatus === "FAILED" || nextStatus === "CANCELLED") && !order.stockReleasedAt;
      const reserveStock = nextStatus === "APPROVED" && Boolean(order.stockReleasedAt);
      const items = Array.isArray(order.items) ? order.items as { sku: string; quantity: number }[] : [];
      if (releaseStock) {
        for (const item of items) await transaction.productVariant.updateMany({ where: { sku: item.sku }, data: { stock: { increment: item.quantity } } });
      }
      if (reserveStock) {
        for (const item of items) {
          const reserved = await transaction.productVariant.updateMany({ where: { sku: item.sku, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
          if (reserved.count !== 1) throw new Error("Estoque insuficiente para aprovar o pagamento.");
        }
      }
      await transaction.order.update({ where: { id: order.id }, data: { providerPaymentId: paymentId, status: nextStatus, providerStatus: payment.status ?? "unknown", stockReleasedAt: reserveStock ? null : releaseStock ? new Date() : undefined } });
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ received: true, duplicate: true });
    const message = error instanceof Error ? error.message : "Falha ao processar webhook.";
    const status = message.includes("não corresponde") ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? message : "Falha ao processar o evento." }, { status });
  }
}
