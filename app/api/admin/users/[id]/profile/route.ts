import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"
import { verifyAdmin } from "@/lib/auth"
import { isValidRut, normalizeRut } from "@/lib/rut"

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * PATCH - Actualizar RUT (documento) del usuario en user_profiles.
 * Body: { rut: string } — RUT chileno válido, o "" para borrar.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || "Unauthorized" },
        { status: adminCheck.status || 401 }
      )
    }

    const { id } = await params
    const userId = id

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID format." },
        { status: 400 }
      )
    }

    const body = await request.json()
    const rutInput = typeof body?.rut === "string" ? body.rut.trim() : ""

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server not configured" },
        { status: 500 }
      )
    }

    // Si envían vacío, borrar documento
    if (rutInput === "") {
      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update({ document_type: null, document_number: null })
        .eq("user_id", userId)

      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json({ success: true, data: { rut: null } })
        }
        console.error("Error clearing RUT:", error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true, data: { rut: null } })
    }

    if (!isValidRut(rutInput)) {
      return NextResponse.json(
        { success: false, error: "RUT inválido. Revisa el formato y el dígito verificador." },
        { status: 400 }
      )
    }

    const documentNumber = normalizeRut(rutInput)

    const { data: existing } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update({
          document_type: "RUT",
          document_number: documentNumber,
        })
        .eq("user_id", userId)

      if (error) {
        console.error("Error updating RUT:", error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
    } else {
      const { error } = await supabaseAdmin.from("user_profiles").insert({
        user_id: userId,
        document_type: "RUT",
        document_number: documentNumber,
      })

      if (error) {
        console.error("Error inserting profile with RUT:", error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: { rut: documentNumber },
    })
  } catch (error) {
    console.error("Error in PATCH /api/admin/users/[id]/profile:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
