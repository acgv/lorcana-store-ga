import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Catálogo Lorcana Chile – Cartas Individuales y Accesorios TCG",
  description: "Explora nuestro catálogo de cartas Disney Lorcana. Tenemos comunes, raras, super raras, legendarias y promos. Stock real y precios actualizados. Compra desde Chile con total confianza.",
}

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

