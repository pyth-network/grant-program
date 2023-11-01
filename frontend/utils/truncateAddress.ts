export const truncateAddress = (address: string | undefined) => {
  const windowWidth = window.innerWidth
  const mobile = windowWidth < 600

  if (!address || address.length < 20) return address
  if (mobile) return `${address.slice(0, 3)}...${address.slice(-2)}`
  return `${address.slice(0, 6)}...${address.slice(-5)}`
}
