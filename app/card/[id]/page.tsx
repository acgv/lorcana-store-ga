"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { useCart } from "@/components/cart-provider"
import { mockCards } from "@/lib/mock-data"
import { useState } from "react"
import Image from "next/image"
import { ArrowLeft, Sparkles, Package, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { t } = useLanguage()
  const { addToCart } = useCart()
  const router = useRouter()
  const [version, setVersion] = useState<"normal" | "foil">("normal")
  const [quantity, setQuantity] = useState(1)

  const card = mockCards.find((c) => c.id === id)
  
  // Stock management
  const normalStock = card?.normalStock || 0
  const foilStock = card?.foilStock || 0
  const currentStock = version === "normal" ? normalStock : foilStock
  const isInStock = currentStock > 0
  const isLowStock = currentStock < 5 && currentStock > 0

  if (!card) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <p>Card not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  const price = version === "normal" ? card.price : card.foilPrice

  const handleAddToCart = () => {
    addToCart({
      id: card.id,
      name: card.name,
      image: card.image,
      price,
      version,
    })
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
                {card.rarity === "legendary" && <Sparkles className="h-8 w-8 text-accent flex-shrink-0" />}
              </div>
              <p className="text-muted-foreground font-sans">#{card.number}</p>
            </div>

            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary capitalize font-sans">{t(card.type)}</span>
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent capitalize font-sans">{t(card.rarity)}</span>
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground capitalize font-sans">{t(card.set)}</span>
            </div>

            <p className="text-foreground/80 leading-relaxed font-sans">{card.description}</p>

            {/* Stock Information */}
            <div className="flex gap-3 items-center p-4 rounded-lg bg-muted/30 border border-border">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-semibold font-sans">Stock Availability</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-muted-foreground font-sans">
                    Normal: <span className={normalStock > 0 ? "text-green-500 font-semibold" : "text-red-500"}>{normalStock}</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-sans">
                    Foil: <span className={foilStock > 0 ? "text-green-500 font-semibold" : "text-red-500"}>{foilStock}</span>
                  </span>
                </div>
              </div>
              {!isInStock && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Out of Stock
                </Badge>
              )}
              {isLowStock && (
                <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 border-orange-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Low Stock
                </Badge>
              )}
            </div>

            <div className="space-y-4 p-6 rounded-lg bg-card border border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block font-sans">{t("version")}</label>
                  <Select value={version} onValueChange={(v) => setVersion(v as "normal" | "foil")}>
                    <SelectTrigger className="font-sans">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal" className="font-sans" disabled={normalStock === 0}>
                        {t("normal")} - ${card.price.toFixed(2)} {normalStock === 0 && "(Out of Stock)"}
                      </SelectItem>
                      <SelectItem value="foil" className="font-sans" disabled={foilStock === 0}>
                        {t("foil")} - ${card.foilPrice.toFixed(2)} {foilStock === 0 && "(Out of Stock)"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block font-sans">Quantity</label>
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

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground font-sans">{t("priceRange")}</p>
                  <p className="text-3xl font-bold text-primary font-display">${(price * quantity).toFixed(2)}</p>
                  {quantity > 1 && <p className="text-xs text-muted-foreground">${price.toFixed(2)} each</p>}
                </div>
                <Button 
                  size="lg" 
                  onClick={handleAddToCart} 
                  className="glow-border font-sans"
                  disabled={!isInStock}
                >
                  {isInStock ? t("addToCart") : "Out of Stock"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
