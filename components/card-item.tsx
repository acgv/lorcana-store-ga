"use client"

import { useState } from "react"
import type { Card } from "@/lib/mock-data"
import { useLanguage } from "@/components/language-provider"
import { useCart } from "@/components/cart-provider"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"
import { Sparkles, Star, AlertCircle, Package, ShoppingCart, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface CardItemProps {
  card: Card
  viewMode: "grid" | "list"
  priority?: boolean
}

export function CardItem({ card, viewMode, priority = false }: CardItemProps) {
  const { t } = useLanguage()
  const { addToCart } = useCart()
  const { toast } = useToast()
  const [adding, setAdding] = useState<string | null>(null)

  // Check version availability and stock
  const normalStock = card.normalStock || 0
  const foilStock = card.foilStock || 0
  const hasNormalStock = normalStock > 0
  const hasFoilStock = foilStock > 0
  const isLowStock = (normalStock + foilStock) < 5 && (normalStock + foilStock) > 0
  const isOutOfStock = normalStock === 0 && foilStock === 0

  const handleAddToCart = (e: React.MouseEvent, version: "normal" | "foil") => {
    e.preventDefault() // Prevenir navegación
    e.stopPropagation()
    
    setAdding(version)
    
    addToCart({
      id: card.id,
      name: card.name,
      price: version === "foil" ? card.foilPrice : card.price,
      image: card.image,
      version,
      quantity: 1,
    })

    toast({
      title: t("success"),
      description: `${card.name} (${version === "foil" ? t("foil") : t("normal")}) ${t("addedToCart")}`,
    })

    setAdding(null)
  }

  if (viewMode === "list") {
    return (
      <Link href={`/card/${card.id}`}>
        <div className="flex gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
          <div className="relative h-32 w-24 flex-shrink-0 rounded overflow-hidden foil-effect">
            <Image src={card.image || "/placeholder.svg"} alt={card.name} fill className="object-cover" priority={priority} />
            {/* Card Number Badge */}
            <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md border border-primary/30">
              <span className="text-xs font-bold text-primary font-mono">#{card.number}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl font-bold mb-1 truncate tracking-wide">{card.name}</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize font-sans">
                {t(card.type)}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent capitalize font-sans">
                {t(card.rarity)}
              </span>
              
              {/* Stock Status */}
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs font-sans">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {t("outOfStockBadge")}
                </Badge>
              )}
              {isLowStock && (
                <Badge variant="secondary" className="text-xs font-sans bg-orange-500/20 text-orange-600 border-orange-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {t("lowStockBadge")}
                </Badge>
              )}
              
              {/* Version Badges with Stock Count */}
              {hasNormalStock && (
                <Badge variant="outline" className="text-xs font-sans">
                  {t("normal")} ({normalStock})
                </Badge>
              )}
              {hasFoilStock && (
                <Badge className="text-xs font-sans bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 border-yellow-400 font-semibold shadow-lg shadow-yellow-500/20">
                  <Star className="h-3 w-3 mr-1 fill-gray-900" />
                  {t("foil")} ({foilStock})
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2 font-sans">{card.description}</p>
            {(hasNormalStock || hasFoilStock) && (
              <div className="flex items-center gap-4">
                {hasNormalStock && (
                  <div>
                    <p className="text-xs text-muted-foreground font-sans">{t("normal")}</p>
                    <p className="text-lg font-bold text-primary font-display">${Math.floor(card.price)}</p>
                  </div>
                )}
                {hasFoilStock && (
                  <div>
                    <p className="text-xs text-muted-foreground font-sans">{t("foil")}</p>
                    <p className="text-lg font-bold text-accent font-display">${Math.floor(card.foilPrice)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="group rounded-lg bg-card border border-border overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
      {/* Image - clickeable para ver detalle */}
      <Link href={`/card/${card.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden foil-effect">
          <Image
            src={card.image || "/placeholder.svg"}
            alt={card.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority={priority}
          />
          {/* Card Number Badge */}
          <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md border border-primary/30">
            <span className="text-xs font-bold text-primary font-mono">#{card.number}</span>
          </div>
          {card.rarity === "legendary" && (
            <div className="absolute top-2 right-2">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/card/${card.id}`}>
          <h3 className="font-display font-bold mb-1 truncate text-balance tracking-wide hover:text-primary transition-colors">{card.name}</h3>
        </Link>
        
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize font-sans">{t(card.type)}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent capitalize font-sans">{t(card.rarity)}</span>
        </div>
        
        {/* Stock indicators */}
        <div className="flex flex-wrap gap-1 mb-2">
          {isOutOfStock && (
            <Badge variant="destructive" className="text-[10px] font-sans h-5 px-1.5">
              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
              {t("outOfStockBadge")}
            </Badge>
          )}
          {isLowStock && (
            <Badge variant="secondary" className="text-[10px] font-sans h-5 px-1.5 bg-orange-500/20 text-orange-600 border-orange-500/30">
              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
              {t("lowStockBadge")}
            </Badge>
          )}
          {hasNormalStock && (
            <Badge variant="outline" className="text-[10px] font-sans h-5 px-1.5">
              N ({normalStock})
            </Badge>
          )}
          {hasFoilStock && (
            <Badge className="text-[10px] font-sans h-5 px-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 border-yellow-400 font-semibold shadow-lg shadow-yellow-500/20">
              <Star className="h-2.5 w-2.5 mr-0.5 fill-gray-900" />
              F ({foilStock})
            </Badge>
          )}
        </div>

        {/* Precios y Botones de Agregar */}
        {(hasNormalStock || hasFoilStock) && (
          <div className="space-y-2">
            {/* Normal */}
            {hasNormalStock && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-sans">{t("normal")}</p>
                  <p className="font-bold text-primary font-display">${Math.floor(card.price).toLocaleString()}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  onClick={(e) => handleAddToCart(e, "normal")}
                  disabled={adding === "normal"}
                >
                  {adding === "normal" ? (
                    <Package className="h-3 w-3 animate-pulse" />
                  ) : (
                    <ShoppingCart className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}

            {/* Foil */}
            {hasFoilStock && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-sans">{t("foil")}</p>
                  <p className="font-bold text-accent font-display">${Math.floor(card.foilPrice).toLocaleString()}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  onClick={(e) => handleAddToCart(e, "foil")}
                  disabled={adding === "foil"}
                >
                  {adding === "foil" ? (
                    <Package className="h-3 w-3 animate-pulse" />
                  ) : (
                    <ShoppingCart className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}

            {/* Ver Detalles */}
            <Link href={`/card/${card.id}`}>
              <Button
                size="sm"
                variant="ghost"
                className="w-full h-8 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                {t("viewDetails")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
