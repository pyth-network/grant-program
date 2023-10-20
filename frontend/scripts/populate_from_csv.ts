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

import { ClaimInfo, Ecosystem, getMaxAmount } from '../claim_sdk/claim'
import BN from 'bn.js'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { EvmBreakdownRow } from '../utils/db'
import assert from 'assert'
import path from 'path'
import { SolanaBreakdown } from 'utils/api'
import { hashDiscordUserId } from '../utils/hashDiscord'
import { DISCORD_HASH_SALT } from '../claim_sdk/testWallets'

const DEBUG = false
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
const CLUSTER = envOrErr('CLUSTER')
const DEPLOYER_WALLET = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(envOrErr('DEPLOYER_WALLET')))
)
// const PYTH_MINT = new PublicKey(envOrErr('PYTH_MINT'))
// const PYTH_TREASURY = new PublicKey(envOrErr('PYTH_TREASURY'))
// const CSV_CLAIMS = envOrErr('CSV_CLAIMS')
// const CSV_EVM_BREAKDOWNS = envOrErr('CSV_EVM_BREAKDOWNS')

const CSV_DIR = envOrErr('CSV_DIR')
const DEFI_CLAIMS = 'defi.csv'
const DEFI_DEV_CLAIMS = 'defi_dev.csv'

// const DISCORD_CLAIMS = '/Users/rchen/Desktop/crypto/pyth-network/airdrop-allocations/discord.csv';
const DISCORD_CLAIMS = 'discord.csv'
const DISCORD_DEV_CLAIMS = 'discord_dev.csv'

const NFT_CLAIMS = 'nft.csv'

const ECOSYSTEM_LIST = [
  'solana',
  'evm',
  'discord',
  'cosmwasm',
  'aptos',
  'sui',
  'injective',
]

// // don't need a separate cosmwasm list since all the addresses are unique?
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

// function parseCsvClaims() {
//   const csvClaims = Papa.parse(fs.readFileSync(path.resolve(CSV_DIR, CSV_CLAIMS), 'utf-8'), {
//     header: true,
//   }) // Assumes ecosystem, identity, amount are the headers
//   const claimsData = csvClaims.data as {
//     ecosystem: string
//     identity: string
//     amount: string
//   }[]
//   assert(
//     new Set(claimsData.map((row) => row['identity'])).size == claimsData.length,
//     'Duplicate addresses in CSV file'
//   )
//   assert(
//     claimsData.every((row) => {
//       return [
//         'solana',
//         'evm',
//         'discord',
//         'cosmwasm',
//         'aptos',
//         'sui',
//         'injective',
//       ].includes(row['ecosystem'])
//     }),
//     'A row has an unexisting ecosystem'
//   )
//   const claimInfos = claimsData.map(
//     (row) =>
//       new ClaimInfo(
//         row['ecosystem'] as Ecosystem,
//         row['identity'],
//         new BN(row['amount'])
//       )
//   ) // Cast for ecosystem ok because of assert above
//   return claimInfos;
// }

function parseCsvs() {
  // const defiCsvClaims = Papa.parse(fs.readFileSync(DEFI_CLAIMS, 'utf-8'), {
  //   header: true,
  // });

  // assert(defiCsvClaims.meta.fields?.includes('address'), "CSV file does not have required 'address' column");
  // assert(defiCsvClaims.meta.fields?.includes('alloc'), "CSV file does not have required 'alloc' column");

  // const claimsData = defiCsvClaims.data as {
  //   address: string
  //   chain: string
  //   alloc: string
  // }[];
  // // const addressList = group by Map<address, (chain, alloc)[]>
  // // map to <address, (ecosystem, alloc_sum)>
  // const chainList = [
  //   "optimism-mainnet",
  //   "arbitrum-mainnet",
  //   "cronos-mainnet",
  //   "zksync-mainnet",
  //   "bsc-mainnet",
  //   "base-mainnet",
  //   "evmos-mainnet",
  //   "sui",
  //   "mantle-mainnet",
  //   "linea-mainnet",
  //   "polygon-zkevm-mainnet",
  //   "avalanche-mainnet",
  //   "matic-mainnet",
  //   "aurora-mainnet",
  //   "aptos",
  //   "eth-mainnet",
  //   "confluxespace-mainnet",
  //   "celo-mainnet",
  //   "meter-mainnet",
  //   "gnosis-mainnet",
  //   "kcc-mainnet",
  //   "wemix-mainnet",
  //   "solana",
  //   "injective",
  //   "neutron",
  //   "osmosis",
  //   "sei"
  // ];

  // // group by address
  // // only evm addresses should have multiple values
  // const groupedDefiAddresses = claimsData.reduce((acc, row) => {
  //   const curValues = acc.get(row.address);
  //   if(curValues){
  //     acc.set(row.address, [...curValues, [row.chain, row.alloc]]);
  //   } else {
  //     acc.set(row.address, [[row.chain, row.alloc]]);
  //   }
  //   return acc;
  // }, new Map<string, [string, string][]>());
  const groupedDefiAddresses = parseDefiCsv(DEFI_CLAIMS)
  const groupedDefiDevAddresses = parseDefiCsv(DEFI_DEV_CLAIMS)

  groupedDefiDevAddresses.forEach((chainsAndAllocs, key) => {
    const curValues = groupedDefiAddresses.get(key)
    if (curValues) {
      // check no duplicate identity + chain from defi_dev.csv
      const curChainsForAddr = curValues.map((row) => row[0])
      chainsAndAllocs.forEach((chainAndAlloc) => {
        assert(
          !curChainsForAddr.includes(chainAndAlloc[0]),
          `CurChainsForAddr: ${curChainsForAddr}. Address ${key} has duplicate chain ${chainAndAlloc[0]}`
        )
      })
      groupedDefiAddresses.set(key, [...curValues, ...chainsAndAllocs])
    } else {
      groupedDefiAddresses.set(key, chainsAndAllocs)
    }
  })

  // for each grouped address, if multiple values then all must be in evm chainlist
  const evmBreakdownAddresses = new Map<string, [string, string][]>()

  const claimInfos: ClaimInfo[] = []
  const solanaBreakdownData: Map<string, SolanaBreakdownRow[]> = new Map()

  groupedDefiAddresses.forEach((chainsAndAllocs, key) => {
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
        ECOSYSTEM_LIST.includes(chainsAndAllocs[0][0]),
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

  // need solana breakdown between nft & defi
  const nftCsvClaims = Papa.parse(
    fs.readFileSync(path.resolve(CSV_DIR, NFT_CLAIMS), 'utf-8'),
    {
      header: true,
      skipEmptyLines: true,
    }
  )

  assert(
    nftCsvClaims.meta.fields?.includes('address'),
    "CSV file does not have required 'address' column"
  )
  assert(
    nftCsvClaims.meta.fields?.includes('alloc'),
    "CSV file does not have required 'alloc' column"
  )

  const nftClaims = nftCsvClaims.data as {
    address: string
    alloc: string
  }[]

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

  // read all discord claims and add to ecosystemAddresses
  const discordClaims = parseDiscordClaims()
  discordClaims.forEach((row) => {
    claimInfos.push(
      new ClaimInfo('discord', row.address, truncateAllocation(row.alloc))
    )
  })

  return {
    claimInfos,
    evmBreakdownAddresses,
    solanaBreakdownData,
  }
}

function parseDefiCsv(defi_csv: string) {
  const DEFI_CLAIMS = ''
  const defiCsvClaims = Papa.parse(
    fs.readFileSync(path.resolve(CSV_DIR, defi_csv), 'utf-8'),
    {
      header: true,
      skipEmptyLines: true,
    }
  )

  assert(
    defiCsvClaims.meta.fields?.includes('address'),
    "CSV file does not have required 'address' column"
  )
  assert(
    defiCsvClaims.meta.fields?.includes('alloc'),
    "CSV file does not have required 'alloc' column"
  )

  const claimsData = defiCsvClaims.data as {
    address: string
    chain: string
    alloc: string
  }[]
  // const addressList = group by Map<address, (chain, alloc)[]>
  // map to <address, (ecosystem, alloc_sum)>
  const chainList = [
    'optimism-mainnet',
    'arbitrum-mainnet',
    'cronos-mainnet',
    'zksync-mainnet',
    'bsc-mainnet',
    'base-mainnet',
    'evmos-mainnet',
    'sui',
    'mantle-mainnet',
    'linea-mainnet',
    'polygon-zkevm-mainnet',
    'avalanche-mainnet',
    'matic-mainnet',
    'aurora-mainnet',
    'aptos',
    'eth-mainnet',
    'confluxespace-mainnet',
    'celo-mainnet',
    'meter-mainnet',
    'gnosis-mainnet',
    'kcc-mainnet',
    'wemix-mainnet',
    'solana',
    'injective',
    'neutron',
    'osmosis',
    'sei',
  ]
  const evmChainList = [
    'optimism-mainnet',
    'arbitrum-mainnet',
    'cronos-mainnet',
    'zksync-mainnet',
    'bsc-mainnet',
    'base-mainnet',
    'evmos-mainnet',
    // "sui",
    'mantle-mainnet',
    'linea-mainnet',
    'polygon-zkevm-mainnet',
    'avalanche-mainnet',
    'matic-mainnet',
    'aurora-mainnet',
    // "aptos",
    'eth-mainnet',
    'confluxespace-mainnet',
    'celo-mainnet',
    'meter-mainnet',
    'gnosis-mainnet',
    'kcc-mainnet',
    'wemix-mainnet',
    // "solana",
    // "injective",
    // "neutron",
    // "osmosis",
    // "sei"
  ]

  // don't need a separate cosmwasm list since all the addresses are unique?
  const cosmWasmChainList = [
    // "optimism-mainnet",
    // "arbitrum-mainnet",
    // "cronos-mainnet",
    // "zksync-mainnet",
    // "bsc-mainnet",
    // "base-mainnet",
    // "evmos-mainnet",
    // "sui",
    // "mantle-mainnet",
    // "linea-mainnet",
    // "polygon-zkevm-mainnet",
    // "avalanche-mainnet",
    // "matic-mainnet",
    // "aurora-mainnet",
    // "aptos",
    // "eth-mainnet",
    // "confluxespace-mainnet",
    // "celo-mainnet",
    // "meter-mainnet",
    // "gnosis-mainnet",
    // "kcc-mainnet",
    // "wemix-mainnet",
    // "solana",
    // "injective",
    'neutron',
    'osmosis',
    'sei',
  ]

  const ecosystemList = [
    'solana',
    'evm',
    'discord',
    'cosmwasm',
    'aptos',
    'sui',
    'injective',
  ]

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

function parseDiscordClaims(): { address: string; alloc: string }[] {
  const discordCsvClaims = Papa.parse(
    fs.readFileSync(path.resolve(CSV_DIR, DISCORD_CLAIMS), 'utf-8'),
    {
      header: true,
      skipEmptyLines: true,
    }
  )

  assert(
    discordCsvClaims.meta.fields?.includes('address'),
    "CSV file does not have required 'address' column"
  )
  assert(
    discordCsvClaims.meta.fields?.includes('alloc'),
    "CSV file does not have required 'alloc' column"
  )

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
      skipEmptyLines: true,
    }
  )

  assert(
    discordDevCsvClaims.meta.fields?.includes('address'),
    "CSV file does not have required 'address' column"
  )
  assert(
    discordDevCsvClaims.meta.fields?.includes('alloc'),
    "CSV file does not have required 'alloc' column"
  )

  const discordDevClaims = discordDevCsvClaims.data as {
    address: string
    alloc: string
  }[]

  const discordDevClaimsAddrSet = new Set(
    discordDevClaims.map((row) => row.address)
  )
  assert(
    discordDevClaims.length === discordDevClaimsAddrSet.size,
    'Discord dev claims has duplicate addresses'
  )

  discordDevClaimsAddrSet.forEach((addr) => discordClaimsAddrSet.add(addr))
  assert(
    discordClaimsAddrSet.size ===
      discordDevClaims.length + discordClaims.length,
    'Discord claims and discord dev claims have duplicate addresses'
  )
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
  const allocationDec = allocationParts[1].slice(0, 6)
  const allocationNormalized = allocationInt + allocationDec
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
// - Two csv files : one for claims and one for evm breakdowns
// - Program has been deployed
// - DB has been migrated

// Extra steps after running this script :
// - Make sure the tokens are in the treasury account
// - Make sure the treasury account has the config account as its delegate

async function main() {
  await clearDatabase(pool)
  const { claimInfos, evmBreakdownAddresses, solanaBreakdownData } = parseCsvs()
  if (DEBUG) {
    const [maxUser, maxAmount] = getMaxUserAndAmount(claimInfos)
    console.log(`maxUser: ${maxUser} maxAmount: ${maxAmount.toString()}`)

    ECOSYSTEM_LIST.forEach((ecosystem) => {
      const [maxEcoUser, maxEcoAmount] = getMaxUserAndAmount(
        claimInfos.filter((claimInfo) => claimInfo.ecosystem === ecosystem)
      )
      console.log(
        `ecosystem: ${ecosystem} maxEcoUser: ${maxEcoUser} maxEcoAmount: ${maxEcoAmount
          .div(new BN(1000000))
          .toString()}`
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
    evmBreakdownAddresses.forEach((chainsAndAllocs, identity) => {
      assert(
        chainsAndAllocs.every(([chain, _]) => {
          return EVM_CHAINS.includes(chain as EvmChains)
        })
      )
    })
  }
  const maxAmount = getMaxAmount(claimInfos)

  const evmBreakDowns: EvmBreakdownRow[] = []
  evmBreakdownAddresses.forEach((chainsAndAllocs, identity) => {
    chainsAndAllocs.forEach(([chain, alloc]) => {
      evmBreakDowns.push({
        chain,
        identity,
        amount: truncateAllocation(alloc),
      })
    })
  })
  checkClaimsMatchEvmBreakdown(claimInfos, evmBreakDowns)

  const solanaBreakDowns: SolanaBreakdownRow[] = []
  solanaBreakdownData.forEach((breakdowns, identity) => {
    breakdowns.forEach((breakdown) => {
      solanaBreakDowns.push(breakdown)
    })
  })
  checkClaimsMatchSolanaBreakdown(claimInfos, solanaBreakDowns)

  // sort by amount & identity
  claimInfos.sort((a, b) => {
    const amountCmp = b.amount.cmp(a.amount)
    return amountCmp != 0 ? amountCmp : a.identity.localeCompare(b.identity)
  })

  // Add data to database
  const root = await addClaimInfosToDatabase(pool, claimInfos)
  console.log(`added claim infos to database`)
  await addEvmBreakdownsToDatabase(pool, evmBreakDowns)
  console.log(`added evm breakdowns`)
  await addSolanaBreakdownsToDatabase(pool, solanaBreakDowns)
  console.log(`added solana breakdowns to db`)

  // // Intialize the token dispenser
  const tokenDispenserProvider = new TokenDispenserProvider(
    ENDPOINT,
    new NodeWallet(DEPLOYER_WALLET),
    new PublicKey(PROGRAM_ID),
    {
      skipPreflight: true,
      preflightCommitment: 'processed',
      commitment: 'processed',
    }
  )

  const mintAndTreasury = await tokenDispenserProvider.setupMintAndTreasury()
  console.log(
    `mint: ${mintAndTreasury.mint.publicKey.toBase58()} treasury: ${mintAndTreasury.treasury.toBase58()}`
  )
  await tokenDispenserProvider.initialize(
    root,
    // PYTH_MINT,
    // PYTH_TREASURY,
    mintAndTreasury.mint.publicKey,
    mintAndTreasury.treasury,
    DISPENSER_GUARD.publicKey,
    FUNDER_KEYPAIR.publicKey,
    maxAmount
  )
  console.log(`initialized token dispenser`)
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(`error from populate_from_csv: ${e}`)
    process.exit(1)
  }
})()
