"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface CartItem {
  id: string
  name: string
  image: string
  price: number
  version: "normal" | "foil"
  quantity: number
  maxStock: number // Stock máximo disponible para este item
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: Omit<CartItem, "quantity">, maxStock: number) => { success: boolean; error?: string }
  removeFromCart: (id: string, version: "normal" | "foil") => void
  updateQuantity: (id: string, version: "normal" | "foil", quantity: number) => { success: boolean; error?: string }
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addToCart = (item: Omit<CartItem, "quantity" | "maxStock">, maxStock: number) => {
    // Validar stock disponible
    if (maxStock <= 0) {
      return { success: false, error: "No hay stock disponible" }
    }

    setItems((prev) => {
      const existingItem = prev.find((i) => i.id === item.id && i.version === item.version)
      
      if (existingItem) {
        // Si ya existe, validar que no exceda el stock
        const newQuantity = existingItem.quantity + 1
        if (newQuantity > maxStock) {
          return prev // No hacer cambios si excede el stock
        }
        return prev.map((i) =>
          i.id === item.id && i.version === item.version 
            ? { ...i, quantity: newQuantity, maxStock } 
            : i,
        )
      }
      
      // Si es nuevo, agregar con cantidad 1
      return [...prev, { ...item, quantity: 1, maxStock }]
    })
    
    return { success: true }
  }

  const removeFromCart = (id: string, version: "normal" | "foil") => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.version === version)))
  }

  const updateQuantity = (id: string, version: "normal" | "foil", quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id, version)
      return { success: true }
    }
    
    let validationError: string | undefined
    
    setItems((prev) => {
      const item = prev.find((i) => i.id === id && i.version === version)
      if (!item) {
        return prev
      }
      
      // Validar que la cantidad no exceda el stock máximo
      if (quantity > item.maxStock) {
        validationError = `Stock máximo disponible: ${item.maxStock}`
        return prev // No hacer cambios si excede el stock
      }
      
      return prev.map((i) => (i.id === id && i.version === version ? { ...i, quantity } : i))
    })
    
    if (validationError) {
      return { success: false, error: validationError }
    }
    
    return { success: true }
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
