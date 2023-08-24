import * as anchor from '@coral-xyz/anchor'
import { expect } from '@jest/globals'
import {
  addTestWalletsToDatabase,
  clearDatabase,
  getDatabasePool,
} from '../utils/db'
import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import { Token } from '@solana/spl-token'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { TokenDispenserProvider, airdrop } from '../claim_sdk/solana'
import {
  DiscordTestWallet,
  TestWallet,
  loadAnchorWallet,
} from '../claim_sdk/testWallets'
import { loadTestWallets } from '../claim_sdk/testWallets'
import { NextApiRequest, NextApiResponse } from 'next'
import {
  getAmountAndProofRoute,
  handleAmountAndProofResponse,
} from '../utils/api'
import handlerAmountAndProof from '../pages/api/grant/v1/amount_and_proof'

const pool = getDatabasePool()

export class NextApiResponseMock {
  public jsonBody: any
  public statusCode: number = 0

  json(jsonBody: any) {
    this.jsonBody = jsonBody
  }

  status(statusCode: number): NextApiResponseMock {
    this.statusCode = statusCode
    return this
  }
}

/** fetchAmountAndProof but for tests */
export async function mockFetchAmountAndProof(
  ecosystem: Ecosystem,
  identity: string
): Promise<
  { claimInfo: ClaimInfo; proofOfInclusion: Uint8Array[] } | undefined
> {
  const req: NextApiRequest = {
    url: getAmountAndProofRoute(ecosystem, identity),
    query: { ecosystem, identity },
  } as unknown as NextApiRequest
  const res = new NextApiResponseMock()

  await handlerAmountAndProof(req, res as unknown as NextApiResponse)
  return handleAmountAndProofResponse(
    ecosystem,
    identity,
    res.statusCode,
    res.jsonBody
  )
}

describe('integration test', () => {
  let root: Buffer
  let testWallets: Record<Ecosystem, TestWallet[]>
  let dispenserGuard: PublicKey

  beforeAll(async () => {
    await clearDatabase(pool)
    testWallets = await loadTestWallets()
    root = await addTestWalletsToDatabase(pool, testWallets)
    dispenserGuard = (testWallets.discord[0] as unknown as DiscordTestWallet)
      .dispenserGuardPublicKey
  })

  afterAll(async () => {
    await clearDatabase(pool)
    await pool.end()
  })

  describe('Api test', () => {
    it('call the api with a real identity', async () => {
      const response = await mockFetchAmountAndProof(
        'evm',
        testWallets.evm[0].address()
      )
      expect(response).toBeTruthy()
      expect(response?.claimInfo).toEqual({
        ecosystem: 'evm',
        identity: testWallets.evm[0].address(),
        amount: new anchor.BN(3000000),
      })
    })

    it('call the api with a fake identity', async () => {
      expect(
        await mockFetchAmountAndProof('evm', 'this_is_a_fake_address')
      ).toBeFalsy()
    })
  })

  describe('token dispenser e2e', () => {
    const wallet = loadAnchorWallet()
    const tokenDispenserProvider = new TokenDispenserProvider(
      'http://localhost:8899',
      wallet,
      new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'),
      {
        skipPreflight: true,
        preflightCommitment: 'processed',
        commitment: 'processed',
      }
    )

    let mint: Token
    let treasury: PublicKey
    beforeAll(async () => {
      await airdrop(
        tokenDispenserProvider.connection,
        LAMPORTS_PER_SOL,
        tokenDispenserProvider.claimant
      )
      const walletBalance = await tokenDispenserProvider.connection.getBalance(
        wallet.publicKey
      )
      expect(walletBalance).toEqual(LAMPORTS_PER_SOL)

      const mintAndTreasury =
        await tokenDispenserProvider.setupMintAndTreasury()
      mint = mintAndTreasury.mint
      treasury = mintAndTreasury.treasury
    }, 10000)

    it('initializes the token dispenser', async () => {
      const [_, configBump] = tokenDispenserProvider.getConfigPda()
      await tokenDispenserProvider.initialize(
        root,
        mint.publicKey,
        treasury,
        dispenserGuard
      )

      const configAccount = await tokenDispenserProvider.getConfig()

      expect(configAccount.bump).toEqual(configBump)
      expect(configAccount.merkleRoot).toEqual(Array.from(root))
      expect(configAccount.mint).toEqual(mint.publicKey)
      expect(configAccount.treasury).toEqual(treasury)
      expect(configAccount.dispenserGuard).toEqual(dispenserGuard)
    })

    it('submits an evm claim', async () => {
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'evm',
        testWallets.evm[0].address()
      ))!

      const signedMessage = await testWallets.evm[0].signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      await tokenDispenserProvider.submitClaims([
        {
          claimInfo,
          proofOfInclusion,
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
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'cosmwasm',
        testWallets.cosmwasm[0].address()
      ))!

      const signedMessage = await testWallets.cosmwasm[0].signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      await tokenDispenserProvider.submitClaims([
        {
          claimInfo,
          proofOfInclusion,
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
      const wallets: TestWallet[] = [
        testWallets.cosmwasm[1],
        testWallets.cosmwasm[2],
      ]

      const claims = await Promise.all(
        wallets.map(async (wallet) => {
          const { claimInfo, proofOfInclusion } =
            (await mockFetchAmountAndProof('cosmwasm', wallet.address()))!
          return {
            claimInfo,
            proofOfInclusion,
            signedMessage: await wallet.signMessage(
              tokenDispenserProvider.generateAuthorizationPayload()
            ),
          }
        })
      )

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(
          claims[0].claimInfo
        )
      ).toBeFalsy()

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(
          claims[1].claimInfo
        )
      ).toBeFalsy()

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

    it('submits an injective claim', async () => {
      const wallet = testWallets.injective[0]
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'injective',
        wallet.address()
      ))!
      const signedMessage = await wallet.signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      await tokenDispenserProvider.submitClaims([
        {
          claimInfo,
          proofOfInclusion,
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
        claimantFund.amount.eq(
          new anchor.BN(3000000 + 6000000 + 6100000 + 6200000 + 7000000)
        )
      ).toBeTruthy()
    }, 40000)

    it('submits an aptos claim', async () => {
      const wallet = testWallets.aptos[0]
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'aptos',
        wallet.address()
      ))!
      const signedMessage = await wallet.signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      await tokenDispenserProvider.submitClaims([
        {
          claimInfo,
          proofOfInclusion,
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
        claimantFund.amount.eq(
          new anchor.BN(
            3000000 + 6000000 + 6100000 + 6200000 + 7000000 + 5000000
          )
        )
      ).toBeTruthy()
    })

    it('submits a discord claim', async () => {
      const wallet = testWallets.discord[0]
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'discord',
        wallet.address()
      ))!

      expect(wallet instanceof DiscordTestWallet).toBeTruthy()
      if (wallet instanceof DiscordTestWallet) {
        const signedMessage = await wallet.signDiscordMessage(
          claimInfo.identity,
          tokenDispenserProvider.claimant
        )

        await tokenDispenserProvider.submitClaims([
          {
            claimInfo,
            proofOfInclusion,
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
          claimantFund.amount.eq(
            new anchor.BN(
              3000000 +
                6000000 +
                6100000 +
                6200000 +
                7000000 +
                5000000 +
                1000000
            )
          )
        ).toBeTruthy()
      }
    })

    it('submits a solana claim', async () => {
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'solana',
        tokenDispenserProvider.claimant.toBase58()
      ))!

      // No signing since claimant will sign the transaction

      await tokenDispenserProvider.submitClaims([
        {
          claimInfo,
          proofOfInclusion,
          signedMessage: undefined,
        },
      ])

      expect(
        await tokenDispenserProvider.isClaimAlreadySubmitted(claimInfo)
      ).toBeTruthy()

      const claimantFundPubkey =
        await tokenDispenserProvider.getClaimantFundAddress()

      const claimantFund = await mint.getAccountInfo(claimantFundPubkey)

      expect(
        claimantFund.amount.eq(
          new anchor.BN(
            3000000 +
              6000000 +
              6100000 +
              6200000 +
              7000000 +
              5000000 +
              1000000 +
              2000000
          )
        )
      ).toBeTruthy()
    }, 40000)

    it('submits a sui claim', async () => {
      const wallet = testWallets.sui[0]
      const { claimInfo, proofOfInclusion } = (await mockFetchAmountAndProof(
        'sui',
        wallet.address()
      ))!
      const signedMessage = await wallet.signMessage(
        tokenDispenserProvider.generateAuthorizationPayload()
      )

      await tokenDispenserProvider.submitClaims([
        {
          claimInfo,
          proofOfInclusion,
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
        claimantFund.amount.eq(
          new anchor.BN(
            3000000 +
              6000000 +
              6100000 +
              6200000 +
              7000000 +
              5000000 +
              1000000 +
              2000000 +
              4000000
          )
        )
      ).toBeTruthy()
    }, 40000)
  })
})
