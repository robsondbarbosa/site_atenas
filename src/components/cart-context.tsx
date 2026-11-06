"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/catalog";

export type CartLine = { slug: string; name: string; image: string; price: number; size: string; color: string; colorHex: string; quantity: number };
type CartContextValue = { items: CartLine[]; count: number; subtotal: number; isOpen: boolean; hydrated: boolean; open: () => void; close: () => void; add: (product: StoreProduct, size: string, color: { name: string; hex: string }) => void; remove: (slug: string, size: string, color: string) => void; setQuantity: (slug: string, size: string, color: string, quantity: number) => void };

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "atenas-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored && active) setItems(JSON.parse(stored) as CartLine[]);
      } catch {
        localStorage.removeItem(storageKey);
      }
      if (active) setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(storageKey, JSON.stringify(items));
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => {
    const updateLine = (slug: string, size: string, color: string, transform: (line: CartLine) => CartLine | null) => {
      setItems((current) => current.flatMap((line) => {
        if (line.slug !== slug || line.size !== size || line.color !== color) return [line];
        const updated = transform(line);
        return updated ? [updated] : [];
      }));
    };
    return {
      items,
      count: items.reduce((total, line) => total + line.quantity, 0),
      subtotal: items.reduce((total, line) => total + line.price * line.quantity, 0),
      isOpen,
      hydrated,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add: (product, size, color) => {
        setItems((current) => {
          const found = current.find((line) => line.slug === product.slug && line.size === size && line.color === color.name);
          if (found) return current.map((line) => line === found ? { ...line, quantity: Math.min(line.quantity + 1, 10) } : line);
          return [...current, { slug: product.slug, name: product.name, image: product.image, price: product.price, size, color: color.name, colorHex: color.hex, quantity: 1 }];
        });
        setIsOpen(true);
      },
      remove: (slug, size, color) => updateLine(slug, size, color, () => null),
      setQuantity: (slug, size, color, quantity) => updateLine(slug, size, color, (line) => quantity > 0 ? { ...line, quantity: Math.min(quantity, 10) } : null),
    };
  }, [hydrated, isOpen, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart deve ser usado dentro de CartProvider.");
  return context;
}
