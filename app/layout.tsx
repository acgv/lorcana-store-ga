import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import Script from "next/script"
import "./globals.css"
import { LanguageProvider } from "@/components/language-provider"
import { CartProvider } from "@/components/cart-provider"
import { ThemeProvider } from "@/components/theme-provider"

// Fuente display elegante SOLO para títulos grandes (estilo Disney Lorcana)
const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-display",
  style: ["normal", "italic"]
})

// Fuente Inter para TODO lo demás (suave y moderna)
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800", "900"]
})

export const metadata: Metadata = {
  title: "Comprar Cartas Lorcana en Chile – GA Company TCG Store",
  description: "Tienda online de tarjetas Disney Lorcana en Chile. Cartas individuales, boosters, accesorios y más. Stock actualizado, buenos precios y envíos a todo Chile. Revisa nuestro catálogo ahora.",
  generator: "v0.app",
  icons: {
    icon: '/logo-ga.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "GA Company TCG Store",
    "url": "https://www.gacompany.cl",
    "description": "Tienda online especializada en cartas Disney Lorcana en Chile. Venta de cartas individuales, productos sellados y accesorios TCG.",
    "image": "https://www.gacompany.cl/logo-ga.jpg",
    "currenciesAccepted": "CLP",
    "paymentAccepted": "CreditCard, DebitCard, Transfer",
    "areaServed": "CL",
    "sameAs": []
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Preconnect para fuentes de Google */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preconnect para API de imágenes de Lorcana */}
        <link rel="preconnect" href="https://api.lorcana.ravensburger.com" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <Script
          id="store-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider>
          <LanguageProvider>
            <CartProvider>{children}</CartProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
