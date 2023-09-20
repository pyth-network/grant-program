-- Up Migration
-- TODO: add more chains
CREATE TYPE evm_chain as ENUM ('optimism-mainnet', 'arbitrum-mainnet', 'cronos-mainnet',
       'zksync-mainnet', 'bsc-mainnet', 'base-mainnet', 'evmos-mainnet',
       'mantle-mainnet', 'linea-mainnet', 'polygon-zkevm-mainnet',
       'avalanche-mainnet', 'matic-mainnet', 'aurora-mainnet',
       'eth-mainnet', 'confluxespace-mainnet', 'celo-mainnet',
       'meter-mainnet', 'gnosis-mainnet', 'kcc-mainnet', 'wemix-mainnet');

-- Table for evm chain breakdowns
-- This table only exists to be displayed in the frontend, it has no corresponding on-chain data.
CREATE TABLE "evm_breakdowns" (
    chain evm_chain NOT NULL,
    -- Evm public key
    identity TEXT NOT NULL,
    -- Amount in lamports (minimum denomination of SPL tokens)
    amount BIGINT NOT NULL,
    PRIMARY KEY (chain, identity)
);
-- Down Migration
DROP TABLE "evm_breakdowns";
DROP TYPE evm_chain;
