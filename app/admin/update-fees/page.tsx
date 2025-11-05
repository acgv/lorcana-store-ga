"use client"

import { useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw } from "lucide-react"

export default function UpdateFeesPage() {
  const { toast } = useToast()
  const [updating, setUpdating] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleUpdateAll = async () => {
    setUpdating(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/update-order-fees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updateAll: true }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        toast({
          title: "✅ Orders Updated",
          description: `Updated ${data.summary.updated} orders with real MP fee data`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to update orders",
        })
      }
    } catch (error) {
      console.error("Error updating orders:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update orders",
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <AdminHeader title="Update Order Fees" />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Update Existing Orders with Real Fees</CardTitle>
                <CardDescription>
                  Fetch real fee data from Mercado Pago for existing orders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-600 mb-2">
                    📝 <strong>What this does:</strong>
                  </p>
                  <ul className="text-xs text-muted-foreground ml-4 list-disc space-y-1">
                    <li>Finds all orders without fee data (mp_fee_amount = 0 or null)</li>
                    <li>Fetches payment details from Mercado Pago API</li>
                    <li>Extracts: fee_details[0].amount and transaction_details.net_received_amount</li>
                    <li>Updates orders table with REAL fee data</li>
                  </ul>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-sm text-orange-600">
                    ⚠️ <strong>Before running:</strong>
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 ml-4 list-disc">
                    <li>Make sure you ran: scripts/add-fee-columns-to-orders.sql in Supabase</li>
                    <li>This will update your 2 existing orders (131919510493, etc.)</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleUpdateAll} 
                  disabled={updating}
                  className="w-full"
                  size="lg"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating Orders...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update All Orders with Real Fees
                    </>
                  )}
                </Button>

                {result && (
                  <div className="space-y-4">
                    {result.summary && (
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <h3 className="font-semibold mb-2 text-primary">Summary:</h3>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total:</p>
                            <p className="font-bold">{result.summary.total}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Updated:</p>
                            <p className="font-bold text-green-600">{result.summary.updated}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Failed:</p>
                            <p className="font-bold text-red-600">{result.summary.failed}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-2">Details:</h3>
                      <pre className="text-xs overflow-auto max-h-96 bg-background p-3 rounded">
                        {JSON.stringify(result.results, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-600">
                    ✅ <strong>After updating:</strong>
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 ml-4 list-disc">
                    <li>Go to /admin/orders</li>
                    <li>Net Revenue card will show EXACT amounts</li>
                    <li>No more estimations - 100% real data from Mercado Pago</li>
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

