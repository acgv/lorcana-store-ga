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
import { ArrowLeft, Sparkles, Package, AlertCircle, ShoppingCart, CreditCard, Loader2, Shield } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Card } from "@/lib/types"

export default function CardDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { t } = useLanguage()
  const { addToCart } = useCart()
  const router = useRouter()
  const [version, setVersion] = useState<"normal" | "foil">("normal")
  const [quantity, setQuantity] = useState(1)
  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)
  const [buyingNow, setBuyingNow] = useState(false)

  // Cargar carta o producto desde API
  useEffect(() => {
    const loadCard = async () => {
      try {
        console.log(`🔍 Cargando carta/producto con ID: "${id}"`)
        
        // Primero intentar buscar como carta
        let response = await fetch(`/api/cards/${id}`)
        let result = await response.json()
        
        if (result.success && result.data) {
          console.log(`✅ Carta encontrada: ${result.data.name} (${result.data.id})`)
          setCard(result.data)
          setLoading(false)
          return
        }
        
        // Si no es una carta, intentar buscar como producto
        console.log(`🔍 No es una carta, buscando como producto...`)
        response = await fetch(`/api/products/${id}`)
        result = await response.json()
        
        if (result.success && result.data) {
          console.log(`✅ Producto encontrado: ${result.data.name} (${result.data.id})`)
          // Normalizar producto para que sea compatible con el formato de carta
          const normalizedProduct: any = {
            id: result.data.id,
            name: result.data.name,
            image: result.data.image,
            price: result.data.price,
            foilPrice: null,
            normalStock: result.data.stock || 0,
            foilStock: 0,
            stock: result.data.stock || 0,
            set: result.data.metadata?.set || null,
            type: null,
            rarity: null,
            number: 0,
            cardNumber: null,
            productType: result.data.producttype || result.data.productType || "booster",
            description: result.data.description,
            metadata: result.data.metadata,
          }
          setCard(normalizedProduct)
        } else {
          console.log(`❌ Carta/Producto no encontrado`)
          setCard(null)
        }
      } catch (error) {
        console.error("Error loading card/product:", error)
        setCard(null)
      } finally {
        setLoading(false)
      }
    }
    
    loadCard()
  }, [id])
  
  // Detectar si es un producto (no carta)
  const isProduct = card && (card as any).productType && (card as any).productType !== "card"
  
  // Stock management
  const normalStock = card?.normalStock || 0
  const foilStock = card?.foilStock || 0
  const currentStock = version === "normal" ? normalStock : foilStock
  const isInStock = currentStock > 0
  const isLowStock = currentStock < 5 && currentStock > 0

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

  if (!card) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Card not found</h2>
            <p className="text-muted-foreground mb-6">The card you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/catalog')}>
              Go to Catalog
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Para productos, solo hay un precio (no normal/foil)
  const price = isProduct ? card.price : (version === "normal" ? card.price : card.foilPrice)

  const handleAddToCart = () => {
    addToCart({
      id: card.id,
      name: card.name,
      image: card.image,
      price,
      version: isProduct ? "normal" : version, // Productos siempre usan "normal"
    })
  }

  const handleBuyNow = async () => {
    if (!card) return
    
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
            id: card.id,
            name: card.name,
            image: card.image,
            price,
            quantity,
            version,
          }],
          origin: currentOrigin, // Enviar dominio actual
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
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden foil-effect glow-border">
            <Image src={card.image || "/placeholder.svg"} alt={card.name} fill className="object-cover" priority />
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="font-display text-4xl font-bold text-balance">{card.name}</h1>
                {!isProduct && card.rarity === "legendary" && <Sparkles className="h-8 w-8 text-accent flex-shrink-0" />}
              </div>
              {!isProduct && card.number > 0 && (
                <p className="text-muted-foreground font-sans">#{card.number}</p>
              )}
              {isProduct && (card as any).metadata?.set && (
                <p className="text-muted-foreground font-sans">Set: {t((card as any).metadata.set) || (card as any).metadata.set}</p>
              )}
            </div>

            {!isProduct && (
              <div className="flex gap-2">
                {card.type && (
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary capitalize font-sans">{t(card.type)}</span>
                )}
                {card.rarity && (
                  <span className="px-3 py-1 rounded-full bg-accent/10 text-accent capitalize font-sans">{t(card.rarity)}</span>
                )}
                {card.set && (
                  <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground capitalize font-sans">{t(card.set)}</span>
                )}
              </div>
            )}

            {isProduct && (
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary capitalize font-sans">
                  {(card as any).productType === "booster" && "Booster"}
                  {(card as any).productType === "playmat" && "Play Mat"}
                  {(card as any).productType === "sleeves" && "Fundas"}
                  {(card as any).productType === "deckbox" && "Deck Box"}
                  {(card as any).productType === "dice" && "Dados"}
                  {(card as any).productType === "accessory" && "Accesorio"}
                </span>
                {(card as any).metadata?.set && (
                  <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground capitalize font-sans">
                    {t((card as any).metadata.set) || (card as any).metadata.set}
                  </span>
                )}
              </div>
            )}

            {card.description && (
              <p className="text-foreground/80 leading-relaxed font-sans">{card.description}</p>
            )}
            
            {/* Mostrar información adicional de productos */}
            {isProduct && (card as any).metadata && (
              <div className="space-y-2 text-sm text-muted-foreground">
                {(card as any).metadata.cardsPerPack && (
                  <p>Cartas por booster: {(card as any).metadata.cardsPerPack}</p>
                )}
                {(card as any).metadata.material && (
                  <p>Material: {(card as any).metadata.material}</p>
                )}
                {(card as any).metadata.size && (
                  <p>Tamaño: {(card as any).metadata.size}</p>
                )}
                {(card as any).metadata.count && (
                  <p>Cantidad: {(card as any).metadata.count}</p>
                )}
                {(card as any).metadata.capacity && (
                  <p>Capacidad: {(card as any).metadata.capacity} cartas</p>
                )}
                {(card as any).metadata.color && (
                  <p>Color: {(card as any).metadata.color}</p>
                )}
                {(card as any).metadata.category && (
                  <p>Categoría: {(card as any).metadata.category}</p>
                )}
              </div>
            )}

            {/* Stock Information */}
            <div className="flex gap-3 items-center p-4 rounded-lg bg-muted/30 border border-border">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-semibold font-sans">{t("stockAvailability")}</p>
                {isProduct ? (
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-muted-foreground font-sans">
                      Stock: <span className={normalStock > 0 ? "text-green-500 font-semibold" : "text-red-500"}>{normalStock}</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-muted-foreground font-sans">
                      Normal: <span className={normalStock > 0 ? "text-green-500 font-semibold" : "text-red-500"}>{normalStock}</span>
                    </span>
                    <span className="text-xs text-muted-foreground font-sans">
                      Foil: <span className={foilStock > 0 ? "text-green-500 font-semibold" : "text-red-500"}>{foilStock}</span>
                    </span>
                  </div>
                )}
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

            {(normalStock > 0 || foilStock > 0) ? (
              <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
                {isProduct ? (
                  // Para productos: solo cantidad
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
                        {Array.from({ length: Math.min(currentStock, 10) }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()} className="font-sans">
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  // Para cartas: versión y cantidad
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block font-sans">{t("version")}</label>
                      <Select value={version} onValueChange={(v) => setVersion(v as "normal" | "foil")}>
                        <SelectTrigger className="font-sans">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal" className="font-sans" disabled={normalStock === 0}>
                            {t("normal")} {normalStock > 0 && `- $${Math.floor(card.price)}`} {normalStock === 0 && `(${t("outOfStock")})`}
                          </SelectItem>
                          <SelectItem value="foil" className="font-sans" disabled={foilStock === 0}>
                            {t("foil")} {foilStock > 0 && `- $${Math.floor(card.foilPrice || 0)}`} {foilStock === 0 && `(${t("outOfStock")})`}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

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
                          {Array.from({ length: Math.min(currentStock, 10) }, (_, i) => i + 1).map((num) => (
                            <SelectItem key={num} value={num.toString()} className="font-sans">
                              {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

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
                <p className="text-muted-foreground mb-4">{t("cardUnavailable")}</p>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/catalog')}
                  className="font-sans"
                >
                  Browse Catalog
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
