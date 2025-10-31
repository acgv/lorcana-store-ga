"use client"

import type { Card } from "@/lib/mock-data"
import { CardItem } from "@/components/card-item"

interface CardGridProps {
  cards: Card[]
  viewMode: "grid" | "list"
}

export function CardGrid({ cards, viewMode }: CardGridProps) {
  if (cards.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No cards found matching your filters</div>
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {cards.map((card) => (
          <CardItem key={card.id} card={card} viewMode="list" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} viewMode="grid" />
      ))}
    </div>
  )
}
