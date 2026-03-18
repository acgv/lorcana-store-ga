/**
 * Utilidades para RUT chileno (formato y dígito verificador módulo 11).
 */

export function normalizeRut(rut: string): string {
  return rut.replace(/\./g, "").replace(/-/g, "").replace(/\s+/g, "").toUpperCase()
}

export function isValidRut(rutRaw: string): boolean {
  const rut = normalizeRut(rutRaw)
  if (!/^\d{7,8}[0-9K]$/.test(rut)) return false

  const body = rut.slice(0, -1)
  const dv = rut.slice(-1)

  let sum = 0
  let multiplier = 2

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = 11 - (sum % 11)
  let expectedDV: string

  if (remainder === 11) expectedDV = "0"
  else if (remainder === 10) expectedDV = "K"
  else expectedDV = String(remainder)

  return dv === expectedDV
}

/** Formatea RUT como 12.345.678-9 (opcional). */
export function formatRut(rutRaw: string): string {
  const rut = normalizeRut(rutRaw)
  if (rut.length < 8) return rutRaw
  const body = rut.slice(0, -1)
  const dv = rut.slice(-1)
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${withDots}-${dv}`
}
