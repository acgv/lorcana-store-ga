"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Plus, 
  List, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  Info,
  Users,
  Target,
  Zap
} from "lucide-react"
import Link from "next/link"

function MyDecksContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [activeTab, setActiveTab] = useState("guide")

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/lorcana-tcg/login")
    }
  }, [user, userLoading, router])

  if (userLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null // Será redirigido
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-black text-balance tracking-tight leading-none mb-2">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Mis Mazos
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Aprende a armar mazos y crea los tuyos para jugar Lorcana
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Guía de Mazos
            </TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Crear Mazo
            </TabsTrigger>
          </TabsList>

          {/* Tab: Guía de Mazos */}
          <TabsContent value="guide" className="space-y-6">
            {/* Introducción */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  ¿Qué es un Mazo?
                </CardTitle>
                <CardDescription>
                  Aprende los conceptos básicos para armar tu primer mazo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">
                  Un <strong>mazo</strong> es un conjunto de cartas que usas para jugar una partida de Disney Lorcana TCG. 
                  Cada mazo debe cumplir ciertas reglas para ser válido en el juego.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    <strong>💡 Tip:</strong> Un buen mazo tiene una estrategia clara y cartas que trabajan juntas 
                    para lograr tu objetivo de victoria.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reglas Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Reglas Básicas de un Mazo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">60 Cartas Exactas</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tu mazo debe tener exactamente <strong>60 cartas</strong>. No más, no menos.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Máximo 4 Copias</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Puedes incluir hasta <strong>4 copias</strong> de la misma carta (excepto cartas únicas).
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">2 Colores Máximo</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tu mazo puede usar hasta <strong>2 colores</strong> (ink types) diferentes.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Sin Límite de Rareza</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Puedes usar cualquier rareza (Common, Rare, Legendary, etc.) sin restricciones.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tipos de Mazos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5 text-primary" />
                  Tipos de Mazos
                </CardTitle>
                <CardDescription>
                  Diferentes estrategias para diferentes estilos de juego
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">⚔️ Mazo Agresivo (Aggro)</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Enfocado en atacar rápidamente y ganar antes de que el oponente se establezca.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Cartas de bajo costo</Badge>
                      <Badge variant="outline">Muchos personajes</Badge>
                      <Badge variant="outline">Ataque rápido</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">🛡️ Mazo Control</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Controla el juego, elimina amenazas y gana con cartas poderosas al final.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Eliminación</Badge>
                      <Badge variant="outline">Cartas de alto costo</Badge>
                      <Badge variant="outline">Control del campo</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">⚖️ Mazo Midrange</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Balance entre agresión temprana y poder tardío. Versátil y adaptable.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Balanceado</Badge>
                      <Badge variant="outline">Versátil</Badge>
                      <Badge variant="outline">Adaptable</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">🎯 Mazo Combo</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Construido alrededor de una combinación específica de cartas para ganar.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Sinergias</Badge>
                      <Badge variant="outline">Combinaciones</Badge>
                      <Badge variant="outline">Cartas clave</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Consejos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Consejos para Armar tu Primer Mazo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 list-decimal list-inside">
                  <li className="text-foreground">
                    <strong>Elige 1-2 colores:</strong> Comienza con colores que te gusten o que tengan sinergia.
                  </li>
                  <li className="text-foreground">
                    <strong>Define tu estrategia:</strong> ¿Quieres atacar rápido, controlar o hacer combos?
                  </li>
                  <li className="text-foreground">
                    <strong>Curva de costos:</strong> Incluye cartas de diferentes costos (bajo, medio, alto).
                  </li>
                  <li className="text-foreground">
                    <strong>Usa 4 copias de tus cartas clave:</strong> Aumenta la consistencia de tu mazo.
                  </li>
                  <li className="text-foreground">
                    <strong>Prueba y ajusta:</strong> Juega con tu mazo y ajusta según lo que funcione.
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* CTA para crear mazo */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold">¿Listo para crear tu primer mazo?</h3>
                  <p className="text-muted-foreground">
                    Usa las cartas de tu colección para armar un mazo personalizado
                  </p>
                  <Button 
                    onClick={() => setActiveTab("builder")}
                    className="gap-2"
                  >
                    Crear Mi Primer Mazo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Constructor de Mazos */}
          <TabsContent value="builder" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Constructor de Mazos</CardTitle>
                <CardDescription>
                  Crea y guarda tus mazos usando las cartas de tu colección
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">Constructor en Desarrollo</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Estamos trabajando en el constructor de mazos. Pronto podrás crear, guardar y compartir tus mazos.
                  </p>
                  <div className="pt-4">
                    <Link href="/lorcana-tcg/my-collection">
                      <Button variant="outline" className="gap-2">
                        Ver Mi Colección
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  )
}

export default function MyDecksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <MyDecksContent />
    </Suspense>
  )
}

