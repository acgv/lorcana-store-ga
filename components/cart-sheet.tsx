"use client"

import { useState } from "react"
import { X, Minus, Plus, Loader2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCart } from "@/components/cart-provider"
import { useLanguage } from "@/components/language-provider"
import { useToast } from "@/hooks/use-toast"
import { ShippingSelector, type ShippingData } from "@/components/shipping-selector"
import Image from "next/image"

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const [shippingData, setShippingData] = useState<ShippingData>({
    method: "pickup",
    cost: 0,
  })
  
  const finalTotal = totalPrice + shippingData.cost

  const handleCheckout = async () => {
    if (items.length === 0) return

    // Validar mínimo de compra ($50 CLP)
    if (totalPrice < 50) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("minimumPurchase"),
      })
      return
    }

    // Validar datos de envío si es shipping
    if (shippingData.method === "shipping") {
      if (!shippingData.address?.street || !shippingData.address?.commune || !shippingData.address?.city) {
        toast({
          variant: "destructive",
          title: t("error"),
          description: "Por favor completa la dirección de envío",
        })
        return
      }
    }

    setProcessingCheckout(true)

    try {
      // Preparar items para Mercado Pago
      const cartItems = items.map(item => ({
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        version: item.version,
      }))

      console.log('🛒 Creating payment preference for cart:', cartItems)
      console.log('📦 Shipping data:', shippingData)

      // Crear preferencia de pago
      const response = await fetch('/api/payment/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartItems,
          shipping: shippingData,
          origin: window.location.origin,
        }),
      })

      const data = await response.json()

      if (data.success && data.initPoint) {
        console.log('✅ Redirecting to Mercado Pago:', data.initPoint)
        
        // Redirigir a Mercado Pago
        window.location.href = data.initPoint
      } else {
        throw new Error(data.error || 'Failed to create payment preference')
      }
    } catch (error) {
      console.error('❌ Error creating payment:', error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("checkoutError"),
      })
      setProcessingCheckout(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{t("cart")}</SheetTitle>
        </SheetHeader>
        <div className="mt-8 flex flex-col gap-4">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("emptyCart")}</p>
          ) : (
            <>
              <div className="flex-1 overflow-auto space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.id}-${item.version}`}
                    className="flex gap-4 p-4 rounded-lg bg-card border border-border"
                  >
                    <div className="relative h-24 w-16 flex-shrink-0 rounded overflow-hidden">
                      <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">{t(item.version)}</p>
                      <p className="text-sm font-bold text-primary mt-1">${Math.floor(item.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 bg-transparent"
                          onClick={() => updateQuantity(item.id, item.version, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 bg-transparent"
                          onClick={() => updateQuantity(item.id, item.version, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFromCart(item.id, item.version)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Shipping Selector */}
              <div className="border-t border-border pt-4">
                <ShippingSelector 
                  cartTotal={totalPrice}
                  onShippingChange={setShippingData}
                />
              </div>

              {/* Totales */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("subtotal")}</span>
                  <span>${Math.floor(totalPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("shippingCost")}</span>
                  <span className={shippingData.cost === 0 ? "text-green-500 font-medium" : ""}>
                    {shippingData.cost === 0 ? t("free") : `$${Math.floor(shippingData.cost).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>{t("total")}</span>
                  <span className="text-primary">${Math.floor(finalTotal).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleCheckout}
                  disabled={processingCheckout || items.length === 0}
                >
                  {processingCheckout ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("processing")}
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {t("checkout")}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
