import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { ethers } from 'ethers'
import { removeLeading0x } from './index'

// Must be kept in line with the database types and the on-chain program
export type Ecosystem =
  | 'discord'
  | 'solana'
  | 'evm'
  | 'sui'
  | 'aptos'
  | 'cosmwasm'
  | 'injective'
export const Ecosystems: Ecosystem[] = [
  'discord',
  'solana',
  'evm',
  'sui',
  'aptos',
  'cosmwasm',
  'injective',
]

export class ClaimInfo {
  constructor(
    public ecosystem: Ecosystem,
    public identity: string,
    public amount: anchor.BN
  ) {}
}

export function getMaxAmount(claimInfos: ClaimInfo[]): anchor.BN {
  return claimInfos.reduce((prev, curr) => {
    return anchor.BN.max(prev, curr.amount)
  }, new anchor.BN(0))
}
