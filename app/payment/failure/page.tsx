"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react"

export default function PaymentFailurePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-destructive/10 rounded-full">
                <XCircle className="h-16 w-16 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Pago No Procesado</CardTitle>
            <CardDescription className="text-lg mt-2">
              Hubo un problema al procesar tu pago
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Posibles razones:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Fondos insuficientes</li>
                <li>Datos de tarjeta incorrectos</li>
                <li>Transacción rechazada por el banco</li>
                <li>Cancelación manual del pago</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href="/catalog" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Catálogo
                </Button>
              </Link>
              <Button 
                className="flex-1" 
                onClick={() => window.history.back()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Intentar Nuevamente
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-4">
              Si el problema persiste, contáctanos por WhatsApp al{" "}
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

