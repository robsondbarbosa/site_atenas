import type { Metadata } from "next";
import Link from "next/link";
import CheckoutForm from "@/components/checkout-form";

export const metadata: Metadata = { title: "Checkout seguro", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return <main className="checkout-page"><div className="breadcrumbs"><Link href="/">Início</Link><span>/</span><strong>Checkout</strong></div><CheckoutForm /></main>;
}
