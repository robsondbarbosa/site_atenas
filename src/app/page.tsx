import type { Metadata } from "next";
import StoreHome from "@/components/store-home";

export const metadata: Metadata = {
  title: "Atenas Fitness | Moda Fitness para ir além",
  description: "Roupas fitness e acessórios Atenas Fitness. Performance, conforto e presença em cada movimento. Até 6x sem juros e frete grátis acima de R$ 299.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <StoreHome />;
}
