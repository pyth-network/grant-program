export function removeLeading0x(s: string): string {
  if (s.startsWith('0x')) {
    return s.substring(2)
  }

  return s
}
