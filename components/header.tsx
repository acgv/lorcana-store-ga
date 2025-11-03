"use client"

import Link from "next/link"
import { Search, ShoppingCart, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import { useCart } from "@/components/cart-provider"
import { CartSheet } from "@/components/cart-sheet"
import { useState } from "react"

export function Header() {
  const { t } = useLanguage()
  const { totalItems } = useCart()
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-display font-black tracking-tight hover:opacity-90 transition-opacity">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Lorcana</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-sans font-medium text-foreground/70 hover:text-foreground transition-all duration-200 hover:scale-105">
              {t("home")}
            </Link>
            <Link
              href="/catalog"
              className="text-sm font-sans font-medium text-foreground/70 hover:text-foreground transition-all duration-200 hover:scale-105"
            >
              {t("catalog")}
            </Link>
            <Link
              href="/news"
              className="text-sm font-sans font-medium text-foreground/70 hover:text-foreground transition-all duration-200 hover:scale-105"
            >
              {t("news")}
            </Link>
            <Link
              href="/contact"
              className="text-sm font-sans font-medium text-foreground/70 hover:text-foreground transition-all duration-200 hover:scale-105"
            >
              {t("contact")}
            </Link>
            <Link
              href="/admin/inventory"
              className="text-sm font-sans font-medium text-accent hover:text-accent/80 transition-all duration-200 hover:scale-105"
            >
              Admin
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:block w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder={t("search")} className="pl-9 bg-muted/50 border-border/50" />
            </div>
          </div>
          <LanguageSelector />
          <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  )
}
