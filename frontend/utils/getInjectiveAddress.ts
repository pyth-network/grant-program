import { bech32 } from 'bech32'
import { removeLeading0x } from 'claim_sdk'
import { ethers } from 'ethers'

/**
 * Get injective address from Ethereum hex address
 *
 * @param ethAddress string
 * @returns string
 */
export const getInjectiveAddress = (ethAddress: string): string => {
  const addressBuffer = Buffer.from(removeLeading0x(ethAddress), 'hex')

  return bech32.encode('inj', bech32.toWords(addressBuffer))
}
