"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Instagram, Twitter, Youtube, Newspaper } from "lucide-react"
import Script from "next/script"

export default function NewsPage() {
  const { t } = useLanguage()

  useEffect(() => {
    // Cargar script de Instagram embebido
    if (window.instgrm) {
      window.instgrm.Embeds.process()
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Scripts de redes sociales */}
      <Script
        async
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
      />

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">{t("news")}</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Mantente al día con las últimas noticias y anuncios oficiales de Disney Lorcana
            </p>
          </div>

          {/* Sección de fuentes oficiales */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              Fuentes Oficiales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    <CardTitle className="text-base">Instagram</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm space-y-1">
                    <div>
                      <a 
                        href="https://instagram.com/disneylorcana" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        @disneylorcana
                      </a>
                    </div>
                    <div>
                      <a 
                        href="https://instagram.com/ravensburgerna" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        @ravensburgerna
                      </a>
                    </div>
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Twitter className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">Twitter/X</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    <a 
                      href="https://twitter.com/DisneyLorcana" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      @DisneyLorcana
                    </a>
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-base">YouTube</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    <a 
                      href="https://www.youtube.com/@RavensburgerGames" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      @RavensburgerGames
                    </a>
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Newspaper className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Sitios Web</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm space-y-1">
                    <div>
                      <a 
                        href="https://www.disneylorcana.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        disneylorcana.com
                      </a>
                    </div>
                    <div>
                      <a 
                        href="https://www.ravensburger.us/en-US" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        ravensburger.us
                      </a>
                    </div>
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Feeds embebidos de Instagram */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Instagram Feed - Disney Lorcana */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Instagram @disneylorcana
              </h2>
              <div className="bg-card rounded-lg border p-4 overflow-hidden">
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink="https://www.instagram.com/disneylorcana/"
                  data-instgrm-version="14"
                  style={{
                    background: '#FFF',
                    border: 0,
                    borderRadius: '3px',
                    boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
                    margin: '1px',
                    maxWidth: '100%',
                    minWidth: '326px',
                    padding: 0,
                    width: 'calc(100% - 2px)',
                  }}
                >
                  <div style={{ padding: '16px' }}>
                    <a
                      href="https://www.instagram.com/disneylorcana/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#FFFFFF',
                        lineHeight: 0,
                        padding: '0 0',
                        textAlign: 'center',
                        textDecoration: 'none',
                        width: '100%',
                      }}
                    >
                      Ver en Instagram
                    </a>
                  </div>
                </blockquote>
              </div>
            </div>

            {/* Instagram Feed - Ravensburger */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Instagram @ravensburgerna
              </h2>
              <div className="bg-card rounded-lg border p-4 overflow-hidden">
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink="https://www.instagram.com/ravensburgerna/"
                  data-instgrm-version="14"
                  style={{
                    background: '#FFF',
                    border: 0,
                    borderRadius: '3px',
                    boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
                    margin: '1px',
                    maxWidth: '100%',
                    minWidth: '326px',
                    padding: 0,
                    width: 'calc(100% - 2px)',
                  }}
                >
                  <div style={{ padding: '16px' }}>
                    <a
                      href="https://www.instagram.com/ravensburgerna/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#FFFFFF',
                        lineHeight: 0,
                        padding: '0 0',
                        textAlign: 'center',
                        textDecoration: 'none',
                        width: '100%',
                      }}
                    >
                      Ver en Instagram
                    </a>
                  </div>
                </blockquote>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-12 p-6 md:p-8 bg-muted rounded-lg">
            <h2 className="font-serif text-xl md:text-2xl font-bold mb-3 text-center">
              ¿Quieres más información?
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto">
              Visita{" "}
              <a
                href="https://www.disneylorcana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                Disney Lorcana
              </a>
              {" "}o{" "}
              <a
                href="https://www.ravensburger.us/en-US"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                Ravensburger
              </a>
              {" "}para conocer los últimos anuncios, reglas del juego, y productos oficiales.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
