import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { getClient } from '@/lib/mercadopago'

/**
 * Endpoint para inspeccionar un pago de Mercado Pago y ver TODOS sus campos
 * Útil para descubrir qué datos nos proporciona MP (fees, net amount, etc.)
 * 
 * Usage: POST /api/admin/inspect-payment
 * Body: { paymentId: "131919510493" }
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Inspecting payment: ${paymentId}`)

    const client = getClient()
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Mercado Pago not configured' },
        { status: 500 }
      )
    }

    const paymentClient = new Payment(client)
    const payment = await paymentClient.get({ id: paymentId })

    // Log EVERYTHING to see what fields exist
    console.log('📦 FULL PAYMENT OBJECT:', JSON.stringify(payment, null, 2))

    // Campos que probablemente contienen info de fees:
    const feeInfo = {
      // Campos comunes de Mercado Pago
      transaction_amount: payment.transaction_amount,
      transaction_amount_refunded: payment.transaction_amount_refunded,
      net_received_amount: (payment as any).net_received_amount,
      total_paid_amount: (payment as any).total_paid_amount,
      
      // Fee details
      fee_details: (payment as any).fee_details,
      
      // Transaction details
      transaction_details: payment.transaction_details,
      
      // Otros campos relacionados
      marketplace_fee: (payment as any).marketplace_fee,
      shipping_cost: (payment as any).shipping_cost,
      
      // Info adicional
      status: payment.status,
      status_detail: payment.status_detail,
      payment_method_id: payment.payment_method_id,
      payment_type_id: payment.payment_type_id,
    }

    console.log('💰 FEE INFORMATION:', JSON.stringify(feeInfo, null, 2))

    return NextResponse.json({
      success: true,
      paymentId,
      fullPayment: payment,
      feeInfo,
      summary: {
        id: payment.id,
        status: payment.status,
        amount: payment.transaction_amount,
        email: payment.payer?.email,
        // Intentar extraer fees
        possibleNetAmount: (payment as any).net_received_amount || 'not found',
        possibleFeeDetails: (payment as any).fee_details || 'not found',
        transactionDetails: payment.transaction_details || 'not found',
      }
    })

  } catch (error) {
    console.error('❌ Error inspecting payment:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Payment Inspector Endpoint',
    usage: 'POST with { paymentId: "xxx" }',
    purpose: 'See ALL fields from Mercado Pago payment object'
  })
}

