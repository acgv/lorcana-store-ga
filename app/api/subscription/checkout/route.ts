import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

const LS_API = "https://api.lemonsqueezy.com/v1"

/**
 * Crea un checkout de Lemon Squeezy para suscribirse a Lorcana Pro.
 * Envía custom_data.user_id para que el webhook vincule la suscripción.
 */
export async function POST(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID
  const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  if (!apiKey || !storeId || !variantId) {
    return NextResponse.json(
      { success: false, error: "Lemon Squeezy no está configurado. Completa las variables de entorno." },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${LS_API}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: auth.email || undefined,
              custom: {
                user_id: auth.userId,
              },
            },
            product_options: {
              redirect_url: `${appUrl}/lorcana-tcg/subscribe/success`,
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: storeId },
            },
            variant: {
              data: { type: "variants", id: variantId },
            },
          },
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("Lemon Squeezy checkout error:", res.status, errText)
      return NextResponse.json(
        { success: false, error: "No se pudo crear el checkout. Intenta de nuevo." },
        { status: 502 }
      )
    }

    const json = await res.json()
    const checkoutUrl = json?.data?.attributes?.url

    if (!checkoutUrl) {
      console.error("Lemon Squeezy checkout: no URL in response", json)
      return NextResponse.json(
        { success: false, error: "Respuesta inesperada de Lemon Squeezy." },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, data: { checkoutUrl } })
  } catch (e) {
    console.error("Lemon Squeezy checkout exception:", e)
    return NextResponse.json(
      { success: false, error: "Error de conexión con Lemon Squeezy." },
      { status: 502 }
    )
  }
}
