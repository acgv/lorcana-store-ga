"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, ArrowRight, Mail } from "lucide-react"

export default function PaymentPendingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-amber-500/10 rounded-full">
                <Clock className="h-16 w-16 text-amber-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Pago Pendiente</CardTitle>
            <CardDescription className="text-lg mt-2">
              Tu pago está siendo procesado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Estamos procesando tu pago</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Recibirás un correo de confirmación una vez que el pago sea aprobado. 
                    Esto puede tomar algunos minutos dependiendo del método de pago utilizado.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded">
              <p className="text-sm text-amber-800 dark:text-amber-400">
                <strong>Nota:</strong> Si pagaste mediante transferencia bancaria o efectivo, 
                el proceso puede tomar hasta 48 horas hábiles.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href="/lorcana-tcg/catalog" className="flex-1">
                <Button variant="outline" className="w-full">
                  Ver Catálogo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/lorcana-tcg" className="flex-1">
                <Button className="w-full">
                  Volver al Inicio
                </Button>
              </Link>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-4">
              ¿Necesitas ayuda? Contáctanos por WhatsApp al{" "}
              <a href="https://wa.me/56951830357" className="text-primary hover:underline">
                +56 9 5183 0357
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

