// import "../claim_sdk/merkleTree"
import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import * as anchor from '@coral-xyz/anchor'

const sample_data: ClaimInfo[] = [
  {
    ecosystem: 'evm',
    // TODO: make this a real key
    identity: '0x1234',
    amount: new anchor.BN(1234),
  },
  {
    ecosystem: 'solana',
    // TODO: make this a real key
    identity: 'Abc12',
    amount: new anchor.BN(5678),
  },
]
