"use client"

import type { Card } from "@/lib/mock-data"
import { useLanguage } from "@/components/language-provider"
import Link from "next/link"
import Image from "next/image"
import { Sparkles, Star, AlertCircle, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CardItemProps {
  card: Card
  viewMode: "grid" | "list"
}

export function CardItem({ card, viewMode }: CardItemProps) {
  const { t } = useLanguage()

  // Check version availability and stock
  const normalStock = card.normalStock || 0
  const foilStock = card.foilStock || 0
  const hasNormalStock = normalStock > 0
  const hasFoilStock = foilStock > 0
  const isLowStock = (normalStock + foilStock) < 5 && (normalStock + foilStock) > 0
  const isOutOfStock = normalStock === 0 && foilStock === 0

  if (viewMode === "list") {
    return (
      <Link href={`/card/${card.id}`}>
        <div className="flex gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
          <div className="relative h-32 w-24 flex-shrink-0 rounded overflow-hidden foil-effect">
            <Image src={card.image || "/placeholder.svg"} alt={card.name} fill className="object-cover" />
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
                  Out of Stock
                </Badge>
              )}
              {isLowStock && (
                <Badge variant="secondary" className="text-xs font-sans bg-orange-500/20 text-orange-600 border-orange-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Low Stock
                </Badge>
              )}
              
              {/* Version Badges with Stock Count */}
              {hasNormalStock && (
                <Badge variant="outline" className="text-xs font-sans">
                  Normal ({normalStock})
                </Badge>
              )}
              {hasFoilStock && (
                <Badge className="text-xs font-sans bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 border-yellow-400 font-semibold shadow-lg shadow-yellow-500/20">
                  <Star className="h-3 w-3 mr-1 fill-gray-900" />
                  Foil ({foilStock})
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2 font-sans">{card.description}</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-sans">{t("normal")}</p>
                <p className="text-lg font-bold text-primary font-display">${card.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">{t("foil")}</p>
                <p className="text-lg font-bold text-accent font-display">${card.foilPrice.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/card/${card.id}`}>
      <div className="group rounded-lg bg-card border border-border overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
        <div className="relative aspect-[3/4] overflow-hidden foil-effect">
          <Image
            src={card.image || "/placeholder.svg"}
            alt={card.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
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
        <div className="p-4">
          <h3 className="font-display font-bold mb-1 truncate text-balance tracking-wide">{card.name}</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize font-sans">{t(card.type)}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent capitalize font-sans">{t(card.rarity)}</span>
          </div>
          
          {/* Stock indicators */}
          <div className="flex flex-wrap gap-1 mb-2">
            {isOutOfStock && (
              <Badge variant="destructive" className="text-[10px] font-sans h-5 px-1.5">
                <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                Out
              </Badge>
            )}
            {isLowStock && (
              <Badge variant="secondary" className="text-[10px] font-sans h-5 px-1.5 bg-orange-500/20 text-orange-600 border-orange-500/30">
                <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                Low
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
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground font-sans">{t("normal")}</p>
              <p className="font-bold text-primary font-display">${card.price.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-sans">{t("foil")}</p>
              <p className="font-bold text-accent font-display">${card.foilPrice.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
