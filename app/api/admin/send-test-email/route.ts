import { NextRequest, NextResponse } from "next/server"
import { sendTestEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, message } = body

    // Validar que se proporcione un correo
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json(
        { success: false, error: "Email address is required and must be valid" },
        { status: 400 }
      )
    }

    // Enviar correo de prueba
    const result = await sendTestEmail(to, subject, message)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${to}`,
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to send test email" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in send-test-email API:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

