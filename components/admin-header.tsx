"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { LogOut, User, Package, ShoppingBag, FileText, Activity } from "lucide-react"
import { usePathname } from "next/navigation"
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
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const handleLogout = () => {
    // Limpiar todo
    localStorage.removeItem("admin_token")
    document.cookie = "admin_token=; path=/; max-age=0"
    // Redirigir
    window.location.href = "/admin/login"
  }

  const navItems = [
    { href: "/admin/inventory", label: "Inventario", icon: Package },
    { href: "/admin/orders", label: "Órdenes", icon: ShoppingBag },
    { href: "/admin/submissions", label: "Submissions", icon: FileText },
    { href: "/admin/logs", label: "Logs", icon: Activity },
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
            <Link href="/">
              <Button variant="ghost" className="font-sans">
                View Store
              </Button>
            </Link>
            
            {/* Siempre mostrar el botón de logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.email || "Admin"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user?.email || "admin@gacompany.cl"}
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
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

