export const assets = [
  {
    $schema: '../assetlist.schema.json',
    chain_name: 'neutron',
    assets: [
      {
        description: 'The native token of Neutron chain.',
        denom_units: [
          {
            denom: 'untrn',
            exponent: 0,
          },
          {
            denom: 'ntrn',
            exponent: 6,
          },
        ],
        base: 'untrn',
        name: 'Neutron',
        display: 'ntrn',
        symbol: 'NTRN',
        logo_URIs: {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/neutron/images/ntrn.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/neutron/images/ntrn.svg',
        },
        coingecko_id: 'neutron',
      },
    ],
  },
  {
    $schema: '../assetlist.schema.json',
    chain_name: 'osmosis',
    assets: [
      {
        description: 'The native token of Osmosis',
        denom_units: [
          {
            denom: 'uosmo',
            exponent: 0,
          },
          {
            denom: 'osmo',
            exponent: 6,
          },
        ],
        base: 'uosmo',
        name: 'Osmosis',
        display: 'osmo',
        symbol: 'OSMO',
        logo_URIs: {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.svg',
        },
        coingecko_id: 'osmosis',
        keywords: ['dex', 'staking'],
      },
    ],
  },
  {
    $schema: '../assetlist.schema.json',
    chain_name: 'sei',
    assets: [
      {
        description: 'The native staking token of Sei.',
        denom_units: [
          {
            denom: 'usei',
            exponent: 0,
          },
          {
            denom: 'sei',
            exponent: 6,
          },
        ],
        base: 'usei',
        name: 'Sei',
        display: 'sei',
        symbol: 'SEI',
        logo_URIs: {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/sei/images/sei.png',
          svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/sei/images/sei.svg',
        },
        coingecko_id: 'sei-network',
      },
      {
        description:
          'OIN Token ($OIN) is a groundbreaking digital asset developed on the $SEI Blockchain. It transcends being merely a cryptocurrency; $OIN stands as a robust store of value, symbolizing the future of decentralized finance and its potential to reshape the crypto landscape.',
        denom_units: [
          {
            denom: 'factory/sei12q0zv3c4cd9jkupn0krazdycc5ftw9wzt9vmhu/OIN',
            exponent: 0,
          },
          {
            denom: 'oin',
            exponent: 6,
          },
        ],
        address: 'sei1thgp6wamxwqt7rthfkeehktmq0ujh5kspluw6w',
        base: 'factory/sei1thgp6wamxwqt7rthfkeehktmq0ujh5kspluw6w/OIN',
        name: 'OIN STORE OF VALUE',
        display: 'oin',
        symbol: 'OIN',
        logo_URIs: {
          png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/sei/images/oin.png',
        },
        coingecko_id: '',
      },
    ],
  },
]

export const chains = [
  {
    $schema: '../chain.schema.json',
    chain_name: 'sei',
    status: 'live',
    website: 'https://www.sei.io/',
    network_type: 'mainnet',
    pretty_name: 'Sei',
    chain_id: 'pacific-1',
    bech32_prefix: 'sei',
    daemon_name: 'seid',
    node_home: '$HOME/.sei',
    key_algos: ['secp256k1'],
    slip44: 118,
    fees: {
      fee_tokens: [
        {
          denom: 'usei',
          fixed_min_gas_price: 0.1,
          low_gas_price: 0.1,
          average_gas_price: 0.1,
          high_gas_price: 0.25,
        },
      ],
    },
    staking: {
      staking_tokens: [
        {
          denom: 'usei',
        },
      ],
    },
    codebase: {
      git_repo: 'https://github.com/sei-protocol/sei-chain',
      recommended_version: 'v3.0.9',
      compatible_versions: ['v3.0.9'],
      ibc_go_version: 'v3.1.0',
      cosmos_sdk_version: 'v0.45.10',
      cosmwasm_version: 'v0.27.0',
      cosmwasm_enabled: true,
      cosmwasm_path: '$HOME/.sei/wasm',
      genesis: {
        genesis_url:
          'https://raw.githubusercontent.com/sei-protocol/testnet/main/pacific-1/genesis.json',
      },
      versions: [
        {
          name: '',
          recommended_version: '3.0.8',
          compatible_versions: ['3.0.8'],
          ibc_go_version: 'v3.0.0',
          cosmos_sdk_version: 'v0.45.10',
          cosmwasm_version: 'v0.27.0',
          cosmwasm_enabled: true,
          cosmwasm_path: '$HOME/.sei/wasm',
          next_version_name: 'v3.0.9',
        },
        {
          name: 'v3.0.9',
          recommended_version: 'v3.0.9',
          compatible_versions: ['v3.0.9'],
          proposal: 24,
          height: 25259000,
          ibc_go_version: 'v3.1.0',
          cosmos_sdk_version: 'v0.45.10',
          cosmwasm_version: 'v0.27.0',
          cosmwasm_enabled: true,
          cosmwasm_path: '$HOME/.sei/wasm',
          next_version_name: '',
        },
      ],
    },
    logo_URIs: {
      png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/sei/images/sei.png',
      svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/sei/images/sei.svg',
    },
    peers: {
      seeds: [
        {
          id: '20e1000e88125698264454a884812746c2eb4807',
          address: 'seeds.lavenderfive.com:11956',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          id: '7cbcea0b3041960d1d7b8a6a2eccce0e1f7add50',
          address: 'seeds.whispernode.com:11956',
          provider: 'WhisperNode 🤐',
        },
      ],
      persistent_peers: [
        {
          id: '20e1000e88125698264454a884812746c2eb4807',
          address: 'seeds.lavenderfive.com:11956',
          provider: 'Lavender.Five Nodes 🐝',
        },
      ],
    },
    apis: {
      rpc: [
        {
          address: 'https://sei-rpc.lavenderfive.com:443',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          address: 'https://sei-rpc.polkachu.com/',
          provider: 'polkachu.com',
        },
        {
          address: 'https://sei-rpc.brocha.in/',
          provider: 'Brochain',
        },
        {
          address: 'https://rpc-sei.stingray.plus/',
          provider: 'StingRay',
        },
        {
          address: 'https://rpc-sei.rhinostake.com',
          provider: 'RHINO',
        },
        {
          address: 'https://rpc-sei.whispernode.com:443',
          provider: 'WhisperNode 🤐',
        },
      ],
      rest: [
        {
          address: 'https://sei-api.lavenderfive.com:443',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          address: 'https://sei-api.polkachu.com/',
          provider: 'polkachu.com',
        },
        {
          address: 'https://sei-rest.brocha.in/',
          provider: 'Brochain',
        },
        {
          address: 'https://api-sei.stingray.plus/',
          provider: 'StingRay',
        },
        {
          address: 'https://rest-sei.rhinostake.com',
          provider: 'RHINO',
        },
        {
          address: 'https://lcd-sei.whispernode.com:443',
          provider: 'WhisperNode 🤐',
        },
      ],
      grpc: [
        {
          address: 'https://sei-grpc.lavenderfive.com:443',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          address: 'https://sei-grpc.polkachu.com:11990/',
          provider: 'polkachu.com',
        },
        {
          address: 'https://grpc-sei.whispernode.com:443',
          provider: 'WhisperNode 🤐',
        },
      ],
    },
    explorers: [
      {
        kind: 'ping.pub',
        url: 'https://ping.pub/sei',
        tx_page: 'https://ping.pub/sei/tx/${txHash}',
        account_page: 'https://ping.pub/sei/account/${accountAddress}',
      },
      {
        kind: 'mintscan',
        url: 'https://www.mintscan.io/sei',
        tx_page: 'https://www.mintscan.io/sei/transactions/${txHash}',
        account_page: 'https://www.mintscan.io/sei/accounts/${accountAddress}',
      },
      {
        kind: 'seiscan',
        url: 'https://www.seiscan.app/pacific-1',
        tx_page: 'https://www.seiscan.app/pacific-1/txs/${txHash}',
        account_page:
          'https://www.seiscan.app/pacific-1/accounts/${accountAddress}',
      },
    ],
  },
  {
    $schema: '../chain.schema.json',
    chain_name: 'neutron',
    status: 'live',
    network_type: 'mainnet',
    pretty_name: 'Neutron',
    chain_id: 'neutron-1',
    bech32_prefix: 'neutron',
    daemon_name: 'neutrond',
    node_home: '$HOME/.neutrond',
    key_algos: ['secp256k1'],
    slip44: 118,
    fees: {
      fee_tokens: [
        {
          denom: 'untrn',
          low_gas_price: 0.01,
          average_gas_price: 0.025,
          high_gas_price: 0.05,
        },
      ],
    },
    staking: {
      staking_tokens: [
        {
          denom: 'untrn',
        },
      ],
    },
    codebase: {
      git_repo: 'https://github.com/neutron-org/neutron',
      recommended_version: 'v1.0.4',
      compatible_versions: ['v1.0.3', 'v1.0.4'],
      cosmos_sdk_version: '0.45',
      consensus: {
        type: 'tendermint',
        version: '0.34',
      },
      cosmwasm_version: '0.31',
      cosmwasm_enabled: true,
      ibc_go_version: '4.3.0',
      genesis: {
        genesis_url:
          'https://raw.githubusercontent.com/neutron-org/mainnet-assets/main/neutron-1-genesis.json',
      },
      versions: [
        {
          name: 'v1.0.1',
          recommended_version: 'v1.0.4',
          compatible_versions: ['v1.0.3', 'v1.0.4'],
          cosmos_sdk_version: '0.45',
          consensus: {
            type: 'tendermint',
            version: '0.34',
          },
          cosmwasm_version: '0.31',
          cosmwasm_enabled: true,
          ibc_go_version: '4.3.0',
        },
      ],
    },
    logo_URIs: {
      png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/neutron/images/neutron-black-logo.png',
      svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/neutron/images/neutron-black-logo.svg',
    },
    peers: {
      seeds: [
        {
          id: '24f609fb5946ca3a979f40b7f54132c00104433e',
          address: 'p2p-erheim.neutron-1.neutron.org:26656',
          provider: 'Neutron',
        },
        {
          id: 'b1c6fa570a184c56d0d736d260b8065d887e717c',
          address: 'p2p-kralum.neutron-1.neutron.org:26656',
          provider: 'Neutron',
        },
        {
          id: '20e1000e88125698264454a884812746c2eb4807',
          address: 'seeds.lavenderfive.com:19156',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          id: 'f4422e68f9a678838522d75fa8221985c723294d',
          address: 'seeds.whispernode.com:19156',
          provider: 'WhisperNode🤐',
        },
        {
          id: 'e1b058e5cfa2b836ddaa496b10911da62dcf182e',
          address: 'neutron-seed-de.allnodes.me:26656',
          provider: 'Allnodes.com ⚡️ Nodes & Staking',
        },
        {
          id: 'e726816f42831689eab9378d5d577f1d06d25716',
          address: 'neutron-seed-us.allnodes.me:26656',
          provider: 'Allnodes.com ⚡️ Nodes & Staking',
        },
      ],
      persistent_peers: [
        {
          id: 'e5d2743d9a3de514e4f7b9461bf3f0c1500c58d9',
          address: 'neutron.peer.stakewith.us:39956',
          provider: 'StakeWithUs',
        },
      ],
    },
    apis: {
      rpc: [
        {
          address: 'https://rpc-kralum.neutron-1.neutron.org',
          provider: 'Neutron',
        },
        {
          address: 'https://rpc.novel.remedy.tm.p2p.org',
          provider: 'P2P',
        },
        {
          address: 'https://neutron-rpc.lavenderfive.com',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          address: 'https://rpc-neutron.whispernode.com',
          provider: 'WhisperNode🤐',
        },
        {
          address: 'https://rpc-neutron.cosmos-spaces.cloud',
          provider: 'Cosmos Spaces',
        },
        {
          address: 'http://posthuman-neutron-rpc.ingress.europlots.com',
          provider: 'POSTHUMAN ꝏ DVS',
        },
        {
          address: 'http://rpc.neutron.nodestake.top',
          provider: 'NodeStake',
        },
        {
          address: 'https://neutron-rpc.publicnode.com',
          provider: 'Allnodes.com ⚡️ Nodes & Staking',
        },
        {
          address: 'https://community.nuxian-node.ch:6797/neutron/trpc',
          provider: 'PRO Delegators',
        },
      ],
      rest: [
        {
          address: 'https://rest-kralum.neutron-1.neutron.org',
          provider: 'Neutron',
        },
        {
          address: 'https://api.novel.remedy.tm.p2p.org',
          provider: 'P2P',
        },
        {
          address: 'https://neutron-api.lavenderfive.com',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          address: 'https://lcd-neutron.whispernode.com',
          provider: 'WhisperNode🤐',
        },
        {
          address: 'https://api-neutron.cosmos-spaces.cloud',
          provider: 'Cosmos Spaces',
        },
        {
          address: 'http://api.neutron.nodestake.top',
          provider: 'NodeStake',
        },
        {
          address: 'https://neutron-rest.publicnode.com',
          provider: 'Allnodes.com ⚡️ Nodes & Staking',
        },
        {
          address: 'https://community.nuxian-node.ch:6797/neutron/crpc',
          provider: 'PRO Delegators',
        },
      ],
      grpc: [
        {
          address: 'grpc-kralum.neutron-1.neutron.org:80',
          provider: 'Neutron',
        },
        {
          address: 'https://grpc.novel.remedy.tm.p2p.org',
          provider: 'P2P',
        },
        {
          address: 'https://grpc-web.novel.remedy.tm.p2p.org',
          provider: 'P2P',
        },
        {
          address: 'neutron-grpc.lavenderfive.com:443',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          address: 'grpc-neutron.whispernode.com:443',
          provider: 'WhisperNode🤐',
        },
        {
          address: 'grpc-neutron.cosmos-spaces.cloud:3090',
          provider: 'Cosmos Spaces',
        },
        {
          address: 'grpc.neutron.nodestake.top:9090',
          provider: 'NodeStake',
        },
        {
          address: 'neutron-grpc.publicnode.com:443',
          provider: 'Allnodes.com ⚡️ Nodes & Staking',
        },
      ],
    },
    explorers: [
      {
        kind: 'Mintscan',
        url: 'https://www.mintscan.io/neutron',
        tx_page: 'https://www.mintscan.io/neutron/transactions/${txHash}',
        account_page:
          'https://www.mintscan.io/neutron/accounts/${accountAddress}',
      },
    ],
  },
  {
    $schema: '../chain.schema.json',
    chain_name: 'osmosis',
    status: 'live',
    network_type: 'mainnet',
    website: 'https://osmosis.zone/',
    update_link:
      'https://raw.githubusercontent.com/osmosis-labs/osmosis/main/chain.schema.json',
    pretty_name: 'Osmosis',
    chain_id: 'osmosis-1',
    bech32_prefix: 'osmo',
    daemon_name: 'osmosisd',
    node_home: '$HOME/.osmosisd',
    key_algos: ['secp256k1'],
    slip44: 118,
    fees: {
      fee_tokens: [
        {
          denom: 'uosmo',
          fixed_min_gas_price: 0.0025,
          low_gas_price: 0.0025,
          average_gas_price: 0.025,
          high_gas_price: 0.04,
        },
      ],
    },
    staking: {
      staking_tokens: [
        {
          denom: 'uosmo',
        },
      ],
      lock_duration: {
        time: '1209600s',
      },
    },
    codebase: {
      git_repo: 'https://github.com/osmosis-labs/osmosis',
      recommended_version: 'v18.0.0',
      compatible_versions: ['v18.0.0'],
      binaries: {
        'linux/arm64':
          'https://github.com/osmosis-labs/osmosis/releases/download/v18.0.0/osmosisd-18.0.0-linux-arm64?checksum=sha256:4331f9a318f6dd2f012c36f6ef19af8378fd1e9bc85c751e3f56f7018176ed58',
        'linux/amd64':
          'https://github.com/osmosis-labs/osmosis/releases/download/v18.0.0/osmosisd-18.0.0-linux-amd64?checksum=sha256:9a98a57946e936e7380ae897a205b4e18a188332e91ca84a1f62c21cbb437845',
      },
      cosmos_sdk_version:
        'osmosis-labs/cosmos-sdk@0.45.0-rc1.0.20230703010110-ed4eb883f2a6',
      consensus: {
        type: 'tendermint',
        version: 'informalsystems/tendermint@0.34.24',
      },
      cosmwasm_version: 'osmosis-labs/wasmd@0.31.0-osmo-v16',
      cosmwasm_enabled: true,
      ibc_go_version: '4.3.1',
      ics_enabled: ['ics20-1'],
      genesis: {
        name: 'v3',
        genesis_url:
          'https://github.com/osmosis-labs/networks/raw/main/osmosis-1/genesis.json',
      },
      versions: [
        {
          name: 'v3',
          tag: 'v3.1.0',
          height: 0,
          binaries: {
            'darwin/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v3.1.0/osmosisd-3.1.0-darwin-amd64?checksum=sha256:a532f25ae754d2573f6a3c91ba59496ddb9f6766ccf6f69f408f6e1597144a74',
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v3.1.0/osmosisd-3.1.0-linux-amd64?checksum=sha256:6a73d75e9c75ea402c13edc8c5c4ed08e26c5d8e517d540a9ca8b7e7afa67f79',
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v3.1.0/osmosisd-3.1.0-linux-arm64?checksum=sha256:893f8a9786ae76d4217260201cd94ab67010f68d98b9676a9b31c0a5e68d1eae',
          },
          next_version_name: 'v4',
        },
        {
          name: 'v4',
          tag: 'v4.2.0',
          height: 1314500,
          binaries: {
            'darwin/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v4.2.0/osmosisd-4.2.0-darwin-amd64?checksum=sha256:eee08350b223dd06a2aa16aab44aa51eb116f6267924ee1e788ca28fb54fe02d',
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v4.2.0/osmosisd-4.2.0-linux-amd64?checksum=sha256:a11c61a737983d176f23ce83fa5ff985000ce8d5107d738ee6fa7d59b8dd3053',
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v4.2.0/osmosisd-4.2.0-linux-arm64?checksum=sha256:41260be15e874fbc6cc49757d9fe3d4e459634729e2b745923e508e9cb26f837',
          },
          next_version_name: 'v5',
        },
        {
          name: 'v5',
          tag: 'v6.4.0',
          height: 2383300,
          binaries: {
            'darwin/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v6.4.0/osmosisd-6.4.0-darwin-amd64?checksum=sha256:735c7828b0bc311381f4c18081fa648f849df03aeccf173425cc52a634e3c7d8',
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v6.4.0/osmosisd-6.4.0-linux-amd64?checksum=sha256:e4017da5d1a0a3b37b4f6936ba7ef16f39972ae25f95feae43e506f14933cf94',
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v6.4.0/osmosisd-6.4.0-linux-arm64?checksum=sha256:a101bb3feb0419293a3ecee17d732a312bf9e864a829905ed509c65b5944040b',
          },
          next_version_name: 'v7',
        },
        {
          name: 'v7',
          tag: 'v8.0.0',
          height: 3401000,
          binaries: {
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v8.0.0/osmosisd-8.0.0-linux-amd64?checksum=sha256:4559ffe7d1e83b1519c2d45a709d35a89b51f8b35f8bba3b58aef92e667e254c',
          },
          next_version_name: 'v9',
        },
        {
          name: 'v9',
          tag: 'v10.1.1',
          height: 4707300,
          binaries: {
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v10.1.1/osmosisd-10.1.1-linux-amd64?checksum=sha256:aeae58f8b0be86d5e6e3aec1a8774eab4947207c88c7d4f309c46da98f6694e8',
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v10.1.1/osmosisd-10.1.1-linux-arm64?checksum=sha256:d2c672ffa9782687f91d8d03bd23fdf8bd2fbe8b79c9cfcf8e9d302a1238a12c',
          },
          next_version_name: 'v11',
        },
        {
          name: 'v11',
          tag: 'v11.0.1',
          height: 5432450,
          binaries: {
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v11.0.1/osmosisd-11.0.1-linux-amd64?checksum=sha256:41b8fd2345a5e5b77ee5ed9b9ec5370d94bd1b1aa0d4ac2ac0ab02ee98ddd0d8',
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v11.0.1/osmosisd-11.0.1-linux-arm64?checksum=sha256:267776170495ecaa831238ea8994f8790a379663c9ae47a2e93e5beceafd8e1d',
          },
          next_version_name: 'v12',
        },
        {
          name: 'v12',
          tag: 'v12.3.0',
          height: 6246000,
          binaries: {
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v12.3.0/osmosisd-12.3.0-linux-amd64?checksum=sha256:958210c919d13c281896fa9773c323c5534f0fa46d74807154f737609a00db70',
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v12.3.0/osmosisd-12.3.0-linux-arm64?checksum=sha256:a931618c8a839c30e5cecfd2a88055cda1d68cc68557fe3303fe14e2de3bef8f',
          },
          next_version_name: 'v13',
        },
        {
          name: 'v13',
          tag: 'v13.1.2',
          height: 7241500,
          binaries: {
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v13.1.2/osmosisd-13.1.2-linux-amd64?checksum=sha256:67ed53046667c72ec6bfe962bcb4d6b122610876b3adf75fb7820ce52c34872d',
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v13.1.2/osmosisd-13.1.2-linux-arm64?checksum=sha256:ad35c2a8d55852fa28187a55bdeb983494c07923f2a8a9f4479fb044d8d62bd9',
          },
          next_version_name: 'v14',
        },
        {
          name: 'v14',
          tag: 'v14.0.1',
          height: 7937500,
          binaries: {
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v14.0.1/osmosisd-14.0.1-linux-amd64?checksum=sha256:2cc4172bcf000f0f06b30b16864d875a8de2ee12df994a593dfd52a506851bce',
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v14.0.1/osmosisd-14.0.1-linux-arm64?checksum=sha256:9a44c17d239c8d9afd19d0ff0bd14ca883fb9e9fbf69aff18c2607ffa6bff378',
          },
          next_version_name: 'v15',
        },
        {
          name: 'v15',
          tag: 'v15.2.0',
          height: 8732500,
          recommended_version: 'v15.2.0',
          compatible_versions: ['v15.2.0', 'v15.1.2', 'v15.0.0'],
          cosmos_sdk_version: '0.46.10',
          consensus: {
            type: 'tendermint',
            version: '0.34.24',
          },
          cosmwasm_version: '0.30',
          cosmwasm_enabled: true,
          ibc_go_version: '4.3.1',
          ics_enabled: ['ics20-1'],
          binaries: {
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v15.2.0/osmosisd-15.2.0-linux-amd64?checksum=sha256:3aab2f2668cb5a713d5770e46a777ef01c433753378702d9ae941aa2d1ee5618',
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v15.2.0/osmosisd-15.2.0-linux-arm64?checksum=sha256:e158d30707a0ea51482237f99676223e81ce5a353966a5c83791d2662a930f35',
          },
          next_version_name: 'v16',
        },
        {
          name: 'v16',
          tag: 'v16.1.1',
          height: 10517000,
          recommended_version: 'v16.1.1',
          compatible_versions: ['v16.1.0', 'v16.1.1'],
          cosmos_sdk_version:
            'osmosis-labs/cosmos-sdk@0.45.0-rc1.0.20230703010110-ed4eb883f2a6',
          consensus: {
            type: 'tendermint',
            version: 'informalsystems/tendermint@0.34.24',
          },
          cosmwasm_version: 'osmosis-labs/wasmd@0.31.0-osmo-v16',
          cosmwasm_enabled: true,
          ibc_go_version: '4.3.1',
          ics_enabled: ['ics20-1'],
          binaries: {
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v16.1.1/osmosisd-16.1.1-linux-arm64?checksum=sha256:b96ff1f4c9b4abecb1b38998b1a1f891cfed2cc8078ab64914b151183c0c199b',
            'darwin/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v16.1.1/osmosisd-16.1.1-darwin-arm64?checksum=sha256:c743da4d3632a2bc3ea0ce784bbd13383492a4a34d53295eb2c96987bacf8e8c',
            'darwin/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v16.1.1/osmosisd-16.1.1-darwin-amd64?checksum=sha256:d856ebda9c31f052d10a78443967a93374f2033292f0afdb6434b82b4ed79790',
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v16.1.1/osmosisd-16.1.1-linux-amd64?checksum=sha256:f838618633c1d42f593dc33d26b25842f5900961e987fc08570bb81a062e311d',
          },
          next_version_name: 'v17',
        },
        {
          name: 'v17',
          tag: 'v17.0.0',
          height: 11126100,
          recommended_version: 'v17.0.0',
          compatible_versions: ['v17.0.0'],
          cosmos_sdk_version:
            'osmosis-labs/cosmos-sdk@v0.45.0-rc1.0.20230703010110-ed4eb883f2a6',
          consensus: {
            type: 'tendermint',
            version: 'informalsystems/tendermint@0.34.24',
          },
          cosmwasm_version: 'osmosis-labs/wasmd@0.31.0-osmo-v16',
          cosmwasm_enabled: true,
          ibc_go_version: '4.3.1',
          ics_enabled: ['ics20-1'],
          binaries: {
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v17.0.0/osmosisd-17.0.0-linux-arm64?checksum=sha256:d5eeab6a15e2acd7e24e7caf4fe3336c35367ff376da6299d404defd09ce52f9',
            'darwin/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v17.0.0/osmosisd-17.0.0-darwin-arm64?checksum=sha256:5ca1b120a62ba473e7772682d89db949ae67aa10dc9bf4629b0022a95e7ff1df',
            'darwin/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v17.0.0/osmosisd-17.0.0-darwin-amd64?checksum=sha256:b5e4deb0d659eeeaee791dab765433bdb8d6a7e37d909628e0f9becb7d1f154b',
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v17.0.0/osmosisd-17.0.0-linux-amd64?checksum=sha256:d7fe62ae33cf2f0b48a17eb8b02644dadd9924f15861ed622cd90cb1a038135b',
          },
          next_version_name: 'v18',
        },
        {
          name: 'v18',
          tag: 'v18.0.0',
          height: 11155350,
          recommended_version: 'v18.0.0',
          compatible_versions: ['v18.0.0'],
          cosmos_sdk_version:
            'osmosis-labs/cosmos-sdk@v0.45.0-rc1.0.20230703010110-ed4eb883f2a6',
          consensus: {
            type: 'tendermint',
            version: 'informalsystems/tendermint@0.34.24',
          },
          cosmwasm_version: 'osmosis-labs/wasmd@0.31.0-osmo-v16',
          cosmwasm_enabled: true,
          ibc_go_version: '4.3.1',
          ics_enabled: ['ics20-1'],
          binaries: {
            'linux/arm64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v18.0.0/osmosisd-18.0.0-linux-arm64?checksum=sha256:4331f9a318f6dd2f012c36f6ef19af8378fd1e9bc85c751e3f56f7018176ed58',
            'linux/amd64':
              'https://github.com/osmosis-labs/osmosis/releases/download/v18.0.0/osmosisd-18.0.0-linux-amd64?checksum=sha256:9a98a57946e936e7380ae897a205b4e18a188332e91ca84a1f62c21cbb437845',
          },
        },
      ],
    },
    images: [
      {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmosis-chain-logo.png',
        theme: {
          primary_color_hex: '#231D4B',
        },
      },
    ],
    logo_URIs: {
      png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmosis-chain-logo.png',
      svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.svg',
    },
    peers: {
      seeds: [
        {
          id: 'f515a8599b40f0e84dfad935ba414674ab11a668',
          address: 'osmosis.blockpane.com:26656',
          provider: 'blockpane',
        },
        {
          id: 'ade4d8bc8cbe014af6ebdf3cb7b1e9ad36f412c0',
          address: 'seeds.polkachu.com:12556',
          provider: 'Polkachu',
        },
        {
          id: '20e1000e88125698264454a884812746c2eb4807',
          address: 'seeds.lavenderfive.com:12556',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          id: 'ebc272824924ea1a27ea3183dd0b9ba713494f83',
          address: 'osmosis-mainnet-seed.autostake.com:26716',
          provider: 'AutoStake 🛡️ Slash Protected',
        },
        {
          id: '3cc024d1c760c9cd96e6413abaf3b36a8bdca58e',
          address: 'seeds.goldenratiostaking.net:1630',
          provider: 'Golden Ratio Staking',
        },
        {
          id: 'e891d42c31064fb7e0d99839536164473c4905c2',
          address: 'seed-osmosis.freshstaking.com:31656',
          provider: 'FreshSTAKING',
        },
        {
          id: 'bd7064a50f5843e2c84c71c4dc18ac07424bdcc1',
          address: 'seeds.whispernode.com:12556',
          provider: 'WhisperNode🤐',
        },
        {
          id: '400f3d9e30b69e78a7fb891f60d76fa3c73f0ecc',
          address: 'osmosis.rpc.kjnodes.com:11259',
          provider: 'kjnodes',
        },
        {
          id: '38ab18cb2ea1dfeb6232b429e1508f56b6ae5031',
          address: 'seed-osmosis-01.stakeflow.io:65535',
          provider: 'Stakeflow',
        },
        {
          id: '954ab3a0551b592b654b1554af8fc8746ed7b362',
          address: 'seed-node.mms.team:31656',
          provider: 'MMS',
        },
        {
          id: 'e1b058e5cfa2b836ddaa496b10911da62dcf182e',
          address: 'osmosis-seed-de.allnodes.me:26656',
          provider: 'Allnodes.com ⚡️ Nodes & Staking',
        },
        {
          id: 'e726816f42831689eab9378d5d577f1d06d25716',
          address: 'osmosis-seed-us.allnodes.me:26656',
          provider: 'Allnodes.com ⚡️ Nodes & Staking',
        },
      ],
      persistent_peers: [
        {
          id: '4d9ac3510d9f5cfc975a28eb2a7b8da866f7bc47',
          address: '37.187.38.191:26656',
          provider: 'stakelab',
        },
        {
          id: '2f9c16151400d8516b0f58c030b3595be20b804c',
          address: '37.120.245.167:26656',
          provider: 'syncnode',
        },
        {
          id: 'ebc272824924ea1a27ea3183dd0b9ba713494f83',
          address: 'osmosis-mainnet-peer.autostake.com:26716',
          provider: 'AutoStake 🛡️ Slash Protected',
        },
        {
          id: 'e891d42c31064fb7e0d99839536164473c4905c2',
          address: 'seed-osmosis.freshstaking.com:31656',
          provider: 'FreshSTAKING',
        },
        {
          id: '38ab18cb2ea1dfeb6232b429e1508f56b6ae5031',
          address: 'peer-osmosis-01.stakeflow.io:65535',
          provider: 'Stakeflow',
        },
        {
          id: '6f1d92857e39a6f26a3a914f807064824c255939',
          address: '65.21.91.99:16956',
          provider: 'Staketab',
        },
        {
          id: '50d0865decf5657eaf8e50e51bd9d8ce5f927f6c',
          address: 'peer-osmosis.mms.team:56102',
          provider: 'MMS',
        },
        {
          id: '8baba02f26fd28660699d40d6fa68f9509099029',
          address: '95.216.42.88:41656',
          provider: 'StakeTown',
        },
      ],
    },
    apis: {
      rpc: [
        {
          address: 'https://rpc.osmosis.zone/',
          provider: 'Osmosis Foundation',
        },
        {
          address: 'https://rpc-osmosis.blockapsis.com',
          provider: 'chainapsis',
        },
        {
          address: 'https://osmosis-rpc.onivalidator.com',
          provider: 'Oni Validator ⛩️',
        },
        {
          address: 'https://osmosis-rpc.quickapi.com:443',
          provider: 'Chainlayer',
        },
        {
          address: 'https://rpc-osmosis.whispernode.com:443',
          provider: 'WhisperNode 🤐',
        },
        {
          address: 'https://osmosis-rpc.lavenderfive.com:443',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          address: 'https://rpc-osmosis.ecostake.com',
          provider: 'ecostake',
        },
        {
          address: 'https://rpc-osmosis.cosmos-spaces.cloud',
          provider: 'Cosmos Spaces',
        },
        {
          address: 'https://osmosis-rpc.polkachu.com',
          provider: 'Polkachu',
        },
        {
          address: 'https://rpc-osmosis-ia.cosmosia.notional.ventures',
          provider: 'Notional',
        },
        {
          address: 'https://rpc.osmosis.interbloc.org',
          provider: 'Interbloc',
        },
        {
          address: 'https://osmosis.rpc.stakin-nodes.com',
          provider: 'Stakin',
        },
        {
          address: 'https://rpc.osl.zone',
          provider: 'Osmosis Support Lab',
        },
        {
          address: 'https://osmosis-mainnet-rpc.autostake.com:443',
          provider: 'AutoStake 🛡️ Slash Protected',
        },
        {
          address: 'https://osmosis.rpc.interchain.ivaldilabs.xyz',
          provider: 'ivaldilabs',
        },
        {
          address: 'https://osmosis.api.onfinality.io/public',
          provider: 'OnFinality',
        },
        {
          address: 'https://osmosis.rpc.kjnodes.com',
          provider: 'kjnodes',
        },
        {
          address: 'https://rpc-osmosis-01.stakeflow.io',
          provider: 'Stakeflow',
        },
        {
          address: 'https://osmosis-rpc.staketab.org:443',
          provider: 'Staketab',
        },
        {
          address: 'https://osmosis-rpc.w3coins.io',
          provider: 'w3coins',
        },
        {
          address: 'https://rpc-osmosis.mms.team',
          provider: 'MMS',
        },
        {
          address: 'https://osmosis-rpc.publicnode.com',
          provider: 'Allnodes.com ⚡️ Nodes & Staking',
        },
        {
          address: 'https://community.nuxian-node.ch:6797/osmosis/trpc',
          provider: 'PRO Delegators',
        },
        {
          address: 'http://rpc-osmosis.freshstaking.com:31657',
          provider: 'FreshSTAKING',
        },
        {
          address: 'https://osmosis-rpc.stake-town.com:443',
          provider: 'StakeTown',
        },
      ],
      rest: [
        {
          address: 'https://lcd.osmosis.zone/',
          provider: 'Osmosis Foundation',
        },
        {
          address: 'https://osmosis-lcd.quickapi.com:443',
          provider: 'Chainlayer',
        },
        {
          address: 'https://lcd-osmosis.blockapsis.com',
          provider: 'chainapsis',
        },
        {
          address: 'https://osmosis-api.lavenderfive.com:443',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          address: 'https://rest-osmosis.ecostake.com',
          provider: 'ecostake',
        },
        {
          address: 'https://api-osmosis-ia.cosmosia.notional.ventures',
          provider: 'Notional',
        },
        {
          address: 'https://api.osmosis.interbloc.org',
          provider: 'Interbloc',
        },
        {
          address: 'https://api-osmosis.cosmos-spaces.cloud',
          provider: 'Cosmos Spaces',
        },
        {
          address: 'https://osmosis-api.polkachu.com',
          provider: 'Polkachu',
        },
        {
          address: 'https://osmosis.rest.stakin-nodes.com',
          provider: 'Stakin',
        },
        {
          address: 'https://api.osl.zone',
          provider: 'Osmosis Support Lab',
        },
        {
          address: 'https://osmosis-mainnet-lcd.autostake.com:443',
          provider: 'AutoStake 🛡️ Slash Protected',
        },
        {
          address: 'https://osmosis.rest.interchain.ivaldilabs.xyz',
          provider: 'ivaldilabs',
        },
        {
          address: 'https://osmosis.api.kjnodes.com',
          provider: 'kjnodes',
        },
        {
          address: 'https://api-osmosis-01.stakeflow.io',
          provider: 'Stakeflow',
        },
        {
          address: 'https://osmosis-rest.staketab.org',
          provider: 'Staketab',
        },
        {
          address: 'https://osmosis-api.w3coins.io',
          provider: 'w3coins',
        },
        {
          address: 'https://lcd-osmosis.whispernode.com:443',
          provider: 'WhisperNode🤐',
        },
        {
          address: 'https://api-osmosis.mms.team',
          provider: 'MMS',
        },
        {
          address: 'https://osmosis-rest.publicnode.com',
          provider: 'Allnodes.com ⚡️ Nodes & Staking',
        },
        {
          address: 'https://community.nuxian-node.ch:6797/osmosis/crpc',
          provider: 'PRO Delegators',
        },
        {
          address: 'https://osmosis-api.stake-town.com:443',
          provider: 'StakeTown',
        },
        {
          address: 'https://osmosis.stakesystems.io/',
          provider: 'stakesystems',
        },
      ],
      grpc: [
        {
          address: 'osmosis-grpc.lavenderfive.com:443',
          provider: 'Lavender.Five Nodes 🐝',
        },
        {
          address: 'grpc-osmosis-ia.cosmosia.notional.ventures:443',
          provider: 'Notional',
        },
        {
          address: 'osmosis.grpc.stakin-nodes.com:443',
          provider: 'Stakin',
        },
        {
          address: 'osmosis-mainnet-grpc.autostake.com:443',
          provider: 'AutoStake 🛡️ Slash Protected',
        },
        {
          address: 'grpc-osmosis.cosmos-spaces.cloud:1130',
          provider: 'Cosmos Spaces',
        },
        {
          address: 'osmosis.grpc.interchain.ivaldilabs.xyz:433',
          provider: 'ivaldilabs',
        },
        {
          address: 'osmosis.grpc.kjnodes.com:11290',
          provider: 'kjnodes',
        },
        {
          address: 'grpc-osmosis-01.stakeflow.io:6754',
          provider: 'Stakeflow',
        },
        {
          address: 'services.staketab.com:9010',
          provider: 'Staketab',
        },
        {
          address: 'osmosis-grpc.w3coins.io:12590',
          provider: 'w3coins',
        },
        {
          address: 'grpc-osmosis.mms.team:443',
          provider: 'MMS',
        },
        {
          address: 'osmosis-grpc.publicnode.com:443',
          provider: 'Allnodes.com ⚡️ Nodes & Staking',
        },
        {
          address: 'osmosis-grpc.stake-town.com:443',
          provider: 'StakeTown',
        },
      ],
    },
    explorers: [
      {
        kind: 'EZ Staking',
        url: 'https://app.ezstaking.io/osmosis',
        tx_page: 'https://app.ezstaking.io/osmosis/txs/${txHash}',
        account_page:
          'https://app.ezstaking.io/osmosis/account/${accountAddress}',
      },
      {
        kind: 'mintscan',
        url: 'https://www.mintscan.io/osmosis',
        tx_page: 'https://www.mintscan.io/osmosis/transactions/${txHash}',
        account_page:
          'https://www.mintscan.io/osmosis/accounts/${accountAddress}',
      },
      {
        kind: 'ping.pub',
        url: 'https://ping.pub/osmosis',
        tx_page: 'https://ping.pub/osmosis/tx/${txHash}',
      },
      {
        kind: 'explorers.guru',
        url: 'https://osmosis.explorers.guru',
        tx_page: 'https://osmosis.explorers.guru/transaction/${txHash}',
        account_page:
          'https://osmosis.explorers.guru/account/${accountAddress}',
      },
      {
        kind: 'atomscan',
        url: 'https://atomscan.com/osmosis',
        tx_page: 'https://atomscan.com/osmosis/transactions/${txHash}',
        account_page: 'https://atomscan.com/osmosis/accounts/${accountAddress}',
      },
      {
        kind: 'bigdipper',
        url: 'https://bigdipper.live/osmosis',
        tx_page: 'https://bigdipper.live/osmosis/transactions/${txHash}',
        account_page:
          'https://bigdipper.live/osmosis/accounts/${accountAddress}',
      },
      {
        kind: 'TC Network',
        url: 'https://explorer.tcnetwork.io/osmosis',
        tx_page: 'https://explorer.tcnetwork.io/osmosis/transaction/${txHash}',
        account_page:
          'https://explorer.tcnetwork.io/osmosis/account/${accountAddress}',
      },
      {
        kind: 'Stakeflow',
        url: 'https://stakeflow.io/osmosis',
        account_page: 'https://stakeflow.io/osmosis/accounts/${accountAddress}',
      },
    ],
    keywords: ['dex'],
  },
]
