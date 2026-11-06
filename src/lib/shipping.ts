export type ShippingQuote = { postalCode: string; street: string; neighborhood: string; city: string; state: string; feeCents: number; free: boolean };

export async function getShippingQuote(postalCode: string, subtotalCents: number): Promise<ShippingQuote> {
  const normalizedPostalCode = postalCode.replace(/\D/g, "");
  const response = await fetch(`https://viacep.com.br/ws/${normalizedPostalCode}/json/`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Não foi possível consultar o CEP.");
  const address = (await response.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
  if (address.erro || !address.localidade || !address.uf) throw new Error("CEP não encontrado.");
  const free = subtotalCents >= 29900;
  const regionalFee = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "PA", "PB", "PE", "PI", "RN", "RO", "RR", "SE", "TO"].includes(address.uf) ? 1990 : 1490;
  const configuredFee = Number(process.env.STANDARD_SHIPPING_CENTS || regionalFee);
  if (!Number.isSafeInteger(configuredFee) || configuredFee < 0) throw new Error("Valor de frete não configurado corretamente.");
  return { postalCode: normalizedPostalCode, street: address.logradouro ?? "", neighborhood: address.bairro ?? "", city: address.localidade, state: address.uf, feeCents: free ? 0 : configuredFee, free };
}
