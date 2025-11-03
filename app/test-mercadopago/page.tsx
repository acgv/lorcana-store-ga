"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CreditCard, CheckCircle } from "lucide-react"

export default function MercadoPagoCertificationTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleCreatePayment = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/payment/certification-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success && data.initPoint) {
        setResult(data)
        // Redirigir a Mercado Pago
        window.location.href = data.initPoint
      } else {
        alert('Error: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear el pago de certificación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">🎓 Test de Certificación Mercado Pago</CardTitle>
          <CardDescription>
            Endpoint especial para completar el desafío de certificación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Especificaciones del Producto:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <strong>ID:</strong> 1234 (4 dígitos)</li>
              <li>• <strong>Nombre:</strong> Dispositivo Punto de Venta</li>
              <li>• <strong>Descripción:</strong> Dispositivo de tienda móvil de comercio electrónico</li>
              <li>• <strong>Precio:</strong> $1,500 CLP</li>
              <li>• <strong>Cantidad:</strong> 1</li>
            </ul>
          </div>

          <div className="p-4 bg-primary/10 rounded-lg">
            <h3 className="font-semibold mb-2">Configuraciones Incluidas:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✅ Integrator ID: dev_24c65fb163bf11ea96500242ac130004</li>
              <li>✅ Cuotas máximas: 6</li>
              <li>✅ Visa excluida</li>
              <li>✅ Efectivo excluido</li>
              <li>✅ Webhook configurado</li>
              <li>✅ URLs de retorno configuradas</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded">
            <h3 className="font-semibold mb-2 text-amber-800 dark:text-amber-400">Datos de Prueba:</h3>
            <div className="text-sm space-y-1 text-amber-700 dark:text-amber-300">
              <p><strong>Tarjeta:</strong> 5031 7557 3453 0604</p>
              <p><strong>CVV:</strong> 123</p>
              <p><strong>Vencimiento:</strong> 11/25</p>
              <p><strong>Nombre:</strong> APRO</p>
              <p><strong>RUT:</strong> 11.111.111-1</p>
            </div>
          </div>

          {result && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500 rounded">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-green-800 dark:text-green-400">Preferencia Creada</h3>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Preference ID: {result.preferenceId}
              </p>
            </div>
          )}

          <Button 
            onClick={handleCreatePayment}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando Pago...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Crear Pago de Certificación
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Este pago usa las especificaciones exactas del desafío de Mercado Pago
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

