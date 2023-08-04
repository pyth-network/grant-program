export const truncateAddress = (address: string | undefined) => {
  if (!address || address.length < 20) return address
  return `${address.slice(0, 6)}...${address.slice(-5)}`
}
