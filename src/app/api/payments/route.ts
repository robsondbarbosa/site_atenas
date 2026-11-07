import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoPaymentClient, getWebhookUrl } from "@/lib/payments/mercado-pago";
import { getShippingQuote } from "@/lib/shipping";

const checkoutSchema = z.object({
    checkoutKey: z.string().uuid(),
    email: z.string().trim().email().max(254),
  fullName: z.string().trim().min(3).max(120).refine((value) => value.trim().split(/\s+/).length > 1, "Informe seu nome e sobrenome."),
  addressNumber: z.string().trim().min(1).max(20),
  cpf: z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 11, "CPF inválido."),
  postalCode: z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 8, "CEP inválido."),
  couponCode: z.string().trim().toUpperCase().max(32).optional().default(""),
  method: z.enum(["pix", "card", "boleto"]),
  cardToken: z.string().min(8).max(500).optional(),
  paymentMethodId: z.string().max(80).optional(),
  issuerId: z.union([z.string(), z.number()]).optional(),
  installments: z.number().int().min(1).max(6).optional(),
  items: z.array(z.object({ slug: z.string().min(1).max(100), size: z.string().min(1).max(10), color: z.string().min(1).max(30), quantity: z.number().int().min(1).max(10) })).min(1).max(20),
}).superRefine((value, context) => {
  if (value.method === "card" && (!value.cardToken || !value.paymentMethodId)) context.addIssue({ code: "custom", message: "Os dados seguros do cartão estão incompletos." });
  const keys = value.items.map((item) => `${item.slug}|${item.size}|${item.color}`);
  if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", message: "Remova itens duplicados do carrinho." });
});

type ReservedLine = { variantId: string; sku: string; name: string; size: string; color: string; quantity: number; unitPriceCents: number };

function providerStatusToOrderStatus(status: string | undefined) {
  if (status === "approved") return "APPROVED" as const;
  if (status === "rejected") return "FAILED" as const;
  if (status === "cancelled") return "CANCELLED" as const;
  if (status === "refunded" || status === "charged_back") return "REFUNDED" as const;
  return "PENDING" as const;
}

/* Valida o checkout, recalcula o pedido no servidor e reserva estoque antes de chamar o provedor. */
export async function POST(request: Request) {
  let orderId: string | undefined;
  let providerPaymentId: string | undefined;
  let requestCheckoutKey: string | undefined;
  const reservedLines: ReservedLine[] = [];
  let providerPaymentInfo: Prisma.InputJsonValue | undefined;
  try {
    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados de pagamento inválidos." }, { status: 400 });
    const input = parsed.data;
    requestCheckoutKey = input.checkoutKey;
    const previousOrder = await prisma.order.findUnique({ where: { checkoutKey: input.checkoutKey } });
    if (previousOrder) {
      if (previousOrder.email !== input.email) return NextResponse.json({ error: "A chave do checkout já está associada a outro pedido." }, { status: 409 });
      if (!previousOrder.providerPaymentId) return NextResponse.json({ error: "O pedido anterior não foi concluído. Tente novamente.", code: "CHECKOUT_RETRY" }, { status: 409 });
      return NextResponse.json({ orderId: previousOrder.id, paymentId: previousOrder.providerPaymentId, status: previousOrder.providerStatus ?? "pending", paymentInfo: previousOrder.paymentInfo ?? {} }, { status: 200 });
    }

    for (const item of input.items) {
      const variant = await prisma.productVariant.findFirst({ where: { size: item.size, color: item.color, active: true, product: { slug: item.slug, active: true } }, include: { product: { select: { id: true, name: true, price: true } } } });
      if (!variant) return NextResponse.json({ error: `A variação selecionada não está disponível: ${item.size} · ${item.color}.` }, { status: 409 });
      reservedLines.push({ variantId: variant.id, sku: variant.sku, name: variant.product.name, size: variant.size, color: variant.color, quantity: item.quantity, unitPriceCents: Math.round(Number(variant.product.price) * 100) });
    }

    const subtotalCents = reservedLines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0);
    const coupon = input.couponCode ? await prisma.coupon.findFirst({ where: { code: input.couponCode, active: true } }) : null;
    if (input.couponCode && !coupon) return NextResponse.json({ error: "Cupom inválido ou expirado." }, { status: 400 });
    const discountCents = coupon ? Math.floor(subtotalCents * coupon.discountPercent / 100) : 0;
    const shippingQuote = await getShippingQuote(input.postalCode, subtotalCents - discountCents);
    const totalCents = subtotalCents - discountCents + shippingQuote.feeCents;

    const order = await prisma.$transaction(async (transaction) => {
      for (const line of reservedLines) {
        const changed = await transaction.productVariant.updateMany({ where: { id: line.variantId, stock: { gte: line.quantity } }, data: { stock: { decrement: line.quantity } } });
        if (changed.count !== 1) throw new Error(`Estoque indisponível para ${line.name} (${line.size}).`);
      }
      return transaction.order.create({ data: {
        checkoutKey: input.checkoutKey,
        email: input.email,
        postalCode: shippingQuote.postalCode,
        fullName: input.fullName,
        addressNumber: input.addressNumber,
        street: shippingQuote.street,
        neighborhood: shippingQuote.neighborhood,
        city: shippingQuote.city,
        state: shippingQuote.state,
        subtotal: new Prisma.Decimal(subtotalCents).div(100),
        discount: new Prisma.Decimal(discountCents).div(100),
        shipping: new Prisma.Decimal(shippingQuote.feeCents).div(100),
        total: new Prisma.Decimal(totalCents).div(100),
        couponCode: coupon?.code,
        paymentMethod: input.method,
        items: reservedLines.map((line) => ({ sku: line.sku, name: line.name, size: line.size, color: line.color, quantity: line.quantity, unitPriceCents: line.unitPriceCents })) as Prisma.InputJsonValue,
      } });
    });
    orderId = order.id;

    const paymentClient = getMercadoPagoPaymentClient();
    const expiry = new Date(Date.now() + (input.method === "pix" ? 30 : input.method === "boleto" ? 3 * 24 * 60 : 30) * 60_000).toISOString();
    const providerPayment = await paymentClient.create({ body: {
      transaction_amount: totalCents / 100,
      description: `Pedido Atenas Fitness ${order.id}`,
      external_reference: order.id,
      notification_url: getWebhookUrl(),
      date_of_expiration: input.method === "card" ? undefined : expiry,
      payment_method_id: input.method === "pix" ? "pix" : input.method === "boleto" ? "bolbradesco" : input.paymentMethodId,
      token: input.method === "card" ? input.cardToken : undefined,
      installments: input.method === "card" ? input.installments ?? 1 : undefined,
      issuer_id: input.method === "card" && input.issuerId ? Number(input.issuerId) : undefined,
      payer: { email: input.email, first_name: input.fullName.trim().split(/\s+/)[0], last_name: input.fullName.trim().split(/\s+/).slice(1).join(" "), identification: { type: "CPF", number: input.cpf }, address: { zip_code: input.postalCode, street_name: shippingQuote.street, street_number: input.addressNumber, neighborhood: shippingQuote.neighborhood, city: shippingQuote.city, federal_unit: shippingQuote.state } },
      metadata: { order_id: order.id },
    }, requestOptions: { idempotencyKey: input.checkoutKey } });

    if (!providerPayment.id) throw new Error("O provedor não retornou a identificação do pagamento.");
    providerPaymentId = String(providerPayment.id);
    const status = providerStatusToOrderStatus(providerPayment.status);
    const paymentInfo = {
      qrCode: providerPayment.point_of_interaction?.transaction_data?.qr_code ?? null,
      qrCodeBase64: providerPayment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
      boletoUrl: providerPayment.transaction_details?.external_resource_url ?? providerPayment.point_of_interaction?.transaction_data?.ticket_url ?? null,
      digitableLine: providerPayment.transaction_details?.digitable_line ?? providerPayment.transaction_details?.barcode?.content ?? null,
      expiresAt: providerPayment.date_of_expiration ?? expiry,
    };
    providerPaymentInfo = paymentInfo;
    await prisma.order.update({ where: { id: order.id }, data: { status, providerPaymentId, providerStatus: providerPayment.status ?? "pending", paymentInfo } });
    return NextResponse.json({ orderId: order.id, paymentId: providerPaymentId, status: providerPayment.status ?? "pending", paymentInfo }, { status: 201 });
  } catch (error) {
    if (orderId) {
      await prisma.$transaction(async (transaction) => {
        const order = await transaction.order.findUnique({ where: { id: orderId } });
        if (!order || order.providerPaymentId) return;
        if (providerPaymentId) {
          await transaction.order.update({ where: { id: order.id }, data: { providerPaymentId, providerStatus: "pending", paymentInfo: providerPaymentInfo } });
          return;
        }
        for (const line of reservedLines) await transaction.productVariant.update({ where: { id: line.variantId }, data: { stock: { increment: line.quantity } } });
        await transaction.order.update({ where: { id: order.id }, data: { status: "FAILED", providerStatus: "creation_failed", stockReleasedAt: new Date() } });
      }).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.";
    if (message.includes("Estoque indisponível")) return NextResponse.json({ error: message, code: "STOCK_CONFLICT" }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && requestCheckoutKey) {
      const existingOrder = await prisma.order.findUnique({ where: { checkoutKey: requestCheckoutKey } });
      if (existingOrder?.providerPaymentId) return NextResponse.json({ orderId: existingOrder.id, paymentId: existingOrder.providerPaymentId, status: existingOrder.providerStatus ?? "pending", paymentInfo: existingOrder.paymentInfo ?? {} }, { status: 200 });
      return NextResponse.json({ error: "O pedido anterior não foi concluído. Tente novamente.", code: "CHECKOUT_RETRY" }, { status: 409 });
    }
    const status = message.includes("não está configurado") ? 503 : 500;
    return NextResponse.json({ error: status === 500 ? "Não foi possível iniciar o pagamento. Tente novamente." : message }, { status });
  }
}
