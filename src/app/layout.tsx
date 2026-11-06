import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-context";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "https://atenasfitness.com.br"),
  title: { default: "Atenas Fitness | Moda fitness para ir além", template: "%s | Atenas Fitness" },
  description: "Vista seu propósito com Atenas Fitness. Roupas fitness e acessórios feitos para acompanhar seu ritmo.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Atenas Fitness", title: "Atenas Fitness | Moda fitness para ir além", description: "Performance que acompanha seu ritmo." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><CartProvider><SiteHeader />{children}<SiteFooter /></CartProvider></body></html>;
}
