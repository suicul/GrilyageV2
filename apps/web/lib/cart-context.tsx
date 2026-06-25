'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DeliveryMode, FREE_DELIVERY_THRESHOLD_KOPECKS, getDeliveryCost } from '@grilyage/shared';

const CART_KEY = 'grilyazh-cart';

export type CartItem = {
  category: string;
  name: string;
  price: number;
  weight: string;
  kcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  desc?: string;
  image: string;
  isNew?: boolean;
  slug?: string;
  qty: number;
};

export type CartItemInput = {
  category: string;
  name: string;
  price: number;
  weight: string;
  image: string;
  kcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  desc?: string;
  isNew?: boolean;
  slug?: string;
};

type CartContextType = {
  cart: CartItem[];
  cartQty: number;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (item: CartItemInput) => void;
  changeQty: (name: string, delta: number) => void;
  removeItem: (name: string) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart-updated'));
  }, [cart, mounted]);

  const addToCart = useCallback((item: CartItemInput) => {
    setCart((prev) => {
      const idx = prev.findIndex((p) => p.slug === item.slug);
      if (idx >= 0) {
        const next = [...prev];
        const existing = next[idx]!;
        next[idx] = { ...existing, qty: existing.qty + 1 } as CartItem;
        return next;
      }
      return [...prev, { ...item, qty: 1 } as CartItem];
    });
  }, []);

  const changeQty = useCallback((name: string, delta: number) => {
    setCart((prev) => {
      const next = prev
        .map((item) => {
          if (item.name !== name) return item;
          const qty = item.qty + delta;
          return qty <= 0 ? null : { ...item, qty } as CartItem;
        })
        .filter(Boolean) as CartItem[];
      return next;
    });
  }, []);

  const removeItem = useCallback((name: string) => {
    setCart((prev) => prev.filter((item) => item.name !== name));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartQty = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const total = subtotal;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartQty,
        cartOpen,
        openCart: () => setCartOpen(true),
        closeCart: () => setCartOpen(false),
        toggleCart: () => setCartOpen((v) => !v),
        addToCart,
        changeQty,
        removeItem,
        clearCart,
        subtotal,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
