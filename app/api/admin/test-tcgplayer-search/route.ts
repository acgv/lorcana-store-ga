import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/auth"

// GET: Probar búsqueda en TCGPlayer/CardMarket para una carta específica
export async function GET(request: NextRequest) {
  try {
    // Verificar que el usuario sea admin
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status || 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cardName = searchParams.get("cardName") || "Ariel - On Human Legs"
    const setId = searchParams.get("setId") // ej: "TFC"
    const cardNumber = searchParams.get("cardNumber") ? parseInt(searchParams.get("cardNumber")!) : undefined
    const setName = searchParams.get("setName") // ej: "The First Chapter"

    console.log(`🔍 Probando búsqueda para: ${cardName}`)

    const rapidApiKey = process.env.RAPIDAPI_KEY
    if (!rapidApiKey) {
      return NextResponse.json({
        success: false,
        error: "RAPIDAPI_KEY no configurada",
      })
    }

    const results: any[] = []

    // Probar diferentes formatos de búsqueda
    const searchVariations = [
      cardName, // Nombre completo
      cardName.split(" - ")[0], // Solo el nombre principal (ej: "Ariel")
      cardName.replace(" - ", " "), // Sin guión
      cardName.toLowerCase(), // Minúsculas
      encodeURIComponent(cardName), // URL encoded
    ]

    // Construir endpoints - priorizar set y número si están disponibles
    const endpoints: string[] = []
    
    if (setId && cardNumber) {
      // Búsqueda por set y número (más exacto)
      endpoints.push(
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?set=${setId}&number=${cardNumber}`,
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?set=${setId}&cardNumber=${cardNumber}`,
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?number=${cardNumber}&set=${setId}`,
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?search=${setId}-${cardNumber}`,
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?search=${setId} ${cardNumber}`,
        `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?number=${cardNumber}`
      )
    }
    
    // Agregar endpoints con búsqueda por nombre
    endpoints.push(
      `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?search=${encodeURIComponent(cardName)}`,
      `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?sort=episode_newest&search=${encodeURIComponent(cardName)}`,
      `https://cardmarket-api-tcg.p.rapidapi.com/lorcana/products?sort=episode_newest`
    )

    const headers = {
      "x-rapidapi-key": rapidApiKey,
      "x-rapidapi-host": "cardmarket-api-tcg.p.rapidapi.com",
    }

    // Probar cada endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Probando endpoint: ${endpoint}`)
        const response = await fetch(endpoint, { headers })

        const result: any = {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        }

        if (response.ok) {
          const data = await response.json()
          result.data = data
          result.dataType = Array.isArray(data) ? "array" : typeof data
          result.dataKeys = typeof data === "object" ? Object.keys(data) : null

          // Intentar encontrar la carta en los resultados
          if (Array.isArray(data)) {
            result.matchingCards = data
              .filter((item: any) => {
                const name = (item.name || item.productName || item.title || "").toLowerCase()
                const searchName = cardName.toLowerCase()
                return name.includes(searchName) || searchName.includes(name.split(" - ")[0])
              })
              .slice(0, 5) // Primeros 5 resultados
          } else if (data.products && Array.isArray(data.products)) {
            result.matchingCards = data.products
              .filter((item: any) => {
                const name = (item.name || item.productName || item.title || "").toLowerCase()
                const searchName = cardName.toLowerCase()
                return name.includes(searchName) || searchName.includes(name.split(" - ")[0])
              })
              .slice(0, 5)
          } else if (data.results && Array.isArray(data.results)) {
            result.matchingCards = data.results
              .filter((item: any) => {
                const name = (item.name || item.productName || item.title || "").toLowerCase()
                const searchName = cardName.toLowerCase()
                return name.includes(searchName) || searchName.includes(name.split(" - ")[0])
              })
              .slice(0, 5)
          }
        } else {
          const errorText = await response.text()
          result.error = errorText
        }

        results.push(result)

        // Pequeño delay entre requests
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        results.push({
          endpoint,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // También probar búsqueda directa en TCGPlayer si hay otra API disponible
    return NextResponse.json({
      success: true,
      cardName,
      searchParams: {
        setId,
        cardNumber,
        setName,
      },
      searchVariations,
      results,
      summary: {
        totalEndpoints: endpoints.length,
        successful: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        foundMatches: results.some((r) => r.matchingCards && r.matchingCards.length > 0),
      },
    })
  } catch (error) {
    console.error("Error in test-tcgplayer-search:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

