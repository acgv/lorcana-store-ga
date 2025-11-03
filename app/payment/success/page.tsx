"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, ArrowRight, Package } from "lucide-react"

function SuccessContent() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('payment_id')
  const externalReference = searchParams.get('external_reference')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-500/10 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">¡Pago Exitoso!</CardTitle>
            <CardDescription className="text-lg mt-2">
              Tu compra ha sido procesada correctamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {paymentId && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">ID de Pago</p>
                <p className="font-mono text-sm mt-1">{paymentId}</p>
              </div>
            )}
            
            {externalReference && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Número de Orden</p>
                <p className="font-mono text-sm mt-1">{externalReference}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">¿Qué sigue?</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Recibirás un correo de confirmación con los detalles de tu compra. 
                    Nos pondremos en contacto contigo para coordinar la entrega.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href="/catalog" className="flex-1">
                <Button variant="outline" className="w-full">
                  Ver Catálogo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button className="w-full">
                  Volver al Inicio
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SuccessContent />
    </Suspense>
  )
}

