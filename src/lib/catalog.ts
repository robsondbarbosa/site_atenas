export type StoreProduct = {
  slug: string;
  name: string;
  category: "Feminino" | "Masculino" | "Acessórios";
  price: number;
  compareAt?: number;
  description: string;
  fabric: string;
  image: string;
  images?: string[];
  badge?: string;
  rating: number;
  reviews: number;
  skuPrefix: string;
  colors: { name: string; code: string; hex: string }[];
  sizes: string[];
};

const trainingImage = "/products/look-runner.jpg";

export const products: StoreProduct[] = [
  {
    slug: "legging-seamless-atenas",
    name: "Legging Seamless Atenas",
    category: "Feminino",
    price: 189.9,
    compareAt: 229.9,
    description: "Sustentação na medida, cintura alta e tecnologia sem costura para acompanhar seu ritmo do aquecimento ao último movimento.",
    fabric: "88% poliamida, 12% elastano",
    image: "/products/look-sand.jpg",
    images: ["/products/look-sand.jpg", "/products/look-black.jpg", "/products/look-plum.jpg"],
    badge: "Mais vendido",
    rating: 4.9,
    reviews: 128,
    skuPrefix: "LEG-SEA",
    colors: [{ name: "Preto", code: "PRT", hex: "#191919" }, { name: "Oliva", code: "OLV", hex: "#73765d" }, { name: "Areia", code: "ARE", hex: "#c7b89c" }],
    sizes: ["P", "M", "G", "GG"],
  },
  {
    slug: "top-cross-strong",
    name: "Top Cross Strong",
    category: "Feminino",
    price: 119.9,
    description: "Alças cruzadas com suporte firme e tecido respirável, pensado para treinos de alta intensidade.",
    fabric: "90% poliamida, 10% elastano",
    image: "/products/look-white-front.jpg",
    images: ["/products/look-white-front.jpg", "/products/look-white-back.jpg"],
    rating: 4.8,
    reviews: 86,
    skuPrefix: "TOP-CRO",
    colors: [{ name: "Preto", code: "PRT", hex: "#191919" }, { name: "Vinho", code: "VIN", hex: "#70444b" }],
    sizes: ["P", "M", "G", "GG"],
  },
  {
    slug: "regata-dry-move",
    name: "Regata Dry Move",
    category: "Masculino",
    price: 99.9,
    description: "Leveza que acompanha cada repetição. Modelagem atlética e secagem rápida para o treino render mais.",
    fabric: "100% poliéster Dry-fit",
    image: "/products/look-runner.jpg",
    images: ["/products/look-runner.jpg"],
    badge: "Novo",
    rating: 4.7,
    reviews: 53,
    skuPrefix: "REG-DRY",
    colors: [{ name: "Preto", code: "PRT", hex: "#191919" }, { name: "Cinza", code: "CIN", hex: "#777777" }, { name: "Azul", code: "AZU", hex: "#445a70" }],
    sizes: ["P", "M", "G", "GG"],
  },
  {
    slug: "garrafa-flow-750",
    name: "Garrafa Flow 750ml",
    category: "Acessórios",
    price: 69.9,
    description: "Hidratação sempre por perto, com tampa segura e acabamento fosco resistente para levar da academia à rua.",
    fabric: "Aço inoxidável com parede dupla",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1200&q=85",
    rating: 4.9,
    reviews: 42,
    skuPrefix: "GAR-FLO",
    colors: [{ name: "Preto", code: "PRT", hex: "#191919" }, { name: "Areia", code: "ARE", hex: "#c7b89c" }],
    sizes: ["Único"],
  },
];

export function getSku(product: StoreProduct, size: string, color: string) {
  return `${product.skuPrefix}-${color}-${size}`.toUpperCase();
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export const bestSellers = products.slice(0, 3);
export const trainingImageUrl = trainingImage;
