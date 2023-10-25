import { EvmChains } from 'utils/db'

export function getEvmName(chain: EvmChains) {
  switch (chain) {
    case 'optimism-mainnet':
      return 'Optimism'
    case 'arbitrum-mainnet':
      return 'Arbitrum'
    case 'cronos-mainnet':
      return 'Cronos'
    case 'zksync-mainnet':
      return 'zkSync'
    case 'bsc-mainnet':
      return 'BNB Chain'
    case 'base-mainnet':
      return 'Base'
    case 'evmos-mainnet':
      return 'Evmos'
    case 'mantle-mainnet':
      return 'Mantle'
    case 'linea-mainnet':
      return 'Linea'
    case 'polygon-zkevm-mainnet':
      return 'Polygon zkEVM'
    case 'avalanche-mainnet':
      return 'Avalanche'
    case 'matic-mainnet':
      return 'Matic'
    case 'aurora-mainnet':
      return 'Aurora'
    case 'eth-mainnet':
      return 'Ethereum'
    case 'confluxespace-mainnet':
      return 'Conflux Network'
    case 'celo-mainnet':
      return 'Celo'
    case 'meter-mainnet':
      return 'Meter'
    case 'gnosis-mainnet':
      return 'Gnosis'
    case 'kcc-mainnet':
      return 'KCC'
    case 'wemix-mainnet':
      return 'Wemix'
  }
}
