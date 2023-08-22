export function removeLeading0x(s: string): string {
  if (s.startsWith('0x')) {
    return s.substring(2)
  }

  return s
}

export function envOrErr(env: string): string {
  const val = process.env[env]
  if (!val) {
    throw new Error(`environment variable "${env}" must be set`)
  }
  return String(process.env[env])
}
