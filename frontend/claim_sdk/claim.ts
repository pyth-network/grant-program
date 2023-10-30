import * as anchor from '@coral-xyz/anchor'

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

  /** Get the serialized form of this claim info that is stored as leaves in the merkle tree. */
  public toBuffer(): Buffer {
    return Buffer.from(this.identity, 'utf-8')
  }
}

export function getMaxAmount(claimInfos: ClaimInfo[]): anchor.BN {
  return claimInfos.reduce((prev, curr) => {
    return anchor.BN.max(prev, curr.amount)
  }, new anchor.BN(0))
}
