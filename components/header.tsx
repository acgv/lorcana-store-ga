"use client"

import Link from "next/link"
import { Search, ShoppingCart, Sparkles, Menu, User, LogOut, FileText, Shield, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { useCart } from "@/components/cart-provider"
import { CartSheet } from "@/components/cart-sheet"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser } from "@/hooks/use-user"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export function Header() {
  const { t } = useLanguage()
  const { totalItems } = useCart()
  const { user, signOut: userSignOut, isAdmin: isUserAdmin } = useUser()
  const { isAdmin: isAdminAuth, logout: adminLogout } = useAuth()
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  // User is admin if they're admin via Google OAuth OR traditional admin login
  const isAdmin = isUserAdmin || isAdminAuth

  const handleSignOut = async () => {
    // Clear all user data
    localStorage.removeItem("user_name")
    localStorage.removeItem("user_email")
    await userSignOut()
    await adminLogout()
    router.push("/")
  }

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
              href="/products"
              className="text-sm font-sans font-medium text-foreground/70 hover:text-foreground transition-all duration-200 hover:scale-105"
            >
              Productos
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
            {/* TODO: Re-habilitar funcionalidad de envío de cartas */}
            {/*
            <Link
              href="/submit-card"
              className="text-sm font-sans font-medium text-primary hover:text-primary/80 transition-all duration-200 hover:scale-105"
            >
              {t("submitCard")}
            </Link>
            */}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Botón de menú móvil */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label={t("openNavigationMenu") || "Abrir menú de navegación"}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Lorcana
                  </span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8">
                <Link 
                  href="/" 
                  className="text-base font-sans font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-2 hover:bg-muted rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("home")}
                </Link>
                <Link
                  href="/catalog"
                  className="text-base font-sans font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-2 hover:bg-muted rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("catalog")}
                </Link>
                <Link
                  href="/products"
                  className="text-base font-sans font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-2 hover:bg-muted rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Productos
                </Link>
                <Link
                  href="/news"
                  className="text-base font-sans font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-2 hover:bg-muted rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("news")}
                </Link>
                <Link
                  href="/contact"
                  className="text-base font-sans font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-2 hover:bg-muted rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("contact")}
                </Link>
                {/* TODO: Re-habilitar funcionalidad de envío de cartas */}
                {/*
                <Link
                  href="/submit-card"
                  className="text-base font-sans font-medium text-primary hover:text-primary/80 transition-colors px-2 py-2 hover:bg-muted rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("submitCard")}
                </Link>
                */}

                {/* User Menu Mobile */}
                {user ? (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center gap-2 px-2 py-2 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario"}
                          </span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/my-collection"
                      className="text-base font-sans font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-2 hover:bg-muted rounded-md flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Heart className="h-4 w-4" />
                      {t("myCollection")}
                    </Link>
                    <Link
                      href="/my-submissions"
                      className="text-base font-sans font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-2 hover:bg-muted rounded-md flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FileText className="h-4 w-4" />
                      {t("mySubmissions")}
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin/inventory"
                        className="text-base font-sans font-medium text-accent hover:text-accent/80 transition-colors px-2 py-2 hover:bg-muted rounded-md flex items-center gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Shield className="h-4 w-4" />
                        {t("adminPanel")}
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleSignOut()
                      }}
                      className="w-full text-left text-base font-sans font-medium text-destructive hover:text-destructive/80 transition-colors px-2 py-2 hover:bg-muted rounded-md flex items-center gap-2"
                      aria-label={t("signOut") || "Cerrar sesión"}
                    >
                      <LogOut className="h-4 w-4" />
                      {t("signOut")}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="text-base font-sans font-medium text-accent hover:text-accent/80 transition-colors px-2 py-2 hover:bg-muted rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("signIn")}
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="hidden lg:block w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder={t("search")} className="pl-9 bg-muted/50 border-border/50" />
            </div>
          </div>
          <ThemeToggle />
          <LanguageSelector />
          
          {/* User Menu or Login Button - Desktop */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 hidden md:flex font-semibold text-foreground border border-border hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200" 
                  aria-label="Abrir menú de usuario"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline-block">
                    {user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/my-collection")} className="cursor-pointer">
                  <Heart className="mr-2 h-4 w-4" />
                  {t("myCollection")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/my-submissions")} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  {t("mySubmissions")}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => router.push("/admin/inventory")} className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    {t("adminPanel")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 hidden md:flex font-semibold text-foreground border border-border hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              onClick={() => router.push("/login")}
              aria-label={t("signIn") || "Iniciar sesión"}
            >
              <User className="h-4 w-4" />
              <span className="hidden lg:inline-block">{t("signIn")}</span>
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative" 
            onClick={() => setCartOpen(true)}
            aria-label={t("openCart") || `Abrir carrito de compras${totalItems > 0 ? ` (${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'})` : ''}`}
          >
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
