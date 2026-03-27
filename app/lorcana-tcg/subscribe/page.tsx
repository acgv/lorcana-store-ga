"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useUser } from "@/hooks/use-user"
import { useCollection } from "@/hooks/use-collection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Crown, Check, X, Sparkles, Sword, BookOpen, Package,
  Download, Eye, Trophy, Loader2, Zap,
} from "lucide-react"

type AccessInfo = {
  isPro: boolean
  source: string
  maxDecks: number | null
  maxDailyGames: number | null
}

const FREE_FEATURES = [
  { icon: Sword, text: "3 partidas vs CPU por día", included: true },
  { icon: BookOpen, text: "2 mazos guardados", included: true },
  { icon: Package, text: "Tracking de cartas (Normal)", included: true },
  { icon: Trophy, text: "Insignias de logros", included: false },
  { icon: Eye, text: 'Tab "Me faltan"', included: false },
  { icon: Sparkles, text: "Tracking de Foil", included: false },
  { icon: Download, text: "Exportar colección CSV", included: false },
  { icon: Zap, text: "Valor de colección (CLP)", included: false },
]

const PRO_FEATURES = [
  { icon: Sword, text: "Partidas ilimitadas vs CPU", included: true },
  { icon: BookOpen, text: "Mazos ilimitados", included: true },
  { icon: Package, text: "Tracking de cartas (Normal)", included: true },
  { icon: Trophy, text: "Insignias de logros", included: true },
  { icon: Eye, text: 'Tab "Me faltan"', included: true },
  { icon: Sparkles, text: "Tracking de Foil", included: true },
  { icon: Download, text: "Exportar colección CSV", included: true },
  { icon: Zap, text: "Valor de colección (CLP)", included: true },
]

export default function SubscribePage() {
  const { user, loading: userLoading } = useUser()
  const { getAuthHeaders } = useCollection()
  const { toast } = useToast()

  const [access, setAccess] = useState<AccessInfo | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [changingMock, setChangingMock] = useState(false)

  useEffect(() => {
    if (user) loadAccess()
    else if (!userLoading) setLoadingAccess(false)
  }, [user, userLoading])

  const loadAccess = async () => {
    try {
      const headers = await getAuthHeaders()
      if (!headers) { setLoadingAccess(false); return }
      const res = await fetch("/api/subscription/me", { headers })
      const json = await res.json()
      if (json?.success) setAccess(json.data?.access ?? null)
    } catch {} finally {
      setLoadingAccess(false)
    }
  }

  const handleSubscribe = async () => {
    try {
      setSubscribing(true)
      const headers = await getAuthHeaders()
      if (!headers) {
        toast({ variant: "destructive", title: "Error", description: "Inicia sesión primero." })
        return
      }

      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers,
      })
      const json = await res.json()

      if (json?.success && json.data?.checkoutUrl) {
        window.location.href = json.data.checkoutUrl
        return
      }

      if (res.status === 503) {
        // Lemon Squeezy no configurado — fallback a mock para dev
        await setMockMode("pro")
        return
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: json?.error || "No se pudo iniciar el checkout.",
      })
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Error de conexión." })
    } finally {
      setSubscribing(false)
    }
  }

  const setMockMode = async (mode: "free" | "pro") => {
    try {
      setChangingMock(true)
      const headers = await getAuthHeaders()
      if (!headers) return
      const res = await fetch("/api/subscription/mock", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
      const json = await res.json()
      if (json?.success) {
        setAccess(json.data?.access ?? null)
        toast({
          title: mode === "pro" ? "Pro activado (mock)" : "Free activado",
          description: mode === "pro"
            ? "Lemon Squeezy no configurado. Se activó Pro en modo mock."
            : "Estás en plan Free con limitaciones.",
        })
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar el plan." })
    } finally {
      setChangingMock(false)
    }
  }

  const isPro = access?.isPro === true
  const isMockSource = access?.source === "mock"

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-16 max-w-5xl">

          {/* Hero */}
          <div className="text-center mb-12">
            <Badge className="mb-4 gap-1 px-3 py-1 text-sm" variant="secondary">
              <Crown className="h-3.5 w-3.5" /> Lorcana Pro
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Lleva tu experiencia al{" "}
              <span className="text-primary">siguiente nivel</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Desbloquea partidas ilimitadas, insignias, tracking completo de tu colección y mucho más.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">

            {/* Free Plan */}
            <Card className={`relative ${!isPro ? "ring-2 ring-primary" : ""}`}>
              {!isPro && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3">
                  Tu plan actual
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">Free</CardTitle>
                <CardDescription>Para empezar a explorar</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground ml-1">/ mes</span>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {FREE_FEATURES.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      {f.included ? (
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={f.included ? "" : "text-muted-foreground/60"}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
                {isPro && isMockSource && (
                  <Button
                    variant="outline"
                    className="w-full mt-8"
                    onClick={() => setMockMode("free")}
                    disabled={changingMock}
                  >
                    {changingMock ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Cambiar a Free (mock)
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className={`relative border-primary/50 bg-gradient-to-b from-primary/5 to-transparent ${isPro ? "ring-2 ring-primary" : ""}`}>
              {isPro && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3">
                  Tu plan actual
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5 text-primary" /> Pro
                </CardTitle>
                <CardDescription>Para coleccionistas y jugadores serios</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$2.990</span>
                  <span className="text-muted-foreground ml-1">CLP / mes</span>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {PRO_FEATURES.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <f.icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium">{f.text}</span>
                    </li>
                  ))}
                </ul>
                {!isPro ? (
                  user ? (
                    <Button
                      className="w-full mt-8 gap-2"
                      onClick={handleSubscribe}
                      disabled={subscribing}
                    >
                      {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                      Suscribirme a Pro
                    </Button>
                  ) : (
                    <Button className="w-full mt-8 gap-2" asChild>
                      <Link href="/lorcana-tcg/login?redirect=/lorcana-tcg/subscribe">
                        Inicia sesión para suscribirte
                      </Link>
                    </Button>
                  )
                ) : (
                  <div className="mt-8 space-y-2 text-center">
                    <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-1">
                      <Check className="h-4 w-4" /> Pro activo
                      {isMockSource && <Badge variant="secondary" className="text-[10px] ml-1">mock</Badge>}
                    </p>
                    {isMockSource && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMockMode("free")}
                        disabled={changingMock}
                      >
                        {changingMock ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Volver a Free
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Feature Comparison Table */}
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">Comparación detallada</h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-4 font-medium">Función</th>
                    <th className="text-center p-4 font-medium w-28">Free</th>
                    <th className="text-center p-4 font-medium w-28 text-primary">
                      <span className="flex items-center justify-center gap-1">
                        <Crown className="h-3.5 w-3.5" /> Pro
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <CompRow label="Partidas vs CPU / día" free="3" pro="Ilimitadas" />
                  <CompRow label="Mazos guardados" free="2" pro="Ilimitados" />
                  <CompRow label="Tracking Normal" free={true} pro={true} />
                  <CompRow label="Tracking Foil" free={false} pro={true} />
                  <CompRow label="Insignias de logros" free={false} pro={true} />
                  <CompRow label="Valor de colección" free={false} pro={true} />
                  <CompRow label='Tab "Me faltan"' free={false} pro={true} />
                  <CompRow label="Exportar CSV" free={false} pro={true} />
                  <CompRow label="Desafío diario" free={true} pro={true} />
                  <CompRow label="Evento semanal" free={true} pro={true} />
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Preguntas frecuentes</h2>
            <div className="space-y-4">
              <FaqItem
                q="¿Puedo cancelar en cualquier momento?"
                a="Sí. Puedes cancelar tu suscripción cuando quieras y seguirás con Pro hasta el final del periodo pagado."
              />
              <FaqItem
                q="¿Pierdo mis datos si bajo a Free?"
                a="No. Tus mazos, colección y estadísticas se mantienen. Solo se aplican los límites de Free (no podrás crear más mazos ni ver ciertas funciones hasta que vuelvas a Pro)."
              />
              <FaqItem
                q="¿Qué métodos de pago aceptan?"
                a="Aceptamos tarjetas de crédito/débito y otros métodos de pago internacionales a través de Lemon Squeezy."
              />
              <FaqItem
                q="¿El tracking de colección Free tiene límite de cartas?"
                a="No. Puedes trackear todas las cartas normales que quieras en Free. El tracking de versiones Foil y la exportación CSV son exclusivos de Pro."
              />
            </div>
          </div>

          {/* Loading state */}
          {loadingAccess && (
            <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50 pointer-events-none">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function CompRow({
  label,
  free,
  pro,
}: {
  label: string
  free: boolean | string
  pro: boolean | string
}) {
  const render = (v: boolean | string) => {
    if (typeof v === "string") return <span className="font-medium">{v}</span>
    return v ? (
      <Check className="h-4 w-4 text-green-500 mx-auto" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
    )
  }
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="p-4">{label}</td>
      <td className="p-4 text-center">{render(free)}</td>
      <td className="p-4 text-center">{render(pro)}</td>
    </tr>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border">
      <button
        className="w-full text-left p-4 font-medium flex items-center justify-between hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {q}
        <span className="text-muted-foreground text-lg shrink-0 ml-4">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground">
          {a}
        </div>
      )}
    </div>
  )
}
