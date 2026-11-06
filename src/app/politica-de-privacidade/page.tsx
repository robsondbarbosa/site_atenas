import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Saiba como a Atenas Fitness utiliza e protege seus dados pessoais.",
};

export default function PrivacyPolicyPage() {
  return <main className="section-container" style={{ paddingTop: 64, paddingBottom: 80 }}>
    <Link href="/" className="text-link">← VOLTAR À LOJA</Link>
    <span className="eyebrow" style={{ display: "flex", marginTop: 36 }}>ATENAS FITNESS · PRIVACIDADE</span>
    <h1 style={{ maxWidth: 760, margin: "12px 0 18px", fontSize: "clamp(38px, 6vw, 68px)", letterSpacing: "-.06em" }}>Política de <em>privacidade.</em></h1>
    <p style={{ maxWidth: 760, color: "var(--muted)", lineHeight: 1.8 }}>Esta página explica quais dados são usados para atender pedidos na loja e como você pode solicitar informações ou exercer seus direitos de privacidade.</p>
    <div style={{ maxWidth: 760, display: "grid", gap: 24, marginTop: 42, lineHeight: 1.8 }}>
      <section><h2>Dados utilizados</h2><p>Para concluir uma compra, podemos utilizar nome, e-mail, CPF, CEP, número e endereço de entrega, itens do pedido e informações necessárias para acompanhar o pagamento e a entrega. O carrinho e o cupom escolhido podem ser guardados no armazenamento local do seu navegador.</p></section>
      <section><h2>Pagamentos e compartilhamento</h2><p>Os pagamentos são processados pelo Mercado Pago. Os dados de cartão são tokenizados pelo formulário seguro do provedor e não são enviados ao servidor da loja. Informações necessárias à cobrança, como CPF e dados do pedido, são transmitidas ao provedor de pagamentos. O CEP também pode ser consultado para obter dados de endereço e estimar o frete.</p></section>
      <section><h2>Finalidades e proteção</h2><p>Utilizamos os dados para processar pagamentos, separar e entregar pedidos, prestar atendimento, prevenir operações indevidas e cumprir obrigações legais. Aplicamos controles técnicos e de acesso compatíveis com essas finalidades; nenhum serviço conectado à internet pode garantir risco zero.</p></section>
      <section><h2>Retenção e seus direitos</h2><p>Os dados são mantidos pelo período necessário para atender às finalidades da compra e às obrigações legais aplicáveis. Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção ou outras providências cabíveis pelo e-mail <a href="mailto:oi@atenasfitness.com.br">oi@atenasfitness.com.br</a>.</p></section>
      <section><h2>Atualizações</h2><p>Esta política pode ser atualizada quando os serviços ou práticas de tratamento mudarem. Antes de iniciar as vendas, a loja deve completar esta política com a identificação legal do controlador e os detalhes definitivos de fornecedores, retenção e atendimento.</p></section>
    </div>
  </main>;
}
