import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { LanguageProvider } from "@/components/language-provider"
import { CartProvider } from "@/components/cart-provider"

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
  title: "Lorcana Singles - Find Your Perfect Card",
  description: "Discover, filter and collect your favorite Disney Lorcana TCG single cards",
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
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <LanguageProvider>
          <CartProvider>{children}</CartProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
