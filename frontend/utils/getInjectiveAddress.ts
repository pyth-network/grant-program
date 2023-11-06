import { Address } from 'ethereumjs-util'
import { bech32 } from 'bech32'

/**
 * Get injective address from Ethereum hex address
 *
 * @param ethAddress string
 * @returns string
 */
export const getInjectiveAddress = (ethAddress: string): string => {
  const addressBuffer = Address.fromString(ethAddress.toString()).toBuffer()

  return bech32.encode('inj', bech32.toWords(addressBuffer))
}
