import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cómo Jugar Disney Lorcana – Guía Completa para Principiantes",
  description: "Aprende a jugar Disney Lorcana con esta guía fácil para principiantes. Reglas básicas, tipos de cartas, cómo construir un mazo y consejos para empezar en el TCG oficial.",
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

