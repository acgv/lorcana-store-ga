import { NextResponse } from 'next/server'

export async function GET() {
  const hasPublicKey = !!process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
  const hasAccessToken = !!process.env.MERCADOPAGO_ACCESS_TOKEN
  const hasIntegratorId = !!process.env.MERCADOPAGO_INTEGRATOR_ID
  
  return NextResponse.json({
    configured: hasPublicKey && hasAccessToken,
    details: {
      publicKey: hasPublicKey ? 'Configured ✅' : 'Missing ❌',
      accessToken: hasAccessToken ? 'Configured ✅' : 'Missing ❌',
      integratorId: hasIntegratorId ? 'Configured ✅' : 'Missing ❌',
    },
    // Mostrar primeros caracteres para verificar
    preview: {
      publicKey: hasPublicKey ? process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.substring(0, 20) + '...' : null,
      accessToken: hasAccessToken ? process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 20) + '...' : null,
    }
  })
}

