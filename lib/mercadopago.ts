/**
 * Mercado Pago Integration
 * 
 * Helper para manejar pagos con Mercado Pago
 */

import { MercadoPagoConfig, Preference } from 'mercadopago'

// Configurar cliente de Mercado Pago (solo en servidor)
let client: MercadoPagoConfig | null = null
let preferenceClient: Preference | null = null

function getClient() {
  if (!client && process.env.MERCADOPAGO_ACCESS_TOKEN) {
    client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
      }
    })
  }
  return client
}

function getPreferenceClient() {
  if (!preferenceClient) {
    const mpClient = getClient()
    if (mpClient) {
      preferenceClient = new Preference(mpClient)
    }
  }
  return preferenceClient
}

export interface CardItem {
  id: string
  name: string
  image: string
  price: number
  quantity: number
  version: 'normal' | 'foil'
}

export interface CreatePreferenceParams {
  items: CardItem[]
  customerEmail?: string
}

/**
 * Crear preferencia de pago en Mercado Pago
 */
export async function createPaymentPreference(params: CreatePreferenceParams) {
  const preferenceApi = getPreferenceClient()
  
  if (!preferenceApi) {
    throw new Error('Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN')
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'

  try {
    const preference = await preferenceApi.create({
      body: {
        items: params.items.map(item => ({
          id: item.id,
          title: `${item.name} (${item.version === 'foil' ? 'Foil' : 'Normal'})`,
          description: `Carta Lorcana: ${item.name}`,
          picture_url: item.image.startsWith('http') ? item.image : `${baseUrl}${item.image}`,
          category_id: 'trading_cards',
          quantity: item.quantity,
          // En CLP los precios deben ser enteros (sin decimales)
          unit_price: Math.round(item.price),
          currency_id: 'CLP',
        })),
        payer: params.customerEmail ? {
          email: params.customerEmail,
        } : undefined,
        back_urls: {
          success: `${baseUrl}/payment/success`,
          failure: `${baseUrl}/payment/failure`,
          pending: `${baseUrl}/payment/pending`,
        },
        auto_return: 'approved' as const,
        statement_descriptor: 'GA Company',
        external_reference: `order-${Date.now()}`,
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        // Integrator ID para el Programa de Partners
        integrator_id: process.env.MERCADOPAGO_INTEGRATOR_ID,
      }
    })

    return {
      success: true,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    }
  } catch (error) {
    console.error('Error creating Mercado Pago preference:', error)
    throw error
  }
}

/**
 * Obtener Public Key para el frontend
 */
export function getPublicKey() {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || ''
}

