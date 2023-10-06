import Optimism from '@images/evm-chains/optimism.inline.svg'
import Arbitrum from '@images/evm-chains/arbitrum.inline.svg'
import Cronos from '@images/evm-chains/cronos.inline.svg'
import Zksync from '@images/evm-chains/zksync.inline.svg'
import Bsc from '@images/evm-chains/bnb.inline.svg'
import Base from '@images/evm-chains/base.inline.svg'
import Evmos from '@images/evm-chains/evmos.inline.svg'
import Mantle from '@images/evm-chains/mantle.inline.svg'
import Linea from '@images/evm-chains/linea.inline.svg'
import PolygonZkevm from '@images/evm-chains/polygon-zksevm.inline.svg'
import Avalanche from '@images/evm-chains/avalanche.inline.svg'
import Matic from '@images/evm-chains/matic.inline.svg'
import Aurora from '@images/evm-chains/aurora.inline.svg'
import Ethereum from '@images/evm-chains/ethereum.inline.svg'
import Confluxespace from '@images/evm-chains/conflux.inline.svg'
import Celo from '@images/evm-chains/celo.inline.svg'
import Meter from '@images/evm-chains/meter.inline.svg'
import Gnosis from '@images/evm-chains/gnosis.inline.svg'
import Kcc from '@images/evm-chains/kcc.inline.svg'
import Wemix from '@images/evm-chains/wemix.inline.svg'
import { EvmChains } from 'utils/db'

export function EvmLogo({ chain }: { chain: EvmChains }) {
  switch (chain) {
    case 'optimism-mainnet':
      return <Optimism />
    case 'arbitrum-mainnet':
      return <Arbitrum />
    case 'cronos-mainnet':
      return <Cronos />
    case 'zksync-mainnet':
      return <Zksync />
    case 'bsc-mainnet':
      return <Bsc />
    case 'base-mainnet':
      return <Base />
    case 'evmos-mainnet':
      return <Evmos />
    case 'mantle-mainnet':
      return <Mantle />
    case 'linea-mainnet':
      return <Linea />
    case 'polygon-zkevm-mainnet':
      return <PolygonZkevm />
    case 'avalanche-mainnet':
      return <Avalanche />
    case 'matic-mainnet':
      return <Matic />
    case 'aurora-mainnet':
      return <Aurora />
    case 'eth-mainnet':
      return <Ethereum />
    case 'confluxespace-mainnet':
      return <Confluxespace />
    case 'celo-mainnet':
      return <Celo />
    case 'meter-mainnet':
      return <Meter />
    case 'gnosis-mainnet':
      return <Gnosis />
    case 'kcc-mainnet':
      return <Kcc />
    case 'wemix-mainnet':
      return <Wemix />
  }
}
