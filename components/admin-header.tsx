"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useUser } from "@/hooks/use-user"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { LogOut, User, Users, Package, ShoppingBag, FileText, Activity, Wrench, Tag, Truck, TrendingUp } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AdminHeaderProps {
  title?: string
}

export function AdminHeader({ title = "Lorcana Admin" }: AdminHeaderProps) {
  const { user: adminUser, logout } = useAuth()
  const { user: googleUser, signOut: userSignOut } = useUser()
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  
  // SSR-safe state for display name
  const [displayName, setDisplayName] = useState("Admin")
  const [displayEmail, setDisplayEmail] = useState("admin@gacompany.cl")
  const [mounted, setMounted] = useState(false)

  // Update display name only on client
  useEffect(() => {
    setMounted(true)
    
    const savedName = localStorage.getItem('user_name')
    const savedEmail = localStorage.getItem('user_email')
    
    const name = googleUser?.user_metadata?.name || 
                 googleUser?.user_metadata?.full_name || 
                 savedName ||
                 googleUser?.email?.split('@')[0] ||
                 adminUser?.email?.split('@')[0] ||
                 "Admin"
    
    const email = googleUser?.email || 
                  savedEmail ||
                  adminUser?.email || 
                  "admin@gacompany.cl"
    
    setDisplayName(name)
    setDisplayEmail(email)
  }, [googleUser, adminUser])

  const handleLogout = async () => {
    // Limpiar todos los datos de sesión
    localStorage.removeItem("admin_token")
    localStorage.removeItem("user_name")
    localStorage.removeItem("user_email")
    document.cookie = "admin_token=; path=/; max-age=0"
    
    // Cerrar sesión de Google OAuth si existe
    if (googleUser) {
      await userSignOut()
    }
    
    // Redirigir a la home con sesión cerrada
    router.push("/lorcana-tcg")
  }

  const navItems = [
    { href: "/admin/inventory", labelKey: "catalog", icon: Package },
    { href: "/admin/orders", labelKey: "orders", icon: ShoppingBag },
    { href: "/admin/submissions", labelKey: "products", icon: FileText },
    { href: "/admin/users", labelKey: "allUsers", icon: Users },
    { href: "/admin/logs", labelKey: "actions", icon: Activity },
    { href: "/admin/promotions", labelKey: "promotions", icon: Tag },
    { href: "/admin/shipping", labelKey: "shipping", icon: Truck },
  ]

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-3xl font-black tracking-wide">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {title}
            </span>
          </h1>
          <nav className="flex items-center gap-4">
            <Link href="/lorcana-tcg">
              <Button variant="ghost" className="font-sans">
                {t("viewStore")}
              </Button>
            </Link>
            
            {/* Siempre mostrar el botón de logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 border border-border hover:border-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:border-orange-500"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline" suppressHydrationWarning>
                    {mounted ? displayName : "Admin"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs text-muted-foreground" suppressHydrationWarning>
                  {mounted ? displayEmail : "admin@gacompany.cl"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* Admin Navigation */}
        <nav className="flex gap-2 overflow-x-auto pb-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 whitespace-nowrap"
                >
                  <Icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Button>
              </Link>
            )
          })}
          
          {/* Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={pathname.includes('/admin/process-payment') || pathname.includes('/admin/inspect-payment') || pathname.includes('/admin/update-fees') || pathname.includes('/admin/email-test') ? "default" : "ghost"}
                size="sm"
                className="gap-2 whitespace-nowrap"
              >
                <Wrench className="h-4 w-4" />
                {t("tools")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>{t("adminTools")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/update-fees" className="cursor-pointer">
                  {t("updateOrderFees")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/process-payment" className="cursor-pointer">
                  {t("processPayment")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/inspect-payment" className="cursor-pointer">
                  {t("inspectPayment")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/email-test" className="cursor-pointer">
                  Enviar Correo de Prueba
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/compare-prices" className="cursor-pointer">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Comparativa Precios
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  )
}

