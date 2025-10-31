"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface CartItem {
  id: string
  name: string
  image: string
  price: number
  version: "normal" | "foil"
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: Omit<CartItem, "quantity">) => void
  removeFromCart: (id: string, version: "normal" | "foil") => void
  updateQuantity: (id: string, version: "normal" | "foil", quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existingItem = prev.find((i) => i.id === item.id && i.version === item.version)
      if (existingItem) {
        return prev.map((i) =>
          i.id === item.id && i.version === item.version ? { ...i, quantity: i.quantity + 1 } : i,
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (id: string, version: "normal" | "foil") => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.version === version)))
  }

  const updateQuantity = (id: string, version: "normal" | "foil", quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id, version)
      return
    }
    setItems((prev) => prev.map((i) => (i.id === id && i.version === version ? { ...i, quantity } : i)))
  }

  const clearCart = () => {
    setItems([])
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within CartProvider")
  }
  return context
}
