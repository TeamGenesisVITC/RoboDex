// app/context/CartContext.tsx

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CartItem {
  item_no: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item_no: string, quantity: number) => void;
  removeFromCart: (item_no: string) => void;
  updateQuantity: (item_no: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage immediately
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    
    const saved = localStorage.getItem("robodex_cart");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to load cart:", err);
        return [];
      }
    }
    return [];
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("robodex_cart", JSON.stringify(items));
    console.log("Cart saved:", items);
  }, [items]);

  const addToCart = (item_no: string, quantity: number) => {
    if (quantity <= 0) return;

    setItems(prev => {
      const existing = prev.find(item => item.item_no === item_no);
      if (existing) {
        // Update quantity if item already in cart
        return prev.map(item =>
          item.item_no === item_no
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      // Add new item
      return [...prev, { item_no, quantity }];
    });
  };

  const removeFromCart = (item_no: string) => {
    setItems(prev => prev.filter(item => item.item_no !== item_no));
  };

  const updateQuantity = (item_no: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(item_no);
      return;
    }

    setItems(prev =>
      prev.map(item =>
        item.item_no === item_no ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem("robodex_cart");
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}