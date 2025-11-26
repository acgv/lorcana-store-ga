"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import Link from "next/link"
import { Sparkles, Send } from "lucide-react"

export default function HomePage() {
  const { t } = useLanguage()
  const [isMounted, setIsMounted] = useState(false)

  // Generate particles only once on client side - optimized for performance
  const particles = useMemo(() => {
    if (!isMounted) return []
    // Reduce particle count from 50 to 25 for better performance
    return [...Array(25)].map((_, i) => ({
      width: Math.random() * 4 + 1,
      height: Math.random() * 4 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 10 + 5,
      delay: Math.random() * 5,
    }))
  }, [isMounted])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-accent/10">
            <div className="absolute inset-0 opacity-30">
              {isMounted && particles.map((particle, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-primary/20"
                  style={{
                    width: `${particle.width}px`,
                    height: `${particle.height}px`,
                    left: `${particle.left}%`,
                    top: `${particle.top}%`,
                    animation: `float ${particle.duration}s ease-in-out infinite`,
                    animationDelay: `${particle.delay}s`,
                    willChange: 'transform',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                    perspective: '1000px',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-sans font-medium text-primary tracking-wide">Disney Lorcana TCG</span>
            </div>
            {/* LCP Element - Hero Title - Optimizado para carga rápida */}
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-black mb-8 text-balance leading-[0.9]">
              <span className="text-magical bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent inline-block">
                Comprar Cartas Lorcana en Chile
              </span>
            </h1>
            <p className="font-sans text-xl md:text-3xl text-muted-foreground/90 mb-10 max-w-3xl mx-auto text-pretty leading-relaxed font-light">
              {t("heroSubtitle")}
            </p>
            <Link href="/catalog">
              <Button size="lg" className="glow-border font-sans text-lg px-10 py-7 h-auto font-semibold tracking-wide shadow-2xl">
                {t("browseCatalog")}
              </Button>
            </Link>
          </div>
        </section>

        {/* Featured Section */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-8 text-center">Categorías Disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2 tracking-wide">Cartas Individuales</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-sans">
                {t("legendaryCardsDesc")}
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2 tracking-wide">Accesorios TCG</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-sans">
                {t("foilVariantsDesc")}
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2 tracking-wide">Sellos y Productos Sellados</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-sans">
                {t("advancedFiltersDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Por Qué Comprar con Nosotros */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-8 text-center">Por Qué Comprar con Nosotros</h2>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Stock actualizado, precios competitivos y envíos a todo Chile. Tu tienda de confianza para cartas Disney Lorcana.
            </p>
          </div>
        </section>

        {/* Call to Action - Submit Card */}
        {/* TODO: Re-habilitar funcionalidad de envío de cartas */}
        {/*
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="p-8 md:p-12 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
              <h2 className="font-display text-3xl md:text-4xl font-black mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {t("haveACard")}
              </h2>
              <p className="text-muted-foreground text-lg mb-6 font-sans">
                {t("haveACardDesc")}
              </p>
              <Link href="/submit-card">
                <Button size="lg" className="font-sans text-base px-8 py-6 glow-border">
                  <Send className="mr-2 h-5 w-5" />
                  {t("submitCard")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
        */}
      </main>
      <Footer />
    </div>
  )
}
