"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useUser } from "@/hooks/use-user"
import { useCollection } from "@/hooks/use-collection"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Crown, Check, Loader2, Sparkles, Sword, BookOpen } from "lucide-react"

export default function SubscribeSuccessPage() {
  const { user, loading: userLoading } = useUser()
  const { getAuthHeaders } = useCollection()
  const [status, setStatus] = useState<"loading" | "active" | "pending">("loading")
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (user) checkSubscription()
  }, [user])

  const checkSubscription = async () => {
    try {
      const headers = await getAuthHeaders()
      if (!headers) { setStatus("pending"); return }

      const res = await fetch("/api/subscription/me", { headers })
      const json = await res.json()
      const isPro = json?.data?.access?.isPro === true

      if (isPro) {
        setStatus("active")
      } else if (attempts < 5) {
        // Webhook may not have arrived yet — retry
        setAttempts((a) => a + 1)
        setTimeout(checkSubscription, 3000)
      } else {
        setStatus("pending")
      }
    } catch {
      setStatus("pending")
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="container mx-auto px-4 py-16 max-w-lg">
          {status === "loading" || userLoading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Verificando tu suscripción...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Esto puede tomar unos segundos.
                </p>
              </CardContent>
            </Card>
          ) : status === "active" ? (
            <Card className="border-primary/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                  <Check className="h-10 w-10 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                  <Crown className="h-7 w-7 text-primary" /> Bienvenido a Pro
                </h1>
                <p className="text-muted-foreground text-center mb-8 max-w-sm">
                  Tu suscripción está activa. Ya tienes acceso a todas las funciones de Lorcana Pro.
                </p>

                <div className="grid grid-cols-1 gap-3 w-full max-w-xs mb-8">
                  <div className="flex items-center gap-3 text-sm">
                    <Sword className="h-4 w-4 text-primary shrink-0" />
                    Partidas ilimitadas
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    Mazos ilimitados
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    Todas las funciones desbloqueadas
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button className="flex-1 gap-2" asChild>
                    <Link href="/lorcana-tcg/play">
                      <Sword className="h-4 w-4" /> Jugar ahora
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href="/lorcana-tcg/my-collection">
                      Mi Colección
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                  <Crown className="h-10 w-10 text-amber-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Procesando tu suscripción</h1>
                <p className="text-muted-foreground text-center mb-8 max-w-sm">
                  Tu pago fue recibido. La activación puede tardar unos minutos mientras procesamos el webhook.
                  Puedes refrescar esta página o continuar navegando.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStatus("loading")
                      setAttempts(0)
                      checkSubscription()
                    }}
                  >
                    Verificar de nuevo
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link href="/lorcana-tcg">
                      Ir al inicio
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
