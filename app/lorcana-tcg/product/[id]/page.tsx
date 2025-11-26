"use client"

import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { useCart } from "@/components/cart-provider"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Package, AlertCircle, ShoppingCart, CreditCard, Loader2, Shield } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProductDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { t } = useLanguage()
  const { addToCart } = useCart()
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [buyingNow, setBuyingNow] = useState(false)

  // Cargar producto desde API
  useEffect(() => {
    const loadProduct = async () => {
      try {
        console.log(`🔍 Cargando producto con ID: "${id}"`)
        
        const response = await fetch(`/api/products/${id}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          console.log(`✅ Producto encontrado: ${result.data.name} (${result.data.id})`)
          setProduct(result.data)
        } else {
          console.log(`❌ Producto no encontrado`)
          setProduct(null)
        }
      } catch (error) {
        console.error("Error loading product:", error)
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }
    
    loadProduct()
  }, [id])
  
  // Stock management
  const stock = product?.stock || 0
  const isInStock = stock > 0
  const isLowStock = stock < 5 && stock > 0
  const price = product?.price || 0

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Producto no encontrado</h2>
            <p className="text-muted-foreground mb-6">El producto que buscas no existe.</p>
            <Button onClick={() => router.push('/lorcana-tcg/products')}>
              Ver Productos
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const productType = product.producttype || product.productType || "booster"

  const handleAddToCart = () => {
    const result = addToCart({
      id: product.id,
      name: product.name,
      image: product.image,
      price,
      version: "normal", // Productos siempre usan "normal"
    }, stock)
    
    if (!result.success) {
      alert(result.error || `No hay suficiente stock disponible. Stock máximo: ${stock}`)
    }
  }

  const handleBuyNow = async () => {
    if (!product) return
    
    // Validar monto mínimo de Mercado Pago (50 CLP)
    const totalAmount = price * quantity
    if (totalAmount < 50) {
      alert('El monto mínimo de compra es $50 CLP. Por favor aumenta la cantidad.')
      return
    }
    
    setBuyingNow(true)
    
    try {
      // Obtener el dominio actual para que MP redirija al mismo dominio
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
      
      // Crear preferencia de pago en Mercado Pago
      const response = await fetch('/api/payment/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: product.id,
            name: product.name,
            image: product.image,
            price,
            quantity,
            version: "normal",
          }],
          origin: currentOrigin,
        }),
      })

      const data = await response.json()

      if (data.success && data.initPoint) {
        // Redirigir a Mercado Pago
        window.location.href = data.initPoint
      } else {
        alert('Error al crear el pago. Intenta nuevamente.')
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('Error al procesar el pago. Intenta nuevamente.')
    } finally {
      setBuyingNow(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("goBack")}
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden glow-border">
            <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" priority />
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="font-display text-4xl font-bold text-balance">{product.name}</h1>
              </div>
              {product.metadata?.set && (
                <p className="text-muted-foreground font-sans">Set: {t(product.metadata.set) || product.metadata.set}</p>
              )}
            </div>

            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary capitalize font-sans">
                {productType === "booster" && "Booster"}
                {productType === "playmat" && "Play Mat"}
                {productType === "sleeves" && "Fundas"}
                {productType === "deckbox" && "Deck Box"}
                {productType === "dice" && "Dados"}
                {productType === "accessory" && "Accesorio"}
                {productType === "giftset" && "Gift Set"}
              </span>
              {product.metadata?.set && (
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground capitalize font-sans">
                  {t(product.metadata.set) || product.metadata.set}
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-foreground/80 leading-relaxed font-sans">{product.description}</p>
            )}
            
            {/* Mostrar información adicional de productos */}
            {product.metadata && (
              <div className="space-y-2 text-sm text-muted-foreground">
                {product.metadata.cardsPerPack && (
                  <p>Cartas por booster: {product.metadata.cardsPerPack}</p>
                )}
                {product.metadata.material && (
                  <p>Material: {product.metadata.material}</p>
                )}
                {product.metadata.size && (
                  <p>Tamaño: {product.metadata.size}</p>
                )}
                {product.metadata.count && (
                  <p>Cantidad: {product.metadata.count}</p>
                )}
                {product.metadata.capacity && (
                  <p>Capacidad: {product.metadata.capacity} cartas</p>
                )}
                {product.metadata.color && (
                  <p>Color: {product.metadata.color}</p>
                )}
                {product.metadata.category && (
                  <p>Categoría: {product.metadata.category}</p>
                )}
                {product.metadata.contents && (
                  <p>Contenido: {product.metadata.contents}</p>
                )}
                {product.metadata.items && (
                  <p>Items incluidos: {typeof product.metadata.items === 'string' ? product.metadata.items : JSON.stringify(product.metadata.items)}</p>
                )}
              </div>
            )}

            {/* Stock Information */}
            <div className="flex gap-3 items-center p-4 rounded-lg bg-muted/30 border border-border">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-semibold font-sans">{t("stockAvailability")}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-muted-foreground font-sans">
                    Stock: <span className={stock > 0 ? "text-green-500 font-semibold" : "text-red-500"}>{stock}</span>
                  </span>
                </div>
              </div>
              {!isInStock && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {t("outOfStockBadge")}
                </Badge>
              )}
              {isLowStock && (
                <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 border-orange-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {t("lowStockBadge")}
                </Badge>
              )}
            </div>

            {stock > 0 ? (
              <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
                <div>
                  <label className="text-sm font-medium mb-2 block font-sans">{t("quantity")}</label>
                  <Select 
                    value={quantity.toString()} 
                    onValueChange={(v) => setQuantity(parseInt(v))}
                    disabled={!isInStock}
                  >
                    <SelectTrigger className="font-sans">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: Math.min(stock, 10) }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()} className="font-sans">
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-sans">{t("priceRange")}</p>
                      <p className="text-3xl font-bold text-primary font-display">${Math.floor(price * quantity).toLocaleString()}</p>
                      {quantity > 1 && <p className="text-xs text-muted-foreground">${Math.floor(price).toLocaleString()} {t("each")}</p>}
                    </div>
                  </div>
                  
                  {/* Mercado Pago Trust Badge */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">Pago 100% seguro con Mercado Pago</p>
                      <p className="text-xs text-muted-foreground">Tarjetas de crédito, débito y transferencia</p>
                    </div>
                    <Image
                      src="/mercadopago-certified-badge.webp"
                      alt="Certificado Mercado Pago"
                      width={80}
                      height={30}
                      className="h-auto w-auto flex-shrink-0"
                      loading="lazy"
                    />
                  </div>

                  {/* Botones de compra */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={handleAddToCart} 
                      className="flex-1 font-sans"
                      disabled={!isInStock}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {isInStock ? t("addToCart") : t("outOfStockBadge")}
                    </Button>
                    <Button 
                      size="lg" 
                      onClick={handleBuyNow} 
                      className="flex-1 glow-border font-sans"
                      disabled={!isInStock || buyingNow}
                    >
                      {buyingNow ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("processing")}
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          {t("buyNow")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-lg bg-card border border-border text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-xl font-semibold mb-2">{t("outOfStockBadge")}</h3>
                <p className="text-muted-foreground mb-4">Este producto no está disponible actualmente.</p>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/lorcana-tcg/products')}
                  className="font-sans"
                >
                  Ver Productos
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

