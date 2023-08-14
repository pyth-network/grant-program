import * as anchor from '@coral-xyz/anchor'
import { expect } from '@jest/globals'
import { getDatabasePool } from '../utils/db'
import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import { MerkleTree } from '../claim_sdk/merkleTree'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import * as splToken from '@solana/spl-token'
import { Token } from '@solana/spl-token'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import * as path from 'path'
import { Buffer } from 'buffer'
import { QueryParams, TokenDispenserProvider } from '../claim_sdk/solana'
import { TestEvmWallet } from '../claim_sdk/ecosystems/signatures.test'
//TODO: update this
const tokenDispenserProgramId = new anchor.web3.PublicKey(
  'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
)
const pool = getDatabasePool()

describe('integration test', () => {
  let merkleTree: MerkleTree
  // TODO: load this in from local keys directory
  const solanaClaimant = anchor.web3.Keypair.generate()
  const evmPrivateKeyPath = path.resolve(__dirname, 'keys/evm_private_key.json')
  // public key: 0xb80Eb09f118ca9Df95b2DF575F68E41aC7B9E2f8
  const evmWallet = TestEvmWallet.fromKeyfile(evmPrivateKeyPath)
  let root: number[]
  beforeAll(async () => {
    // TODO: run database migrations here. This seems difficult with node-pg-migrate though.
    // clear the pool before each test
    await pool.query('DELETE FROM claims', [])

    const sampleData: any[] = [
      ['solana', solanaClaimant.publicKey.toString(), 1000],
      ['evm', evmWallet.address().toString(), 2000],
      // ['aptos', '0x7e7544df4fc42107d4a60834685dfd9c1e6ff048f49fe477bc19c1551299d5cb', 3000],
      // ['cosmwasm', 'cosmos1lv3rrn5trdea7vs43z5m4y34d5r3zxp484wcpu', 4000]
    ]

    const leaves = sampleData.map((value) => {
      const claimInfo = new ClaimInfo(
        value[0],
        value[1],
        new anchor.BN(value[2])
      )
      return claimInfo.toBuffer()
    })

    merkleTree = new MerkleTree(leaves)
    root = Array.from(merkleTree.root)
    for (let i = 0; i < sampleData.length; i++) {
      const proof = merkleTree.prove(leaves[i])!
      const datum = sampleData[i]

      await pool.query(
        'INSERT INTO claims VALUES($1::ecosystem_type, $2, $3, $4)',
        [datum[0], datum[1], datum[2], proof]
      )
    }
  })

  afterAll(async () => {
    await pool.query('DELETE FROM claims', [])
    await pool.end()
  })

  describe('token dispenser e2e', () => {
    const walletKeypair = anchor.web3.Keypair.generate()
    const wallet = new NodeWallet(walletKeypair)
    const tokenDispenserProvider = new TokenDispenserProvider(
      'http://localhost:8899',
      wallet,
      tokenDispenserProgramId,
      {
        skipPreflight: true,
        preflightCommitment: 'processed',
        commitment: 'processed',
      }
    )

    const dispenserGuard = anchor.web3.Keypair.generate()
    const mintAuthority = anchor.web3.Keypair.generate()

    let mint: Token
    let treasury: PublicKey
    beforeAll(async () => {
      const airdropTxn = await tokenDispenserProvider.connection.requestAirdrop(
        walletKeypair.publicKey,
        LAMPORTS_PER_SOL
      )
      await tokenDispenserProvider.connection.confirmTransaction({
        signature: airdropTxn,
        ...(await tokenDispenserProvider.connection.getLatestBlockhash()),
      })
      const walletBalance = await tokenDispenserProvider.connection.getBalance(
        walletKeypair.publicKey
      )
      expect(walletBalance).toEqual(LAMPORTS_PER_SOL)

      mint = await splToken.Token.createMint(
        tokenDispenserProvider.connection,
        walletKeypair,
        mintAuthority.publicKey,
        null,
        6,
        splToken.TOKEN_PROGRAM_ID
      )

      treasury = await mint.createAccount(mintAuthority.publicKey)
      await mint.mintTo(treasury, mintAuthority, [], 1000000000)
      await mint.approve(
        treasury,
        tokenDispenserProvider.getConfigPda()[0],
        mintAuthority,
        [],
        1000000000
      )
    }, 10000)

    it('initializes the token dispenser', async () => {
      const [_, configBump] = tokenDispenserProvider.getConfigPda()
      await tokenDispenserProvider.initialize(
        root,
        mint.publicKey,
        treasury,
        dispenserGuard.publicKey
      )

      const configAccount = await tokenDispenserProvider.getConfig()

      expect(configAccount.bump).toEqual(configBump)
      expect(configAccount.merkleRoot).toEqual(root)
      expect(configAccount.mint).toEqual(mint.publicKey)
      expect(configAccount.treasury).toEqual(treasury)
      expect(configAccount.dispenserGuard).toEqual(dispenserGuard.publicKey)
    })

    it('submits a claim', async () => {
      const queryParams: QueryParams = ['evm', evmWallet.address()]
      const result = await pool.query(
        'SELECT amount, proof_of_inclusion FROM claims WHERE ecosystem = $1 AND identity = $2',
        queryParams
      )

      const proof: Buffer = result.rows[0].proof_of_inclusion
      const claimInfo = new ClaimInfo(
        queryParams[0],
        queryParams[1],
        new anchor.BN(result.rows[0].amount)
      )

      const signedMessage = await evmWallet.signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      await tokenDispenserProvider.submitClaims([
        {
          claimInfo,
          proofOfInclusion: proof,
          signedMessage,
        },
      ])

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(claimInfo)
      ).toBeTruthy()

      const claimantFundPubkey =
        await tokenDispenserProvider.getClaimantFundAddress()

      const claimantFund = await mint.getAccountInfo(claimantFundPubkey)

      expect(claimantFund.amount.eq(new anchor.BN(2000))).toBeTruthy()
    }, 20000)
  })
})
