"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, Layers, Sparkles, Target, Shield, Zap, Trophy } from "lucide-react"

export default function AboutPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Título principal */}
          <div className="text-center mb-8 md:mb-12">
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">Aprende a Jugar Disney Lorcana</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Guía completa para principiantes y jugadores avanzados. Aprende las reglas, cómo armar tu mazo y domina todas las variantes del juego.
            </p>
          </div>

          {/* Navegación rápida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <a href="#como-jugar" className="block">
              <Card className="hover:shadow-md transition-shadow h-full cursor-pointer hover:border-primary">
                <CardHeader className="text-center">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <CardTitle className="text-base">Cómo Jugar</CardTitle>
                </CardHeader>
              </Card>
            </a>
            <a href="#illumineers-quest" className="block">
              <Card className="hover:shadow-md transition-shadow h-full cursor-pointer hover:border-primary">
                <CardHeader className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <CardTitle className="text-base">Illumineer's Quest</CardTitle>
                </CardHeader>
              </Card>
            </a>
            <a href="#armar-mazo" className="block">
              <Card className="hover:shadow-md transition-shadow h-full cursor-pointer hover:border-primary">
                <CardHeader className="text-center">
                  <Layers className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <CardTitle className="text-base">Armar un Mazo</CardTitle>
                </CardHeader>
              </Card>
            </a>
            <a href="#variantes" className="block">
              <Card className="hover:shadow-md transition-shadow h-full cursor-pointer hover:border-primary">
                <CardHeader className="text-center">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <CardTitle className="text-base">Variantes</CardTitle>
                </CardHeader>
              </Card>
            </a>
          </div>

          {/* Sección 1: Cómo jugar Disney Lorcana */}
          <section id="como-jugar" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">Cómo Jugar Disney Lorcana</h2>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Objetivo del Juego</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  El objetivo es ser el primer jugador en acumular <strong className="text-foreground">20 puntos de Lore</strong>. 
                  Los jugadores invocan personajes Disney como Glimmers, usan objetos y cantan canciones para superar desafíos y ganar Lore.
                </p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Preparación</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-primary">1.</span>
                      <span>Cada jugador necesita un <strong className="text-foreground">mazo de 60 cartas</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">2.</span>
                      <span>Baraja tu mazo y roba 7 cartas iniciales</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">3.</span>
                      <span>Puedes hacer mulligan (devolver y robar nuevas cartas) una vez</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">4.</span>
                      <span>Prepara un contador para el Lore (0-20)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Estructura del Turno</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-primary">1.</span>
                      <span><strong className="text-foreground">Fase Inicial:</strong> Endereza tus cartas y roba 1 carta</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">2.</span>
                      <span><strong className="text-foreground">Fase Principal:</strong> Juega cartas, usa habilidades, genera Lore</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">3.</span>
                      <span><strong className="text-foreground">Combate:</strong> Puedes atacar con personajes o hacer challenges</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">4.</span>
                      <span><strong className="text-foreground">Fin del Turno:</strong> Pasa el turno al siguiente jugador</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Conceptos Clave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Ink (Tinta)</h4>
                    <p className="text-xs text-muted-foreground">
                      Recurso para jugar cartas. Puedes poner 1 carta en tu Inkwell por turno. Algunas cartas son "Inkable" (tienen brillo).
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Glimmers</h4>
                    <p className="text-xs text-muted-foreground">
                      Versiones alternativas de personajes Disney que invocas. Cada uno tiene habilidades únicas y valores de fuerza.
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Challenge (Desafío)</h4>
                    <p className="text-xs text-muted-foreground">
                      Atacar a un personaje rival. Ambos personajes se hacen daño igual a su fuerza. Esto ayuda a controlar el tablero.
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Quest (Búsqueda)</h4>
                    <p className="text-xs text-muted-foreground">
                      Usar un personaje para generar Lore. El personaje se agota y ganas puntos de Lore igual a su valor de Lore.
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Exert (Agotar)</h4>
                    <p className="text-xs text-muted-foreground">
                      Girar una carta para usarla (Quest o Challenge). Las cartas agotadas no pueden ser usadas hasta que se enderecen.
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Ready (Enderezar)</h4>
                    <p className="text-xs text-muted-foreground">
                      Al inicio de tu turno, todas tus cartas agotadas se enderezan y pueden volver a usarse.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Sección 2: Illumineer's Quest */}
          <section id="illumineers-quest" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">Illumineer's Quest</h2>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>¿Qué es Illumineer's Quest?</CardTitle>
                <CardDescription>Modo cooperativo para 1-4 jugadores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Illumineer's Quest</strong> es una variante cooperativa donde los jugadores trabajan juntos 
                  para derrotar a un villano controlado por el juego. En lugar de competir entre sí, todos los Illumineers colaboran para completar 
                  desafíos y vencer al enemigo común.
                </p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Objetivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Los jugadores deben trabajar juntos para cumplir las condiciones de victoria específicas de cada misión, 
                    como derrotar al villano, proteger objetivos o alcanzar cierta cantidad de Lore como equipo.
                  </p>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-xs font-medium text-primary">
                      💡 Tip: La comunicación y estrategia en equipo son clave para ganar.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Diferencias Clave</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Los jugadores <strong className="text-foreground">comparten el objetivo</strong> de victoria</span>
                    </li>
                    <li className="flex gap-2">
                      <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>El villano actúa automáticamente según reglas del escenario</span>
                    </li>
                    <li className="flex gap-2">
                      <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Se pueden usar <strong className="text-foreground">habilidades de equipo</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Dificultad ajustable según el número de jugadores</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cómo Jugar Illumineer's Quest</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <strong className="text-foreground">Elige un Escenario:</strong> Cada misión tiene un villano específico y condiciones de victoria/derrota únicas.
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <strong className="text-foreground">Prepara el Tablero:</strong> Coloca las cartas del villano, los objetivos y cualquier elemento especial del escenario.
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <strong className="text-foreground">Turnos de Jugadores:</strong> Los jugadores juegan por turnos como en el juego estándar, pero coordinando estrategias.
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                    <div>
                      <strong className="text-foreground">Fase del Villano:</strong> Después de cada ronda de jugadores, el villano actúa según sus reglas automáticas.
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>
                    <div>
                      <strong className="text-foreground">Victoria o Derrota:</strong> El equipo gana si completa el objetivo antes de que se activen las condiciones de derrota.
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </section>

          {/* Sección 3: Cómo armar un mazo */}
          <section id="armar-mazo" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <Layers className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">Cómo Armar un Mazo</h2>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Reglas de Construcción de Mazo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <span className="text-2xl">60</span>
                      <span className="text-sm">Cartas Exactas</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Tu mazo debe tener exactamente 60 cartas. Ni más, ni menos.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <span className="text-2xl">1-2</span>
                      <span className="text-sm">Colores de Tinta</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Puedes usar cartas de 1 o 2 colores de tinta diferentes.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <span className="text-2xl">4</span>
                      <span className="text-sm">Máximo por Carta</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      No puedes tener más de 4 copias de una carta con el mismo nombre.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <span className="text-2xl">✨</span>
                      <span className="text-sm">Cartas Únicas</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Personajes con el mismo nombre pero diferentes versiones cuentan para el límite de 4.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Los 6 Colores de Tinta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded">
                    <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">🟡 Amber</h4>
                    <p className="text-xs text-muted-foreground">Sanación, protección y apoyo</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border-l-4 border-purple-500 rounded">
                    <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-1">🟣 Amethyst</h4>
                    <p className="text-xs text-muted-foreground">Magia, control y habilidades</p>
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 rounded">
                    <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">🟢 Emerald</h4>
                    <p className="text-xs text-muted-foreground">Astucia, disrupción y trucos</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded">
                    <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1">🔴 Ruby</h4>
                    <p className="text-xs text-muted-foreground">Agresión, velocidad y daño</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 rounded">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">🔵 Sapphire</h4>
                    <p className="text-xs text-muted-foreground">Recursos, robo de cartas y estrategia</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-l-4 border-slate-500 rounded">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-400 mb-1">⚪ Steel</h4>
                    <p className="text-xs text-muted-foreground">Defensa, resistencia y fuerza</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Rarezas de Cartas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-l-4 border-slate-500 rounded">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-400 mb-1 flex items-center gap-2">
                      <span className="text-lg">⚫</span>
                      Common
                    </h4>
                    <p className="text-xs text-muted-foreground">Las más comunes y fáciles de conseguir</p>
                  </div>
                  <div className="p-4 bg-stone-50 dark:bg-stone-950/20 border-l-4 border-stone-500 rounded">
                    <h4 className="font-semibold text-stone-700 dark:text-stone-400 mb-1 flex items-center gap-2">
                      <span className="text-lg">🟤</span>
                      Uncommon
                    </h4>
                    <p className="text-xs text-muted-foreground">Poco comunes, moderadamente raras</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 rounded">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-2">
                      <span className="text-lg">🔷</span>
                      Rare
                    </h4>
                    <p className="text-xs text-muted-foreground">Raras, difíciles de obtener</p>
                  </div>
                  <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 border-l-4 border-cyan-500 rounded">
                    <h4 className="font-semibold text-cyan-700 dark:text-cyan-400 mb-1 flex items-center gap-2">
                      <span className="text-lg">💎</span>
                      Super Rare
                    </h4>
                    <p className="text-xs text-muted-foreground">Super raras, muy valiosas</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded">
                    <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-2">
                      <span className="text-lg">👑</span>
                      Legendary
                    </h4>
                    <p className="text-xs text-muted-foreground">Legendarias, extremadamente raras</p>
                  </div>
                  <div className="p-4 bg-violet-50 dark:bg-violet-950/20 border-l-4 border-violet-500 rounded">
                    <h4 className="font-semibold text-violet-700 dark:text-violet-400 mb-1 flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      Enchanted
                    </h4>
                    <p className="text-xs text-muted-foreground">Encantadas, las más raras y buscadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consejos para Armar tu Primer Mazo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Trophy className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Equilibrio de Curva de Mana</h4>
                      <p className="text-xs text-muted-foreground">
                        Incluye cartas de diferentes costos de tinta: ~20 cartas de 1-2 tinta, ~25 de 3-4 tinta, ~15 de 5+ tinta.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Trophy className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Cartas Inkables</h4>
                      <p className="text-xs text-muted-foreground">
                        Asegúrate de que al menos 30-35 cartas sean Inkables (tengan el símbolo brillante) para no quedarte sin recursos.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Trophy className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Generadores de Lore</h4>
                      <p className="text-xs text-muted-foreground">
                        Incluye personajes con buenos valores de Lore (2-3 puntos) para avanzar rápidamente hacia la victoria.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Trophy className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Sinergia de Cartas</h4>
                      <p className="text-xs text-muted-foreground">
                        Busca cartas que funcionen bien juntas. Por ejemplo, si tienes muchos personajes de "Princesas", usa cartas que las potencien.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Trophy className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Mezcla de Tipos</h4>
                      <p className="text-xs text-muted-foreground">
                        Balancea personajes, objetos, acciones y canciones. Aproximadamente: 35-40 personajes, 10-15 objetos, 10-15 acciones/canciones.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Sección 4: Variantes de Juego */}
          <section id="variantes" className="mb-12 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">Variantes de Juego</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>1 vs 1 (Estándar)</CardTitle>
                  <CardDescription>La forma clásica de jugar</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Dos jugadores se enfrentan cara a cara. El primero en alcanzar 20 Lore gana. Esta es la variante competitiva principal.
                  </p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium">⏱️ Duración: 20-30 minutos</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Multijugador (Free-for-All)</CardTitle>
                  <CardDescription>3-4 jugadores</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Múltiples jugadores compiten entre sí. El primero en alcanzar 20 Lore gana. Los turnos rotan en orden.
                  </p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium">⏱️ Duración: 40-60 minutos</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Equipos (2v2)</CardTitle>
                  <CardDescription>Juego por parejas</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Dos equipos de dos jugadores cada uno. Los compañeros se sientan uno al lado del otro y comparten el objetivo de Lore.
                  </p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium">⏱️ Duración: 30-45 minutos</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Draft / Sealed</CardTitle>
                  <CardDescription>Formato limitado</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Los jugadores abren boosters y construyen mazos de 40 cartas con lo que obtienen. Perfecto para eventos de tienda.
                  </p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium">📦 Requiere: 6 boosters por jugador</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Banner final */}
          <div className="mt-12 p-6 md:p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
            <h2 className="font-serif text-xl md:text-2xl font-bold mb-3 text-center">
              ¿Listo para Empezar?
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-6">
              Ahora que conoces las reglas, es hora de armar tu mazo y empezar a jugar. 
              Explora nuestro catálogo de cartas singles y construye tu estrategia perfecta.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/catalog"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Sparkles className="h-5 w-5" />
                Ver Catálogo de Cartas
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium"
              >
                ¿Tienes Preguntas?
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

