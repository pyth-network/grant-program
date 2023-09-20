-- Up Migration
-- TODO: add more chains
CREATE TYPE evm_chain as ENUM ('optimism', 'ethereum', 'arbitrum');

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
