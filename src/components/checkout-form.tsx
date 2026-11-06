"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import Image from "next/image";
import type { ICardPaymentBrickPayer, ICardPaymentFormData } from "@mercadopago/sdk-react/esm/bricks/cardPayment/type";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart-context";
import { formatPrice } from "@/lib/catalog";

type PaymentInfo = { qrCode: string | null; qrCodeBase64: string | null; boletoUrl: string | null; digitableLine: string | null; expiresAt: string | null };
type PaymentResult = { orderId: string; status: string; paymentInfo: PaymentInfo };
type CouponValidation = { code: string; discountCents: number; discountPercent: number };

async function validateCoupon(code: string, subtotal: number): Promise<CouponValidation> {
  const response = await fetch(`/api/coupons?code=${encodeURIComponent(code)}&subtotalCents=${Math.round(subtotal * 100)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Cupom inválido.");
  return data as CouponValidation;
}

export default function CheckoutForm() {
  const { items, subtotal, setQuantity, remove, hydrated } = useCart();
  const [method, setMethod] = useState<"pix" | "card" | "boleto">("pix");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponToValidate, setCouponToValidate] = useState("");
  const [checkoutKey, setCheckoutKey] = useState("");
  const [discountCents, setDiscountCents] = useState(0);
  const [shippingCents, setShippingCents] = useState(0);
  const [shippingLabel, setShippingLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
  const hasHydratedCart = useRef(false);
  const total = subtotal - discountCents / 100 + shippingCents / 100;

  useEffect(() => {
    if (publicKey) initMercadoPago(publicKey, { locale: "pt-BR" });
    let active = true;
    queueMicrotask(() => {
      const storedKey = sessionStorage.getItem("atenas-checkout-key");
      const key = storedKey ?? crypto.randomUUID();
      sessionStorage.setItem("atenas-checkout-key", key);
      const savedCoupon = localStorage.getItem("atenas-coupon");
      if (active) {
        setCheckoutKey(key);
        if (savedCoupon) {
          setCouponCode(savedCoupon);
          setCouponToValidate(savedCoupon);
        }
      }
    });
    return () => { active = false; };
  }, [publicKey]);

  useEffect(() => {
    if (!couponToValidate || !hydrated || items.length === 0) return;
    let active = true;
    void validateCoupon(couponToValidate, subtotal).then((data) => {
      if (!active) return;
      setCouponCode(data.code);
      setDiscountCents(data.discountCents);
      localStorage.setItem("atenas-coupon", data.code);
      setNotice(`${data.discountPercent}% de desconto aplicado.`);
    }).catch((cause) => {
      if (!active) return;
      localStorage.removeItem("atenas-coupon");
      setCouponCode("");
      setCouponToValidate("");
      setDiscountCents(0);
      setNotice("");
      setError(cause instanceof Error ? cause.message : "Cupom inválido.");
    });
    return () => { active = false; };
  }, [couponToValidate, hydrated, items.length, subtotal]);

  useEffect(() => {
    if (!hydrated) return;
    if (!hasHydratedCart.current) {
      hasHydratedCart.current = true;
      return;
    }
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setDiscountCents(0);
      setShippingCents(0);
      setShippingLabel("");
      setCouponCode("");
      setCouponToValidate("");
      setNotice("");
      localStorage.removeItem("atenas-coupon");
    });
    return () => { active = false; };
  }, [hydrated, items]);

  const payer: ICardPaymentBrickPayer | undefined = useMemo(() => email ? {
    email,
    identification: { type: "CPF", number: cpf.replace(/\D/g, "") },
  } : undefined, [cpf, email]);

  const checkoutCanStart = Boolean(email && fullName.trim().split(/\s+/).length > 1 && cpf.replace(/\D/g, "").length === 11 && postalCode.replace(/\D/g, "").length === 8 && addressNumber.trim() && shippingLabel && checkoutKey && items.length);

  async function requestPayment(paymentMethodId?: string, card?: ICardPaymentFormData<ICardPaymentBrickPayer>) {
    if (!checkoutCanStart) {
      setError("Preencha seus dados e calcule o frete antes de continuar.");
      return;
    }
    setIsLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checkoutKey,
          email,
          fullName,
          cpf,
          postalCode,
          addressNumber,
          couponCode,
          method,
          items: items.map((item) => ({ slug: item.slug, size: item.size, color: item.color, quantity: item.quantity })),
          cardToken: card?.token,
          paymentMethodId: card?.payment_method_id ?? paymentMethodId,
          issuerId: card?.issuer_id,
          installments: card?.installments,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 && (data.code === "STOCK_CONFLICT" || data.code === "CHECKOUT_RETRY")) {
          const nextKey = crypto.randomUUID();
          sessionStorage.setItem("atenas-checkout-key", nextKey);
          setCheckoutKey(nextKey);
        }
        throw new Error(data.error ?? "Não foi possível iniciar o pagamento.");
      }
      if (data.status === "rejected" || data.status === "cancelled" || data.status === "failed") {
        const nextKey = crypto.randomUUID();
        sessionStorage.setItem("atenas-checkout-key", nextKey);
        setCheckoutKey(nextKey);
        setError("Pagamento recusado. Confira os dados do cartão ou tente outra forma de pagamento.");
        return;
      }
      setResult(data as PaymentResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o pagamento.");
    } finally {
      setIsLoading(false);
    }
  }

  async function applyCoupon() {
    setIsApplyingCoupon(true);
    setError("");
    setNotice("");
    try {
      const data = await validateCoupon(couponCode, subtotal);
      setCouponCode(data.code);
      setCouponToValidate("");
      setDiscountCents(data.discountCents);
      localStorage.setItem("atenas-coupon", data.code);
      setNotice(`${data.discountPercent}% de desconto aplicado.`);
      if (postalCode.replace(/\D/g, "").length === 8) {
        const shippingResponse = await fetch(`/api/shipping?postalCode=${postalCode.replace(/\D/g, "")}&subtotalCents=${Math.max(0, Math.round(subtotal * 100) - data.discountCents)}`);
        const shippingData = await shippingResponse.json();
        if (shippingResponse.ok) {
          setShippingCents(shippingData.feeCents);
          setShippingLabel(shippingData.free ? "Frete grátis" : formatPrice(shippingData.feeCents / 100));
        }
      }
    } catch (cause) {
      localStorage.removeItem("atenas-coupon");
      setCouponCode("");
      setCouponToValidate("");
      setDiscountCents(0);
      setError(cause instanceof Error ? cause.message : "Cupom inválido.");
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  async function getShipping(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPostalCode = postalCode.replace(/\D/g, "");
    if (normalizedPostalCode.length !== 8) {
      setError("Digite um CEP com 8 números.");
      return;
    }
    try {
      const response = await fetch(`/api/shipping?postalCode=${normalizedPostalCode}&subtotalCents=${Math.round((subtotal - discountCents / 100) * 100)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível calcular o frete.");
      setShippingCents(data.feeCents);
      setShippingLabel(data.free ? "Frete grátis" : formatPrice(data.feeCents / 100));
      setError("");
    } catch (cause) {
      setShippingCents(0);
      setShippingLabel("");
      setError(cause instanceof Error ? cause.message : "Não foi possível calcular o frete.");
    }
  }

  if (result) {
    return <section className="payment-result">
      <span className="eyebrow">PEDIDO {result.orderId.slice(-8).toUpperCase()}</span>
      <h1>{result.status === "approved" ? "Pagamento aprovado." : method === "pix" ? "Pix pronto para pagar." : method === "boleto" ? "Boleto gerado." : "Pagamento em análise."}</h1>
      {result.paymentInfo.qrCodeBase64 && <Image className="pix-qr" src={`data:image/png;base64,${result.paymentInfo.qrCodeBase64}`} alt="QR Code Pix para pagamento" width={256} height={256} unoptimized />}
      {result.paymentInfo.qrCode && <div className="copy-code"><label htmlFor="pix-code">Pix copia e cola</label><textarea id="pix-code" readOnly value={result.paymentInfo.qrCode} /><button onClick={() => navigator.clipboard.writeText(result.paymentInfo.qrCode ?? "")}>COPIAR CÓDIGO</button></div>}
      {result.paymentInfo.boletoUrl && <a className="button button-gold" href={result.paymentInfo.boletoUrl} target="_blank" rel="noreferrer">ABRIR BOLETO PDF ↗</a>}
      {result.paymentInfo.digitableLine && <p className="digitable-line"><strong>Linha digitável</strong><br />{result.paymentInfo.digitableLine}</p>}
      <p className="payment-pending-note">O status final do pedido é atualizado pelo webhook seguro do Mercado Pago.</p>
    </section>;
  }

  return <div className="checkout-layout">
    <section className="checkout-form-panel">
      <span className="eyebrow">FINALIZE COM SEGURANÇA</span>
      <h1>Seu próximo <em>movimento.</em></h1>
      <div className="checkout-step"><span>01</span><div><h2>Seus dados</h2><p>Usaremos estes dados para confirmar seu pedido.</p></div></div>
      <div className="form-field"><label htmlFor="checkout-email">E-mail</label><input id="checkout-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" /></div>
      <div className="form-field"><label htmlFor="checkout-name">Nome completo</label><input id="checkout-name" autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Seu nome e sobrenome" /></div>
      <div className="form-field"><label htmlFor="checkout-cpf">CPF</label><input id="checkout-cpf" inputMode="numeric" autoComplete="off" required value={cpf} onChange={(event) => setCpf(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="000.000.000-00" /></div>
      <form className="checkout-shipping" onSubmit={getShipping}>
        <label htmlFor="checkout-cep">CEP de entrega</label>
        <div><input id="checkout-cep" inputMode="numeric" autoComplete="postal-code" value={postalCode} onChange={(event) => { setPostalCode(event.target.value.replace(/\D/g, "").slice(0, 8)); setShippingLabel(""); setShippingCents(0); }} placeholder="00000-000" /><input aria-label="Número do endereço" required value={addressNumber} onChange={(event) => setAddressNumber(event.target.value)} placeholder="Nº" /><button type="submit">CALCULAR FRETE</button></div>
      </form>
      {shippingLabel && <p className="shipping-result">Entrega: {shippingLabel}</p>}

      <div className="checkout-step"><span>02</span><div><h2>Forma de pagamento</h2><p>Escolha a melhor forma para você.</p></div></div>
      <div className="payment-method-tabs">
        <button className={method === "pix" ? "active" : ""} onClick={() => setMethod("pix")}><span>◇</span>Pix<small>na hora</small></button>
        <button className={method === "card" ? "active" : ""} onClick={() => setMethod("card")}><span>▤</span>Cartão<small>até 6x, conforme emissor</small></button>
        <button className={method === "boleto" ? "active" : ""} onClick={() => setMethod("boleto")}><span>▤</span>Boleto<small>à vista</small></button>
      </div>
      <div className="coupon-inline"><label htmlFor="checkout-coupon">Cupom de desconto</label><div><input id="checkout-coupon" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponToValidate(""); setDiscountCents(0); localStorage.removeItem("atenas-coupon"); }} placeholder="ATENAS10" /><button type="button" disabled={isApplyingCoupon || !couponCode} onClick={() => void applyCoupon()}>{isApplyingCoupon ? "VALIDANDO..." : "APLICAR"}</button></div></div>
      {method === "card" ? publicKey ? <div className="mercadopago-brick"><CardPayment initialization={{ amount: total, payer }} locale="pt-BR" customization={{ paymentMethods: { maxInstallments: 6, minInstallments: 1 }, visual: { style: { theme: "default" } } }} onError={() => setError("Não foi possível carregar o formulário seguro do cartão.")} onSubmit={async (data) => { await requestPayment(undefined, data); }} /></div> : <div className="key-required-note">O checkout de cartão ficará disponível após configurar a chave pública do Mercado Pago.</div> : <button className="button button-gold checkout-pay" disabled={!checkoutCanStart || isLoading} onClick={() => void requestPayment()}>{isLoading ? "AGUARDE..." : method === "pix" ? "GERAR PIX E PAGAR" : "GERAR BOLETO"}<span>↗</span></button>}
      {notice && <p className="coupon-feedback" role="status">{notice}</p>}
      {error && <p className="error-text checkout-error" role="alert">{error}</p>}
      <p className="checkout-terms">Ao finalizar, você concorda com nossos termos de compra. Seus dados são transmitidos com segurança.</p>
      {method === "card" && publicKey && <p className="secure-note">Os dados do cartão são tokenizados pelo Mercado Pago e não passam pelo nosso servidor.</p>}
    </section>
    <aside className="checkout-summary">
      <span className="eyebrow">SUA SACOLA</span>
      <h2>Resumo <span>({items.reduce((count, item) => count + item.quantity, 0)})</span></h2>
      <div className="summary-items">{items.map((item) => <article key={`${item.slug}-${item.size}-${item.color}`}><div className="summary-image"><Image src={item.image} alt={item.name} width={100} height={100} unoptimized /><span>{item.quantity}</span></div><div className="summary-item-info"><strong>{item.name}</strong><small>{item.color} · {item.size}</small><div className="summary-item-controls"><button aria-label="Diminuir quantidade" onClick={() => setQuantity(item.slug, item.size, item.color, item.quantity - 1)}>−</button><span>{item.quantity}</span><button aria-label="Aumentar quantidade" onClick={() => setQuantity(item.slug, item.size, item.color, item.quantity + 1)}>+</button><button onClick={() => remove(item.slug, item.size, item.color)}>Remover</button></div></div><b>{formatPrice(item.price * item.quantity)}</b></article>)}</div>
      <div className="summary-total-lines"><div><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div><div><span>Desconto</span><span>-{formatPrice(discountCents / 100)}</span></div><div><span>Frete</span><span>{shippingLabel || "A calcular"}</span></div><div className="summary-total"><strong>Total</strong><strong>{formatPrice(total)}</strong></div><small>Parcelamento exibido pelo Mercado Pago.</small></div>
      <div className="checkout-guarantee"><span>◈</span><p><strong>Compra protegida</strong><small>Dados criptografados e pagamento processado com segurança.</small></p></div>
    </aside>
  </div>;
}
