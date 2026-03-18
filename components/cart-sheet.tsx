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
import { useUser } from "@/hooks/use-user"
import { supabase } from "@/lib/db"
import { useRouter } from "next/navigation"
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
  const { isAuthenticated, loading: userLoading, user } = useUser()
  const router = useRouter()
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const [shippingData, setShippingData] = useState<ShippingData>({
    method: "shipping", // Cambiar a "shipping" por defecto ya que "pickup" está oculto
    cost: 0,
  })
  
  // Calcular descuentos
  const productDiscount = calculateProductDiscount(totalPrice)
  const discountedSubtotal = totalPrice - productDiscount
  const finalShippingCost = getFinalShippingCost(shippingData.cost, totalPrice)
  const finalTotal = discountedSubtotal + finalShippingCost

  const normalizeRut = (rut: string) =>
    rut.replace(/\./g, "").replace(/-/g, "").replace(/\s+/g, "").toUpperCase()

  const isValidRut = (rutRaw: string): boolean => {
    const rut = normalizeRut(rutRaw)
    // Debe ser 7 u 8 dígitos + dígito verificador
    if (!/^\d{7,8}[0-9K]$/.test(rut)) return false

    const body = rut.slice(0, -1)
    const dv = rut.slice(-1)

    let sum = 0
    let multiplier = 2

    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i], 10) * multiplier
      multiplier = multiplier === 7 ? 2 : multiplier + 1
    }

    const remainder = 11 - (sum % 11)
    let expectedDV: string

    if (remainder === 11) expectedDV = "0"
    else if (remainder === 10) expectedDV = "K"
    else expectedDV = String(remainder)

    return dv === expectedDV
  }

  const rutIsValidNow = shippingData.rut ? isValidRut(shippingData.rut) : false
  const rutErrorMessage =
    !shippingData.rut || shippingData.rut.trim() === ""
      ? "Ingresa tu RUT para el despacho/boleta."
      : !rutIsValidNow
        ? "RUT inválido. Revisa el dígito verificador."
        : null

  const handleCheckout = async () => {
    console.log('🚀 Checkout initiated')
    console.log('📊 Items:', items.length)
    console.log('💰 Total:', totalPrice)
    console.log('📦 Shipping (at checkout):', shippingData)
    
    if (items.length === 0) {
      console.log('❌ No items in cart')
      return
    }

    // ✅ Verificar autenticación antes de proceder
    if (userLoading) {
      console.log('⏳ Waiting for user authentication check...')
      return
    }

    if (!isAuthenticated) {
      console.log('❌ User not authenticated')
      
      // El carrito ya se guarda automáticamente en localStorage por el cart-provider
      // Redirigir al login con parámetro para indicar que viene del checkout
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Debes iniciar sesión para realizar una compra. Tu carrito se guardará automáticamente.",
        duration: 5000,
      })
      // Cerrar el carrito y redirigir al login con parámetro de retorno
      onOpenChange(false)
      // Guardar la URL actual para regresar después del login
      const returnUrl = window.location.pathname + window.location.search
      router.push(`/lorcana-tcg/login?redirect=${encodeURIComponent(returnUrl)}&from=checkout`)
      return
    }

    const cartItems = items.reduce((sum, item) => sum + item.quantity, 0)

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

    // ✅ Validar que usuarios autenticados tengan al menos una dirección guardada
    if (isAuthenticated && user?.id && shippingData.method === "shipping") {
      try {
        const addressesRes = await fetch(`/api/user/addresses?userId=${user.id}`)
        const addressesData = await addressesRes.json()
        
        if (addressesData.success && addressesData.data && addressesData.data.length === 0) {
          // Si no tiene direcciones guardadas y está ingresando una nueva, está bien
          // Pero si no tiene direcciones y no está completando el formulario, pedirle que guarde una
          if (!shippingData.address?.street || !shippingData.address?.number) {
            toast({
              variant: "destructive",
              title: t("error"),
              description: "Debes tener al menos una dirección guardada. Ve a 'Mi Perfil' para agregar una dirección.",
              duration: 5000,
            })
            onOpenChange(false)
            router.push("/lorcana-tcg/my-profile")
            return
          }
        }
      } catch (error) {
        console.error("Error checking addresses:", error)
        // Continuar si hay error, pero mostrar advertencia
      }
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

      // Validar teléfono
      if (!shippingData.phone || shippingData.phone.trim() === "") {
        toast({
          variant: "destructive",
          title: t("error"),
          description: "Por favor ingresa un teléfono de contacto",
          duration: 5000,
        })
        return
      }

      // Validar RUT
      if (!shippingData.rut || shippingData.rut.trim() === "") {
        toast({
          variant: "destructive",
          title: t("error"),
          description: "Por favor ingresa tu RUT para el envío",
          duration: 5000,
        })
        return
      }

      // Validación completa de RUT (formato + dígito verificador)
      if (!isValidRut(shippingData.rut)) {
        toast({
          variant: "destructive",
          title: t("error"),
          description: "RUT inválido. Revisa el formato y el dígito verificador (Ej: 12.345.678-9).",
          duration: 5000,
        })
        return
      }

      // Validar formato de teléfono si está autenticado (para usuarios no autenticados, validación básica)
      if (isAuthenticated) {
        const phoneRegex = /^\+56\s?9\s?\d{4}\s?\d{4}$/
        if (!phoneRegex.test(shippingData.phone.replace(/\s+/g, " "))) {
          toast({
            variant: "destructive",
            title: t("error"),
            description: "Formato de teléfono inválido. Usa: +56 9 1234 5678",
            duration: 5000,
          })
          return
        }
      }
      
      console.log('✅ Address and phone validation passed')
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

      // Obtener token de sesión para autenticación
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        console.error('❌ No session token available')
        toast({
          variant: "destructive",
          title: t("error"),
          description: "Sesión expirada. Por favor inicia sesión nuevamente.",
          duration: 5000,
        })
        router.push("/lorcana-tcg/login?redirect=" + encodeURIComponent(window.location.pathname))
        return
      }

      // Crear preferencia de pago con autenticación
      const response = await fetch('/api/payment/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ✅ Enviar token de sesión
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
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🔘 Button clicked, calling handleCheckout...')
                    handleCheckout()
                  }}
                  disabled={
                    processingCheckout ||
                    items.length === 0 ||
                    (shippingData.method === "shipping" && rutErrorMessage !== null)
                  }
                  type="button"
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
                {shippingData.method === "shipping" && rutErrorMessage && (
                  <p className="text-xs text-red-600 text-center mt-2">
                    {rutErrorMessage}
                  </p>
                )}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Agrega items al carrito para continuar
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
