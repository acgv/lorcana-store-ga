"use client"

import { useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Play } from "lucide-react"

export default function ProcessPaymentPage() {
  const { toast } = useToast()
  const [paymentId, setPaymentId] = useState("131919510493")
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleProcess = async () => {
    setProcessing(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/process-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentId }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        toast({
          title: "✅ Payment Processed",
          description: `Successfully processed payment ${paymentId}`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to process payment",
        })
      }
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process payment",
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <AdminHeader title="Process Payment Manually" />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Manual Payment Processing</CardTitle>
                <CardDescription>
                  Process a payment that didn't trigger the webhook correctly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="paymentId">Payment ID from Mercado Pago</Label>
                  <Input
                    id="paymentId"
                    value={paymentId}
                    onChange={(e) => setPaymentId(e.target.value)}
                    placeholder="131919510493"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the payment ID from Mercado Pago (collection_id from success URL)
                  </p>
                </div>

                <Button 
                  onClick={handleProcess} 
                  disabled={processing || !paymentId}
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Process Payment
                    </>
                  )}
                </Button>

                {result && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Result:</h3>
                    <pre className="text-xs overflow-auto max-h-96 bg-background p-3 rounded">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-sm text-orange-600">
                    ⚠️ <strong>Note:</strong> This is a temporary tool to process payments that missed the webhook.
                    After processing, check:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 ml-4 list-disc">
                    <li>Stock was updated in Inventory</li>
                    <li>Order appears in Orders section</li>
                    <li>Activity log was created</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        
        <Footer />
      </div>
    </AuthGuard>
  )
}

