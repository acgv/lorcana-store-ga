"use client"

import { useState } from "react"
import { X, Minus, Plus, Loader2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCart } from "@/components/cart-provider"
import { useLanguage } from "@/components/language-provider"
import { useToast } from "@/hooks/use-toast"
import { ShippingSelector, type ShippingData } from "@/components/shipping-selector"
import { usePromotion } from "@/hooks/use-promotion"
import Image from "next/image"

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart()
  const { t } = useLanguage()
  const { toast } = useToast()
  const { calculateProductDiscount, getFinalShippingCost } = usePromotion()
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const [shippingData, setShippingData] = useState<ShippingData>({
    method: "pickup",
    cost: 0,
  })
  
  // Calcular descuentos
  const productDiscount = calculateProductDiscount(totalPrice)
  const discountedSubtotal = totalPrice - productDiscount
  const finalShippingCost = getFinalShippingCost(shippingData.cost, totalPrice)
  const finalTotal = discountedSubtotal + finalShippingCost

  const handleCheckout = async () => {
    console.log('🚀 Checkout initiated')
    console.log('📊 Items:', items.length)
    console.log('💰 Total:', totalPrice)
    console.log('📦 Shipping (at checkout):', shippingData)
    
    if (items.length === 0) {
      console.log('❌ No items in cart')
      return
    }

    // Validar mínimo de compra ($50 CLP)
    if (totalPrice < 50) {
      console.log('❌ Below minimum purchase')
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("minimumPurchase"),
      })
      return
    }

    // ✅ VALIDACIÓN SOLO AL FINALIZAR COMPRA
    if (shippingData.method === "shipping") {
      console.log('📋 Validating shipping address at checkout...')
      
      const requiredFields = [
        { field: 'street', name: 'Calle', value: shippingData.address?.street },
        { field: 'number', name: 'Número', value: shippingData.address?.number },
        { field: 'commune', name: 'Comuna', value: shippingData.address?.commune },
        { field: 'city', name: 'Ciudad', value: shippingData.address?.city },
        { field: 'region', name: 'Región', value: shippingData.address?.region },
      ]
      
      const missingFields = requiredFields.filter(f => !f.value)
      
      if (missingFields.length > 0) {
        const missingNames = missingFields.map(f => f.name).join(', ')
        console.log('❌ Missing fields:', missingNames)
        
        toast({
          variant: "destructive",
          title: t("error"),
          description: `Por favor completa: ${missingNames}`,
          duration: 5000,
        })
        return
      }
      
      console.log('✅ Address validation passed')
    }

    console.log('✅ All validations passed, proceeding to payment...')
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
          shipping: {
            ...shippingData,
            cost: finalShippingCost, // Usar el costo de envío con descuento aplicado
          },
          promotionDiscount: productDiscount, // Incluir descuento de productos
          origin: window.location.origin,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ HTTP Error:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (data.success && data.initPoint) {
        console.log('✅ Redirecting to Mercado Pago:', data.initPoint)
        
        // Redirigir a Mercado Pago
        window.location.href = data.initPoint
      } else {
        console.error('❌ Payment preference creation failed:', data)
        throw new Error(data.error || data.details || 'Failed to create payment preference')
      }
    } catch (error) {
      console.error('❌ Error creating payment:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: errorMessage || t("checkoutError"),
        duration: 5000,
      })
      setProcessingCheckout(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="font-display text-2xl">{t("cart")}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-8 flex flex-col gap-4 pr-2">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("emptyCart")}</p>
          ) : (
            <>
              <div className="space-y-4">
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
                          onClick={() => {
                            const result = updateQuantity(item.id, item.version, item.quantity - 1)
                            if (!result.success && result.error) {
                              toast({
                                variant: "destructive",
                                title: t("error"),
                                description: result.error,
                              })
                            }
                          }}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-8 text-center">{item.quantity} / {item.maxStock}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 bg-transparent"
                          disabled={item.quantity >= item.maxStock}
                          onClick={() => {
                            const result = updateQuantity(item.id, item.version, item.quantity + 1)
                            if (!result.success && result.error) {
                              toast({
                                variant: "destructive",
                                title: t("error"),
                                description: result.error,
                              })
                            }
                          }}
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
                {productDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento ({Math.round((productDiscount / totalPrice) * 100)}%)</span>
                    <span className="font-semibold">-${Math.floor(productDiscount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>{t("shippingCost")}</span>
                  <span className={finalShippingCost === 0 ? "text-green-500 font-medium" : ""}>
                    {finalShippingCost === 0 ? t("free") : `$${Math.floor(finalShippingCost).toLocaleString()}`}
                  </span>
                </div>
                {finalShippingCost < shippingData.cost && shippingData.cost > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Descuento en envío</span>
                    <span>-${Math.floor(shippingData.cost - finalShippingCost).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>{t("total")}</span>
                  <span className="text-primary">${Math.floor(finalTotal).toLocaleString()}</span>
                </div>
              </div>
              
              {/* Mercado Pago Trust Badge */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Image
                    src="/mercadopago-certified-badge.webp"
                    alt="Certificado Mercado Pago"
                    width={80}
                    height={30}
                    className="h-auto w-auto"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">Pago seguro con Mercado Pago</p>
                  <p className="text-xs text-muted-foreground">Tarjetas, transferencia y más</p>
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
