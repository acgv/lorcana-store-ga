"use client"

import type { Card } from "@/lib/mock-data"
import { CardItem } from "@/components/card-item"
import { useLanguage } from "@/components/language-provider"

interface CardGridProps {
  cards: Card[]
  viewMode: "grid" | "list"
}

export function CardGrid({ cards, viewMode }: CardGridProps) {
  const { t } = useLanguage()
  
  if (cards.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{t("noCardsFound")}</div>
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {cards.map((card, index) => (
          <CardItem key={card.id} card={card} viewMode="list" priority={index < 4} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      {cards.map((card, index) => (
        <CardItem key={card.id} card={card} viewMode="grid" priority={index < 8} />
      ))}
    </div>
  )
}
