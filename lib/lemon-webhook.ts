import crypto from "node:crypto"

/**
 * Verifica X-Signature de Lemon Squeezy (HMAC SHA-256 del cuerpo en hex).
 * @see https://docs.lemonsqueezy.com/help/webhooks/signing-requests
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!secret || !signatureHeader) return false
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  const received = signatureHeader.trim()
  if (expected.length !== received.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8"))
  } catch {
    return false
  }
}
