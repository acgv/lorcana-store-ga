import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contacto – GA Company Lorcana Store Chile",
  description: "¿Necesitas ayuda con tu compra de cartas Lorcana? Contáctanos aquí. Soporte rápido, horarios de atención y medios de comunicación para clientes en Chile.",
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

