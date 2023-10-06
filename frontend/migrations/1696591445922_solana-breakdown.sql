-- Up Migration
CREATE TYPE source as ENUM ('nft','defi');

-- Table for solana breakdown
-- This table only exists to be displayed in the frontend, it has no corresponding on-chain data.
CREATE TABLE "solana_breakdowns" (
    source source NOT NULL,
    -- Solana public key
    identity TEXT NOT NULL,
    -- Amount in lamports (minimum denomination of SPL tokens)
    amount BIGINT NOT NULL,
    PRIMARY KEY (source, identity)
);
-- Down Migration
DROP TABLE "solana_breakdowns";
DROP TYPE source;
