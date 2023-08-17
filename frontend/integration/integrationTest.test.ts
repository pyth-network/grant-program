import * as anchor from '@coral-xyz/anchor'
import { expect } from '@jest/globals'
import {
  addTestWalletsToDatabase,
  clearDatabase,
  getDatabasePool,
} from '../utils/db'
import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import * as splToken from '@solana/spl-token'
import { Token } from '@solana/spl-token'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { QueryParams, TokenDispenserProvider } from '../claim_sdk/solana'
import { TestWallet } from '../claim_sdk/testWallets'
import { loadTestWallets } from '../claim_sdk/testWallets'
//TODO: update this
const tokenDispenserProgramId = new anchor.web3.PublicKey(
  'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
)
const pool = getDatabasePool()

describe('integration test', () => {
  let root: Buffer
  let testWallets: Record<Ecosystem, TestWallet[]>

  beforeAll(async () => {
    await clearDatabase(pool)
    testWallets = await loadTestWallets()
    root = await addTestWalletsToDatabase(pool, await loadTestWallets())
  })

  afterAll(async () => {
    await clearDatabase(pool)
    await pool.end()
  })

  describe('Api test', () => {
    it('returns the correct amount for a claim', async () => {
      const result = await pool.query(
        'SELECT amount FROM claims WHERE ecosystem = $1 AND identity = $2',
        ['evm', testWallets.evm[0].address()]
      )

      expect(result.rows[0].amount).toBe('3000000')
    })
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
      expect(configAccount.merkleRoot).toEqual(Array.from(root))
      expect(configAccount.mint).toEqual(mint.publicKey)
      expect(configAccount.treasury).toEqual(treasury)
      expect(configAccount.dispenserGuard).toEqual(dispenserGuard.publicKey)
    })

    it('submits an evm claim', async () => {
      const queryParams: QueryParams = ['evm', testWallets.evm[0].address()]
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

      const signedMessage = await testWallets.evm[0].signMessage(
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

      expect(claimantFund.amount.eq(new anchor.BN(3000000))).toBeTruthy()
    }, 40000)

    it('submits a cosmwasm claim', async () => {
      const queryParams: QueryParams = [
        'cosmwasm',
        testWallets.cosmwasm[0].address(),
      ]
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

      const signedMessage = await testWallets.cosmwasm[0].signMessage(
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

      expect(
        claimantFund.amount.eq(new anchor.BN(3000000 + 6000000))
      ).toBeTruthy()
    }, 40000)

    it('submits multiple claims at once', async () => {
      const queryParamsArr: {
        wallet: TestWallet
        queryParams: QueryParams
      }[] = [
        {
          wallet: testWallets.cosmwasm[1],
          queryParams: ['cosmwasm', testWallets.cosmwasm[1].address()],
        },
        {
          wallet: testWallets.cosmwasm[2],
          queryParams: ['cosmwasm', testWallets.cosmwasm[2].address()],
        },
      ]
      const claims = await Promise.all(
        queryParamsArr.map(async ({ wallet, queryParams }) => {
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
          const signedMessage = await wallet.signMessage(
            tokenDispenserProvider.generateAuthorizationPayload()
          )
          return {
            claimInfo,
            proofOfInclusion: proof,
            signedMessage,
          }
        })
      )

      await tokenDispenserProvider.submitClaims(claims)

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(
          claims[0].claimInfo
        )
      ).toBeTruthy()

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(
          claims[1].claimInfo
        )
      ).toBeTruthy()

      const claimantFundPubkey =
        await tokenDispenserProvider.getClaimantFundAddress()

      const claimantFund = await mint.getAccountInfo(claimantFundPubkey)

      expect(
        claimantFund.amount.eq(
          new anchor.BN(3000000 + 6000000 + 6100000 + 6200000)
        )
      ).toBeTruthy()
    })
  })
})
