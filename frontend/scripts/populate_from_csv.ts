import { Keypair, PublicKey } from '@solana/web3.js'
import { TokenDispenserProvider } from '../claim_sdk/solana'
import { envOrErr } from '../claim_sdk/index'
import {
  EVM_CHAINS,
  EvmChains,
  SolanaBreakdownRow,
  addClaimInfosToDatabase,
  addEvmBreakdownsToDatabase,
  addSolanaBreakdownsToDatabase,
  clearDatabase,
  getDatabasePool,
} from '../utils/db'
import fs from 'fs'
import Papa from 'papaparse'

import {
  ClaimInfo,
  Ecosystem,
  Ecosystems,
  getMaxAmount,
} from '../claim_sdk/claim'
import BN from 'bn.js'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { EvmBreakdownRow } from '../utils/db'
import assert from 'assert'
import path from 'path'
import { hashDiscordUserId } from '../utils/hashDiscord'
import { DISCORD_HASH_SALT, loadFunderWallet } from '../claim_sdk/testWallets'

const DEBUG = true
const pool = getDatabasePool()

// The config is read from these env variables
const ENDPOINT = envOrErr('ENDPOINT')
const PROGRAM_ID = envOrErr('PROGRAM_ID')
const DISPENSER_GUARD = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(envOrErr('DISPENSER_GUARD')))
)
const FUNDER_KEYPAIR = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(envOrErr('FUNDER_KEYPAIR')))
)
const DEPLOYER_WALLET = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(envOrErr('DEPLOYER_WALLET')))
)
const PYTH_MINT = new PublicKey(envOrErr('PYTH_MINT'))
const PYTH_TREASURY = new PublicKey(envOrErr('PYTH_TREASURY'))

const CSV_DIR = envOrErr('CSV_DIR')
const DEFI_CLAIMS = 'defi.csv'
const DEFI_DEV_CLAIMS = 'defi_dev.csv'

const DISCORD_CLAIMS = 'discord.csv'
const DISCORD_DEV_CLAIMS = 'discord_dev.csv'

const NFT_CLAIMS = 'nft.csv'

const COSMWASM_CHAIN_LIST = ['neutron', 'osmosis', 'sei']

function checkClaimsMatchEvmBreakdown(
  claimInfos: ClaimInfo[],
  evmBreakDowns: EvmBreakdownRow[]
) {
  const evmClaimInfos = claimInfos.filter((claimInfo) => {
    return claimInfo.ecosystem === 'evm'
  })
  const evmClaimInfoAddrSet = new Set(
    evmClaimInfos.map((claimInfo) => claimInfo.identity)
  )

  const sum: { [identity: string]: BN } = {}
  for (const evmBreakDownRow of evmBreakDowns) {
    if (sum[evmBreakDownRow.identity] == undefined) {
      sum[evmBreakDownRow.identity] = new BN(0)
    }
    sum[evmBreakDownRow.identity] = sum[evmBreakDownRow.identity].add(
      evmBreakDownRow.amount
    )
  }

  assert(
    Object.keys(sum).length === evmClaimInfos.length,
    `
    Number of evm identities in CSV file does not match number of identities in evm_breakdowns table.
    sum: ${Object.keys(sum).length}
    evmClaimInfos.length: ${evmClaimInfos.length}
    evmClaimInfoAddrSet.length: ${evmClaimInfoAddrSet.size}
    `
  )

  for (const evmClaim of evmClaimInfos) {
    assert(
      sum[evmClaim.identity].eq(evmClaim.amount),
      `Breakdown for ${evmClaim.identity} does not match total amount`
    )
  }
}

function checkClaimsMatchSolanaBreakdown(
  claimInfos: ClaimInfo[],
  solanaBreakdownRows: SolanaBreakdownRow[]
) {
  const sum: { [identity: string]: BN } = {}
  for (const solanaBreakdownRow of solanaBreakdownRows) {
    if (sum[solanaBreakdownRow.identity] == undefined) {
      sum[solanaBreakdownRow.identity] = new BN(0)
    }
    sum[solanaBreakdownRow.identity] = sum[solanaBreakdownRow.identity].add(
      solanaBreakdownRow.amount
    )
  }
  const solanaClaims = claimInfos.filter(
    (claimInfo) => claimInfo.ecosystem === 'solana'
  )
  assert(
    Object.keys(sum).length === solanaClaims.length,
    'Number of solana identities in CSV file does not match number of identities in solana_breakdowns table'
  )

  for (const solanaClaim of solanaClaims) {
    assert(
      sum[solanaClaim.identity].eq(solanaClaim.amount),
      `Breakdown for ${solanaClaim.identity} does not match total amount`
    )
  }
}

function parseCsvs() {
  // parse defi csvs
  const groupedDefiAddresses = parseDefiCsv(DEFI_CLAIMS)
  const groupedDefiDevAddresses = parseDefiCsv(DEFI_DEV_CLAIMS)

  groupedDefiDevAddresses.forEach((devChainsAndAllocs, key) => {
    const curValues = groupedDefiAddresses.get(key)
    if (curValues) {
      // skip duplicate identity + chain from defi_dev.csv
      const curChainsForAddr = curValues.map((row) => row[0])
      const deduped = devChainsAndAllocs.filter(([chain, alloc]) => {
        const isUniqueDevAddr = !curChainsForAddr.includes(chain)
        if (!isUniqueDevAddr) {
          console.log(
            `skipping dev claim for ${chain} address ${key}  because it is already in defi.csv`
          )
        }
        return isUniqueDevAddr
      })
      groupedDefiAddresses.set(key, [...curValues, ...deduped])
    } else {
      groupedDefiAddresses.set(key, devChainsAndAllocs)
    }
  })

  // for each grouped address, if multiple values then all must be in evm chainlist
  const evmBreakdownAddresses = new Map<string, [string, string][]>()

  const claimInfos: ClaimInfo[] = []
  const solanaBreakdownData: Map<string, SolanaBreakdownRow[]> = new Map()

  groupedDefiAddresses.forEach((chainsAndAllocs, key) => {
    // only evm chains should have multiple values from defi csv files
    if (chainsAndAllocs.length > 1) {
      assert(
        chainsAndAllocs.every(([chain, alloc]) =>
          EVM_CHAINS.includes(chain as EvmChains)
        ),
        `Address ${key} has multiple values but not all are in evmChainList. chains: ${JSON.stringify(
          chainsAndAllocs.map((row) => row[0])
        )}`
      )
      evmBreakdownAddresses.set(key, chainsAndAllocs)
    } else if (EVM_CHAINS.includes(chainsAndAllocs[0][0] as EvmChains)) {
      evmBreakdownAddresses.set(key, chainsAndAllocs)
    } else if (COSMWASM_CHAIN_LIST.includes(chainsAndAllocs[0][0])) {
      claimInfos.push(
        new ClaimInfo(
          'cosmwasm',
          key,
          truncateAllocation(chainsAndAllocs[0][1])
        )
      )
    } else {
      assert(
        Ecosystems.includes(chainsAndAllocs[0][0] as Ecosystem),
        `Unknown ecosystem detected for identity ${key} - ${chainsAndAllocs[0]}`
      )
      if (chainsAndAllocs[0][0] === 'solana') {
        solanaBreakdownData.set(key, [
          {
            source: 'defi',
            identity: key,
            amount: truncateAllocation(chainsAndAllocs[0][1]),
          },
        ])
      } else {
        claimInfos.push(
          new ClaimInfo(
            chainsAndAllocs[0][0] as Ecosystem,
            key,
            truncateAllocation(chainsAndAllocs[0][1])
          )
        )
      }
    }
  })

  // for each evm address, sum up the allocs and add to ecosystemAddresses
  evmBreakdownAddresses.forEach((value, key) => {
    const totalAmount = value.reduce((acc, row) => {
      return acc.add(truncateAllocation(row[1]))
    }, new BN(0))
    claimInfos.push(new ClaimInfo('evm', key, totalAmount))
  })

  // convert into breakdown rows
  const evmBreakdownRows: EvmBreakdownRow[] = []
  evmBreakdownAddresses.forEach((chainsAndAllocs, identity) => {
    chainsAndAllocs.forEach(([chain, alloc]) => {
      evmBreakdownRows.push({
        chain,
        identity,
        amount: truncateAllocation(alloc),
      })
    })
  })

  // need solana breakdown between nft & defi
  const nftClaims = parseNftCsv()

  nftClaims.forEach((row) => {
    if (solanaBreakdownData.has(row.address)) {
      solanaBreakdownData.get(row.address)?.push({
        source: 'nft',
        identity: row.address,
        amount: truncateAllocation(row.alloc),
      })
    } else {
      solanaBreakdownData.set(row.address, [
        {
          source: 'nft',
          identity: row.address,
          amount: truncateAllocation(row.alloc),
        },
      ])
    }
  })

  // sum up all the solana breakdowns for each identity and add to ecosystemAddresses
  solanaBreakdownData.forEach((value, key) => {
    const totalAmount = value.reduce((acc, row) => {
      return acc.add(row.amount)
    }, new BN(0))
    claimInfos.push(new ClaimInfo('solana', key, totalAmount))
  })

  // flatten into breakdown rows
  const solanaBreakdownRows: SolanaBreakdownRow[] = []
  solanaBreakdownData.forEach((breakdowns, identity) => {
    breakdowns.forEach((breakdown) => {
      solanaBreakdownRows.push(breakdown)
    })
  })

  // read all discord claims and add to ecosystemAddresses
  const discordClaims = parseDiscordClaims()
  discordClaims.forEach((row) => {
    claimInfos.push(
      new ClaimInfo('discord', row.address, truncateAllocation(row.alloc))
    )
  })

  return {
    claimInfos,
    evmBreakdownRows,
    solanaBreakdownRows,
  }
}

function hasColumns(
  csvClaims: Papa.ParseResult<unknown>,
  columns: string[]
): void {
  columns.forEach((column) => {
    assert(
      csvClaims.meta.fields?.includes(column),
      `CSV file does not have required '${column}' column`
    )
  })
}

function parseDefiCsv(defi_csv: string) {
  const defiCsvClaims = Papa.parse(
    fs.readFileSync(path.resolve(CSV_DIR, defi_csv), 'utf-8'),
    {
      header: true,
    }
  )

  hasColumns(defiCsvClaims, ['address', 'chain', 'alloc'])

  const claimsData = defiCsvClaims.data as {
    address: string
    chain: string
    alloc: string
  }[]

  // group by address
  // only evm addresses should have multiple values
  return claimsData.reduce((acc, row) => {
    const curValues = acc.get(row.address)
    if (curValues) {
      acc.set(row.address, [...curValues, [row.chain, row.alloc]])
    } else {
      acc.set(row.address, [[row.chain, row.alloc]])
    }
    return acc
  }, new Map<string, [string, string][]>())
}

function parseNftCsv() {
  const nftCsvClaims = Papa.parse(
    fs.readFileSync(path.resolve(CSV_DIR, NFT_CLAIMS), 'utf-8'),
    {
      header: true,
    }
  )
  hasColumns(nftCsvClaims, ['address', 'alloc'])

  const nftClaims = nftCsvClaims.data as {
    address: string
    alloc: string
  }[]
  return nftClaims
}

function parseDiscordClaims(): { address: string; alloc: string }[] {
  const discordCsvClaims = Papa.parse(
    fs.readFileSync(path.resolve(CSV_DIR, DISCORD_CLAIMS), 'utf-8'),
    {
      header: true,
    }
  )
  hasColumns(discordCsvClaims, ['address', 'alloc'])

  const discordClaims = discordCsvClaims.data as {
    address: string
    alloc: string
  }[]

  const discordClaimsAddrSet = new Set(discordClaims.map((row) => row.address))
  assert(
    discordClaims.length === discordClaimsAddrSet.size,
    'Discord claims has duplicate addresses'
  )

  const discordDevCsvClaims = Papa.parse(
    fs.readFileSync(path.resolve(CSV_DIR, DISCORD_DEV_CLAIMS), 'utf-8'),
    {
      header: true,
    }
  )

  hasColumns(discordDevCsvClaims, ['address', 'alloc'])

  // filter out addresses that are already in discordClaims
  const discordDevClaims = (
    discordDevCsvClaims.data as {
      address: string
      alloc: string
    }[]
  ).filter((row) => {
    const isUniqueDevAddress = !discordClaimsAddrSet.has(row.address)
    if (!isUniqueDevAddress) {
      console.log(
        `skipping discord dev claim for ${row.address} because it is already in discord.csv`
      )
    }
    return isUniqueDevAddress
  })

  return discordClaims.concat(discordDevClaims).map((addrAndAlloc) => {
    const hashedDiscordId = hashDiscordUserId(
      DISCORD_HASH_SALT,
      addrAndAlloc.address
    )
    return {
      address: hashedDiscordId,
      alloc: addrAndAlloc.alloc,
    }
  })
}

function truncateAllocation(allocation: string): BN {
  if (allocation.indexOf('.') === -1) {
    return new BN(allocation + '000000')
  }
  const allocationParts = allocation.split('.')
  assert(allocationParts.length === 2)
  const allocationInt = allocationParts[0]
  const allocationNormalized = allocationInt + '000000'
  const allocationBn = new BN(allocationNormalized)
  return allocationBn
}

function getMaxUserAndAmount(claimInfos: ClaimInfo[]): [string, BN] {
  let maxUser = ''
  const maxAmount = claimInfos.reduce((prev, curr) => {
    if (curr.amount.gt(prev)) {
      maxUser = curr.identity
    }
    return BN.max(prev, curr.amount)
  }, new BN(0))
  return [maxUser, maxAmount]
}

function getTotalByEcosystems(claimInfos: ClaimInfo[]): Map<string, BN> {
  const ecosystemMap = new Map<string, BN>()
  claimInfos.forEach((claimInfo) => {
    if (ecosystemMap.has(claimInfo.ecosystem)) {
      ecosystemMap.set(
        claimInfo.ecosystem,
        ecosystemMap.get(claimInfo.ecosystem)?.add(claimInfo.amount) as BN
      )
    } else {
      ecosystemMap.set(claimInfo.ecosystem, claimInfo.amount)
    }
  })
  return ecosystemMap
}

// Requirements for this script :
// - Airdrop allocation repo has been downloaded and path to repo set in .env
// - DB has been migrated

// Extra steps after running this script :
// - Make sure the tokens are in the treasury account
// - Make sure the treasury account has the config account as its delegate

async function main() {
  const mainStart = Date.now()
  await clearDatabase(pool)
  const parseCsvStart = Date.now()
  const { claimInfos, evmBreakdownRows, solanaBreakdownRows } = parseCsvs()
  const parseCsvEnd = Date.now()
  if (DEBUG) {
    const [maxUser, maxAmount] = getMaxUserAndAmount(claimInfos)
    console.log(`maxUser: ${maxUser} maxAmount: ${maxAmount.toString()}`)

    Ecosystems.forEach((ecosystem) => {
      const [maxEcoUser, maxEcoAmount] = getMaxUserAndAmount(
        claimInfos.filter((claimInfo) => claimInfo.ecosystem === ecosystem)
      )
      const ecoAmounts = claimInfos
        .filter((claimInfo) => claimInfo.ecosystem === ecosystem)
        .reduce((acc, curr) => {
          const amountCount = acc.get(curr.amount.toNumber()) ?? 0
          acc.set(curr.amount.toNumber(), amountCount + 1)
          return acc
        }, new Map<number, number>()) //map <amount, count>
      const ecoAmountsArr = Array.from(ecoAmounts.entries())
      ecoAmountsArr.sort((a, b) => {
        return b[0] - a[0]
      })

      console.log(
        `ecosystem: ${ecosystem} maxEcoUser: ${maxEcoUser} maxEcoAmount: ${maxEcoAmount
          .div(new BN(1000000))
          .toString()}
          ecoAmountsArr: ${JSON.stringify(ecoAmountsArr)}
        `
      )
    })
    const ecosystemMap = getTotalByEcosystems(claimInfos)
    let totalAirdrop = new BN(0)
    ecosystemMap.forEach((amount, ecosystem) => {
      totalAirdrop = totalAirdrop.add(amount)
    })
    ecosystemMap.forEach((amount, ecosystem) => {
      console.log(
        `ecosystem: ${ecosystem} amount: ${amount
          .div(new BN(1000000))
          .toString()} - ${amount
          .mul(new BN(100))
          .div(totalAirdrop)
          .toString()}% of total airdrop`
      )
    })
    assert(
      evmBreakdownRows.every((row) =>
        EVM_CHAINS.includes(row.chain as EvmChains)
      )
    )
  }
  const maxAmount = getMaxAmount(claimInfos)

  checkClaimsMatchEvmBreakdown(claimInfos, evmBreakdownRows)

  checkClaimsMatchSolanaBreakdown(claimInfos, solanaBreakdownRows)

  // sort by amount & identity
  claimInfos.sort((a, b) => {
    const amountCmp = b.amount.cmp(a.amount)
    return amountCmp != 0 ? amountCmp : a.identity.localeCompare(b.identity)
  })

  // Add data to database
  const addClaimInfosStart = Date.now()
  const root = await addClaimInfosToDatabase(pool, claimInfos)
  console.log('THE ROOT IS :', root.toString('hex'))
  const addClaimInfoEnd = Date.now()
  console.log(
    `\n\nadded claim infos to database time: ${
      addClaimInfoEnd - addClaimInfosStart
    } ms`
  )
  const addEvmStart = Date.now()
  await addEvmBreakdownsToDatabase(pool, evmBreakdownRows)
  const addEvmEnd = Date.now()
  console.log(`added evm breakdowns time : ${addEvmEnd - addEvmStart} ms`)
  const addSolStart = Date.now()
  await addSolanaBreakdownsToDatabase(pool, solanaBreakdownRows)
  const addSolEnd = Date.now()
  console.log(
    `added solana breakdowns to db time: ${addSolEnd - addSolStart} ms`
  )

  console.log(`
    \n\n
      parseCsvTime: ${parseCsvEnd - parseCsvStart}
      addClaimInfoTime: ${addClaimInfoEnd - addClaimInfosStart}
      addEvmTime: ${addEvmEnd - addEvmStart}
      addSolTime: ${addSolEnd - addSolStart}
    \n\n`)

  // Initialize the token dispenser
  const tokenDispenserProvider = new TokenDispenserProvider(
    ENDPOINT,
    new NodeWallet(DEPLOYER_WALLET),
    // for local testing
    // loadFunderWallet(),
    new PublicKey(PROGRAM_ID),
    {
      skipPreflight: true,
      preflightCommitment: 'processed',
      commitment: 'processed',
    }
  )

  await tokenDispenserProvider.initialize(
    root,
    PYTH_MINT,
    PYTH_TREASURY,
    DISPENSER_GUARD.publicKey,
    FUNDER_KEYPAIR.publicKey,
    maxAmount
  )

  // for local testing
  // const mintAndTreasury = await tokenDispenserProvider.setupMintAndTreasury()
  // await tokenDispenserProvider.initialize(
  //   root,
  //   mintAndTreasury.mint.publicKey,
  //   mintAndTreasury.treasury,
  //   DISPENSER_GUARD.publicKey,
  //   FUNDER_KEYPAIR.publicKey,
  //   maxAmount
  // )
  const mainEnd = Date.now()
  console.log(`\n\ninitialized token dispenser\n\n`)

  console.log(`
    \n\n
    totalTime: ${mainEnd - mainStart}
      parseCsvTime: ${parseCsvEnd - parseCsvStart}
      addClaimInfoTime: ${addClaimInfoEnd - addClaimInfosStart}
      addEvmTime: ${addEvmEnd - addEvmStart}
      addSolTime: ${addSolEnd - addSolStart}
    \n\n`)
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(`error from populate_from_csv: ${e}`)
    process.exit(1)
  }
})()
