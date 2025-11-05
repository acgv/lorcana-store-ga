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
import { Loader2, Search } from "lucide-react"

export default function InspectPaymentPage() {
  const { toast } = useToast()
  const [paymentId, setPaymentId] = useState("131919510493")
  const [inspecting, setInspecting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleInspect = async () => {
    setInspecting(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/inspect-payment", {
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
          title: "✅ Payment Inspected",
          description: "Check the result below for fee information",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to inspect payment",
        })
      }
    } catch (error) {
      console.error("Error inspecting payment:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to inspect payment",
      })
    } finally {
      setInspecting(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <AdminHeader title="Payment Inspector" />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Inspect Payment from Mercado Pago</CardTitle>
                <CardDescription>
                  See ALL fields returned by Mercado Pago API to find fee information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="paymentId">Payment ID</Label>
                  <div className="flex gap-3">
                    <Input
                      id="paymentId"
                      value={paymentId}
                      onChange={(e) => setPaymentId(e.target.value)}
                      placeholder="131919510493"
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleInspect} 
                      disabled={inspecting || !paymentId}
                    >
                      {inspecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Inspecting...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Inspect
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {result && (
                  <>
                    {result.summary && (
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <h3 className="font-semibold mb-3 text-primary">Summary:</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Status:</p>
                            <p className="font-medium">{result.summary.status}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amount:</p>
                            <p className="font-medium">${result.summary.amount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Email:</p>
                            <p className="font-medium text-xs">{result.summary.email}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Net Amount:</p>
                            <p className="font-medium text-green-600">
                              {result.summary.possibleNetAmount === 'not found' 
                                ? '❌ Not found' 
                                : `✅ $${result.summary.possibleNetAmount}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {result.feeInfo && (
                      <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                        <h3 className="font-semibold mb-3 text-accent">Fee Information:</h3>
                        <pre className="text-xs overflow-auto max-h-64 bg-background p-3 rounded">
                          {JSON.stringify(result.feeInfo, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-2">Full Payment Object:</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Look for: fee_details, net_received_amount, transaction_details
                      </p>
                      <pre className="text-xs overflow-auto max-h-96 bg-background p-3 rounded">
                        {JSON.stringify(result.fullPayment, null, 2)}
                      </pre>
                    </div>
                  </>
                )}

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-600">
                    💡 <strong>Purpose:</strong> Find the exact field names that Mercado Pago uses for:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 ml-4 list-disc">
                    <li><code>net_received_amount</code> - Amount you actually receive (after fees)</li>
                    <li><code>fee_details</code> - Breakdown of Mercado Pago fees</li>
                    <li><code>transaction_details.net_received_amount</code> - Possible location</li>
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

