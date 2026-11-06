import "server-only";
import { MercadoPagoConfig, Payment } from "mercadopago";

export function getMercadoPagoPaymentClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Mercado Pago não está configurado.");
  return new Payment(new MercadoPagoConfig({ accessToken }));
}

export function getWebhookUrl() {
  const appBaseUrl = process.env.APP_BASE_URL;
  if (!appBaseUrl) throw new Error("APP_BASE_URL não está configurado.");
  return new URL("/api/webhooks/mercadopago", appBaseUrl).toString();
}
